// src/lib/rate-limit.ts
import { redis } from './redis';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
  limit: number;
}

/**
 * Redis-backed rate limiter using the sliding window counter algorithm.
 * 
 * Why this algorithm? It's more accurate than fixed windows and prevents
 * the "boundary burst" problem where attackers send max requests at the
 * end of one window and start of the next.
 * 
 * @param key - Unique identifier (e.g., "register:192.168.1.1" or "verify-otp:user@email.com")
 * @param maxAttempts - Maximum attempts allowed in the window
 * @param windowMs - Time window in milliseconds
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redisKey = `ratelimit:${key}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Use a Redis transaction (pipeline) for atomicity
    const pipeline = redis.pipeline();

    // Remove entries older than the window
    pipeline.zremrangebyscore(redisKey, 0, windowStart);

    // Count current entries in the window
    pipeline.zcard(redisKey);

    // Add the current request (only if we haven't exceeded the limit)
    // We use the timestamp as both score and member to ensure uniqueness
    pipeline.zadd(redisKey, { score: now, member: `${now}-${Math.random()}` });

    // Set expiry on the key itself (cleanup if no requests come in)
    pipeline.expire(redisKey, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();

    // results[0] = zremrangebyscore result
    // results[1] = zcard result (current count BEFORE adding new request)
    // results[2] = zadd result
    // results[3] = expire result

    const currentCount = results[1] as number;

    // If we've exceeded the limit, remove the entry we just added
    if (currentCount >= maxAttempts) {
      // Remove the entry we just added (the last one)
      await redis.zremrangebyscore(redisKey, now, now);

      // Calculate retry-after time (when the oldest entry in the window will expire)
      const oldestEntry = await redis.zrange(redisKey, 0, 0, { withScores: true });
      let retryAfter = Math.ceil(windowMs / 1000);

      if (oldestEntry && oldestEntry.length > 0) {
        const oldestScore = oldestEntry[1] as number;
        retryAfter = Math.ceil((oldestScore + windowMs - now) / 1000);
      }

      return {
        allowed: false,
        remaining: 0,
        retryAfter,
        limit: maxAttempts,
      };
    }

    return {
      allowed: true,
      remaining: maxAttempts - currentCount - 1,
      limit: maxAttempts,
    };
  } catch (error) {
    // CRITICAL: If Redis is down, fail OPEN (allow the request)
    // This is a security tradeoff: we prefer availability over strict rate limiting
    // In a real production system, you'd alert on this and have fallback logic
    console.error('Rate limiter failed, failing open:', error);
    return {
      allowed: true,
      remaining: maxAttempts,
      limit: maxAttempts,
    };
  }
}

/**
 * Resets rate limit for a specific key (used after successful verification).
 * This is important: once a user successfully verifies their email,
 * we should clear their failed attempt counter.
 */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    await redis.del(`ratelimit:${key}`);
  } catch (error) {
    console.error('Failed to reset rate limit:', error);
    // Don't throw - this is a non-critical operation
  }
}

/**
 * Gets the current rate limit status without incrementing.
 * Useful for showing users "X attempts remaining" in the UI.
 */
export async function getRateLimitStatus(
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<{ remaining: number; resetIn: number }> {
  const redisKey = `ratelimit:${key}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Clean up old entries and count current ones
    await redis.zremrangebyscore(redisKey, 0, windowStart);
    const currentCount = await redis.zcard(redisKey);

    // Get the oldest entry to calculate reset time
    const oldestEntry = await redis.zrange(redisKey, 0, 0, { withScores: true });
    let resetIn = 0;

    if (oldestEntry && oldestEntry.length > 0) {
      const oldestScore = oldestEntry[1] as number;
      resetIn = Math.max(0, Math.ceil((oldestScore + windowMs - now) / 1000));
    }

    return {
      remaining: Math.max(0, maxAttempts - currentCount),
      resetIn,
    };
  } catch (error) {
    console.error('Failed to get rate limit status:', error);
    return {
      remaining: maxAttempts,
      resetIn: 0,
    };
  }
}