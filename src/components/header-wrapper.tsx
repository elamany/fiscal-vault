'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/header';

export default function HeaderWrapper() {
  const pathname = usePathname();
  
  // Hide header on all /auth routes
  if (pathname?.startsWith('/auth')) {
    return null;
  }

  return <Header />;
}