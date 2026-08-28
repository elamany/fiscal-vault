import { cookies } from 'next/headers';

const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

const SECURE_COOKIE_OPTIONS = {
  httpOnly: true, 
  secure: process.env.NODE_ENV === 'production', 
  sameSite: 'strict' as const, 
  path: '/', 
};

/**
 * Sets both access and refresh tokens in secure HttpOnly cookies.
 */
export async function setAuthCookies(accessToken: string, refreshToken: string): Promise<void> {
  const cookieStore = await cookies();
  
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...SECURE_COOKIE_OPTIONS,
    maxAge: 60 * 15, // 15 minutes in seconds
  });

  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...SECURE_COOKIE_OPTIONS,
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  });
}

/**
 * Clears both auth cookies (used for logout).
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  
  cookieStore.set(ACCESS_TOKEN_COOKIE, '', {
    ...SECURE_COOKIE_OPTIONS,
    maxAge: 0, // Expire immediately
  });

  cookieStore.set(REFRESH_TOKEN_COOKIE, '', {
    ...SECURE_COOKIE_OPTIONS,
    maxAge: 0,
  });
}

/**
 * Retrieves the access token from cookies.
 */
export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
}

/**
 * Retrieves the refresh token from cookies.
 */
export async function getRefreshToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
}