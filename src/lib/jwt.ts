import { SignJWT, jwtVerify } from 'jose';

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
 * This token is used to authenticate API requests.
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
 * This token is used to get a new access token when the old one expires.
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
 * Throws an error if the token is invalid or expired.
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, ACCESS_TOKEN_SECRET);
  return payload as unknown as JWTPayload;
}

/**
 * Verifies and decodes a refresh token.
 * Throws an error if the token is invalid or expired.
 */
export async function verifyRefreshToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, REFRESH_TOKEN_SECRET);
  return payload as unknown as JWTPayload;
}