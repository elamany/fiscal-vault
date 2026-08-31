// src/contexts/auth-context.tsx
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

import type { User, AuthContextType } from '@/types/auth_types';
import { API_PATHS } from '@/constants/api_paths';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        // add credentials: 'include' to ensure cookies are sent
        const response = await fetch(API_PATHS.auth.me, {
          credentials: 'include',
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        if (!cancelled) {
          setUser(data.user);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshUser = async () => {
    try {
      const response = await fetch(API_PATHS.auth.me, {
        credentials: 'include', 
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    const response = await fetch(API_PATHS.auth.login, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', 
      body: JSON.stringify({ email, password, rememberMe }), 
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    setUser(data.user);
  };

  const signup = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: 'CUSTOMER' | 'BUSINESS_OWNER',
    tenantName?: string,
    tenantSlug?: string
  ) => {
    const response = await fetch(API_PATHS.auth.signup, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', 
      body: JSON.stringify({ email, password, firstName, lastName, role, tenantName, tenantSlug }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Signup failed');
    }

    const data = await response.json();
    // Optional: setUser(data.user) if your signup API returns the user immediately
  };

  const logout = async () => {
    await fetch(API_PATHS.auth.logout, { 
      method: 'POST',
      credentials: 'include', 
    });
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}