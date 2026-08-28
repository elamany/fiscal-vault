import { Redis } from '@upstash/redis';

/**
 * Redis Client Singleton
 * 
 * Why a singleton? Like Prisma, we want to reuse the same connection
 * across requests to avoid exhausting connection limits.
 * 
 * Upstash uses HTTP under the hood, so this is lightweight and
 * serverless-friendly (no persistent TCP connections needed).
 */
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    // Automatic retry on transient failures
    retry: {
      retries: 3,
      backoff: (retryCount) => Math.exp(retryCount) * 50,
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}