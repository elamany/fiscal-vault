'use client';

import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { LayoutDashboard, Sparkles } from 'lucide-react';

interface StoreOwnerBannerProps {
  storeId: string;
}

export default function StoreOwnerBanner({ storeId }: StoreOwnerBannerProps) {
  const { user } = useAuth();
  // Check if the user is a business owner AND this is their store
  if (user?.role === 'BUSINESS_OWNER' && user.tenantId === storeId) {
    return (
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-800 text-sm font-semibold rounded-lg border border-green-200">
          <Sparkles className="h-4 w-4 text-green-600" />
          This is your store
        </div>
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <LayoutDashboard className="h-4 w-4" />
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return null;
}