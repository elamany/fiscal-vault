// src/app/profile/page.tsx
'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Loader2, User, Mail, Shield, Store, LayoutDashboard, 
  LogOut, Package, ArrowRight 
} from 'lucide-react';

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    router.push('/');
  };

  const userInitial = (user.firstName || user.email).charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl shrink-0">
                {userInitial}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-gray-500 flex items-center gap-1.5 mt-1 text-sm">
                  <Mail className="h-4 w-4" /> {user.email}
                </p>
                <span className={`inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  user.role === 'BUSINESS_OWNER' 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  <Shield className="h-3 w-3" />
                  {user.role === 'BUSINESS_OWNER' ? 'Business Owner' : 'Customer'}
                </span>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors disabled:opacity-50 shrink-0"
            >
              {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Logout
            </button>
          </div>
        </div>

        {/* Role-Specific Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {user.role === 'BUSINESS_OWNER' ? (
            <>
              <Link href="/dashboard" className="group bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all">
                <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <LayoutDashboard className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Business Dashboard</h3>
                <p className="text-gray-600 text-sm mb-4">Manage your products, orders, inventory, and store settings.</p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 group-hover:gap-2 transition-all">
                  Go to Dashboard <ArrowRight className="h-4 w-4" />
                </span>
              </Link>

              {user.tenantId && (
                <Link href="/store" className="group bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md hover:border-green-300 transition-all">
                  <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Store className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Storefront</h3>
                  <p className="text-gray-600 text-sm mb-4">View your public store exactly as your customers see it.</p>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-600 group-hover:gap-2 transition-all">
                    View Public Store <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              )}
            </>
          ) : (
            <>
              <Link href="/orders" className="group bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md hover:border-purple-300 transition-all">
                <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Package className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">My Orders</h3>
                <p className="text-gray-600 text-sm mb-4">Track your recent purchases, view receipts, and check delivery status.</p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-purple-600 group-hover:gap-2 transition-all">
                  View Order History <ArrowRight className="h-4 w-4" />
                </span>
              </Link>

             <Link href="/profile/edit" className="group bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md hover:border-amber-300 transition-all">
                <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Shield className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Account Security</h3>
                <p className="text-gray-600 text-sm mb-4">Update your password, email, and manage account preferences.</p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600 group-hover:gap-2 transition-all">
                  Edit Profile <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </>
          )}
        </div>

      </div>
    </div>
  );
}