// src/hooks/use-auth-redirects.ts
'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Hook for PROTECTED pages (e.g., Dashboard, Profile)
 * Redirects to login if the user is NOT authenticated.
 */
export function useRequireAuth(redirectUrl = '/login') {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      router.push(`${redirectUrl}?redirect=${encodeURIComponent(currentPath)}`);
    }
  }, [user, loading, router, redirectUrl]);

  return { user, loading };
}

/**
 * Hook for PUBLIC/AUTH pages (e.g., Login, Signup, Forgot Password)
 * Redirects to dashboard/home if the user IS already authenticated.
 */
export function useRedirectIfAuth(redirectUrl = '/dashboard') {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push(redirectUrl);
    }
  }, [user, loading, router, redirectUrl]);

  return { user, loading };
}