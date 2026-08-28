// src/lib/auth.ts
import { prisma } from './db';
import { verifyAccessToken } from './jwt';
import { getAccessToken } from './cookies';
import type { JWTPayload } from './jwt';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'BUSINESS_OWNER';
  tenantId: string | null;
  isEmailVerified: boolean;
}

export interface BusinessOwner extends Omit<AuthenticatedUser, 'role' | 'tenantId'> {
  role: 'BUSINESS_OWNER';
  tenantId: string; 
}
/**
 * Extracts and verifies the current user from the access token cookie.
 * Returns null if not authenticated.
 * 
 * This is the SINGLE source of truth for authentication across the app.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return null;
    }

    // Verify the token signature and expiry
    const payload: JWTPayload = await verifyAccessToken(accessToken);

    // Fetch the user from the database to ensure they still exist
    // and haven't been deleted/banned
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        tenantId: true,
        isEmailVerified: true,
      },
    });

    if (!user) {
      return null;
    }

    // Verify the tenantId in the token matches the database
    // (prevents privilege escalation if user's role was changed)
    if (user.tenantId !== payload.tenantId || user.role !== payload.role) {
      return null;
    }

    return user;
  } catch (error) {
    // Token is invalid, expired, or tampered with
    return null;
  }
}

/**
 * Requires authentication. Throws a Response if not authenticated.
 * Use this in API routes that MUST have a logged-in user.
 * 
 * Example:
 *   const user = await requireAuth();
 *   // If we get here, user is definitely authenticated
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!user.isEmailVerified) {
    throw new Response(
      JSON.stringify({ error: 'Email not verified' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return user;
}

/**
 * Requires the user to be a BUSINESS_OWNER.
 * Throws a Response if not authorized.
 */
export async function requireBusinessOwner(): Promise<BusinessOwner> {
  const user = await requireAuth();
  
  if (user.role !== 'BUSINESS_OWNER' || !user.tenantId) {
    throw new Response(
      JSON.stringify({ error: 'Forbidden: Business owner access required' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return user as BusinessOwner;
}