'use client';

import { ReactNode } from 'react';
import { useSyncCartOnLogin } from '@/hooks/use-cart';

export default function CartSyncProvider({ children }: { children: ReactNode }) {

  useSyncCartOnLogin();
  
  return <>{children}</>;
}