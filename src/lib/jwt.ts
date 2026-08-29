// src/lib/jwt.ts
import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload as JosePayload } from 'jose'; // ✅ Import jose's type with alias

const ACCESS_TOKEN_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || 'fallback-access-secret'
);
const REFRESH_TOKEN_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret'
);

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface JWTPayload {
  userId: string;
  tenantId: string | null;
  role: 'CUSTOMER' | 'BUSINESS_OWNER';
}

/**
 * Generates a short-lived access token.
 */
export async function generateAccessToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(ACCESS_TOKEN_SECRET);
}

/**
 * Generates a long-lived refresh token.
 */
export async function generateRefreshToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(REFRESH_TOKEN_SECRET);
}

/**
 * Verifies and decodes an access token.
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, ACCESS_TOKEN_SECRET);
  return payload as unknown as JWTPayload;
}

/**
 * Verifies and decodes a refresh token.
 */
export async function verifyRefreshToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, REFRESH_TOKEN_SECRET);
  return payload as unknown as JWTPayload;
}

// GENERIC TOKEN HELPERS (Password Reset, Email Verification, etc.)

/**
 * Sign a generic, short-lived token for one-time operations.
 * Used for password reset, email verification, etc.
 */
export async function signGenericToken(
  payload: Record<string, unknown>,
  expiresIn: string | number = '10m'
): Promise<string> {
  // ✅ Uses jose's JWTPayload type (aliased as JosePayload) - no 'any'
  return new SignJWT(payload as JosePayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(ACCESS_TOKEN_SECRET);
}

/**
 * Verify a generic token.
 * Returns the decoded payload or null if invalid/expired.
 */
export async function verifyGenericToken<T extends Record<string, unknown>>(
  token: string
): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_TOKEN_SECRET);
    return payload as unknown as T;
  } catch {
    return null;
  }
}