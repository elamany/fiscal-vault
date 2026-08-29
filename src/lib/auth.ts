// src/lib/auth.ts
import { prisma } from './db';
import { verifyAccessToken } from './jwt';
import { getAccessToken } from './cookies';
import type { JWTPayload } from './jwt';
import { AuthenticatedUser, UserRole } from '@/types/auth_types';
import { NextResponse } from 'next/server';

export interface BusinessOwner extends Omit<AuthenticatedUser, 'role' | 'tenantId'> {
  role: 'BUSINESS_OWNER';
  tenantId: string; 
}

// ==========================================
// 1. CORE AUTHENTICATION
// ==========================================

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return null;
    }

    const payload: JWTPayload = await verifyAccessToken(accessToken);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        firstName: true,   // ✅ Matches AuthenticatedUser
        lastName: true,    // ✅ Matches AuthenticatedUser
        role: true,
        tenantId: true,
        isEmailVerified: true,
      },
    });

    if (!user) {
      return null;
    }

    if (user.tenantId !== payload.tenantId || user.role !== payload.role) {
      return null;
    }

    return user;
  } catch (error) {
    return null;
  }
}

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

// ==========================================
// 2. ADDITIONAL HELPERS
// ==========================================

export async function getOptionalUser(): Promise<AuthenticatedUser | null> {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

export async function requireRole(allowedRoles: UserRole[]): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  
  if (!allowedRoles.includes(user.role)) {
    throw new Response(
      JSON.stringify({ error: `Forbidden: Requires one of roles: ${allowedRoles.join(', ')}` }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return user;
}

// ==========================================
// 3. COOKIE HELPERS
// ==========================================

export function setAuthCookies(response: NextResponse, accessToken: string, refreshToken?: string): void {
  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60,
  });

  if (refreshToken) {
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });
  }
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set('access_token', '', { maxAge: 0, path: '/' });
  response.cookies.set('refresh_token', '', { maxAge: 0, path: '/' });
}