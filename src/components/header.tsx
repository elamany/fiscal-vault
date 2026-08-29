'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ShoppingCart, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useCartStore } from '@/lib/store';

export default function Header() {
  const { user, logout } = useAuth();
  const { items: cartItems } = useCartStore();
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';
  const userName = user?.email ? user.email.split('@')[0] : 'User';
  const profileLink = user?.role === 'BUSINESS_OWNER' ? '/dashboard' : '/profile';

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">FiscalVault</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/store" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Store</Link>
            {user?.role === 'BUSINESS_OWNER' && (
              <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Dashboard</Link>
            )}
            {user && user.role !== 'BUSINESS_OWNER' && (
              <Link href="/orders" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">My Orders</Link>
            )}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            <Link href="/cart" className="relative p-2 text-gray-700 hover:text-blue-600 transition-colors">
              <ShoppingCart className="h-6 w-6" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </Link>

            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  <Link href={profileLink} className="flex items-center gap-2 hover:bg-gray-100 rounded-full p-1 pr-3 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                      {userInitial}
                    </div>
                    <span className="text-sm font-medium text-gray-700 max-w-30 truncate">{userName}</span>
                  </Link>
                  <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Logout">
                    <LogOut className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">Login</Link>
                  <Link href="/signup" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">Sign Up</Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-gray-700 hover:text-blue-600 transition-colors">
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-3">
            <Link href="/store" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md font-medium">Store</Link>
            {user?.role === 'BUSINESS_OWNER' && (
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md font-medium">Dashboard</Link>
            )}
            {user && user.role !== 'BUSINESS_OWNER' && (
              <Link href="/orders" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md font-medium">My Orders</Link>
            )}
            <div className="border-t border-gray-200 pt-3 mt-3">
              {user ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-2">
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">{userInitial}</div>
                    <span className="text-sm font-medium text-gray-900">{user.email}</span>
                  </div>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-md font-medium flex items-center gap-2">
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md font-medium">Login</Link>
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md font-medium text-center mt-2 mx-4">Sign Up</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}