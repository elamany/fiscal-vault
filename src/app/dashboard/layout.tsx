'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Package, ClipboardList, Boxes, 
  TrendingUp, Settings, Menu, X, LogOut, 
  ChevronLeft, ChevronRight, User
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, loading } = useAuth();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Redirect if not authenticated or not a business owner
  useEffect(() => {
    if (!loading && (!user || user.role !== 'BUSINESS_OWNER')) {
      router.push('/profile');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // Show loading spinner while checking auth
  if (loading || !user || user.role !== 'BUSINESS_OWNER') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const navigation = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Products', href: '/dashboard/products', icon: Package },
    { name: 'Orders', href: '/dashboard/orders', icon: ClipboardList },
    { name: 'Inventory', href: '/dashboard/inventory', icon: Boxes },
    { name: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 bg-gray-900 border-r border-gray-800 transform transition-all duration-300 ease-in-out 
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          lg:translate-x-0 lg:static lg:h-full
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Mobile Close */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800 shrink-0">
            <Link href="/dashboard" className={`flex items-center gap-3 ${isCollapsed ? 'lg:justify-center' : ''}`}>
              <div className="h-9 w-9 min-w-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                <Package className="h-5 w-5 text-white" />
              </div>
              {!isCollapsed && (
                <span className="text-lg font-bold text-white whitespace-nowrap">Dashboard</span>
              )}
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative
                    ${active
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }
                    ${isCollapsed ? 'lg:justify-center lg:px-2' : ''}
                  `}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon className={`h-5 w-5 min-w-5 ${active ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                  {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Collapse Toggle (Desktop Only) */}
          <div className="hidden lg:flex justify-center py-3 border-t border-gray-800 shrink-0">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>
          </div>

          {/* User section */}
          <div className="border-t border-gray-800 p-3 shrink-0">
            <div className={`flex items-center gap-3 px-2 py-2 mb-2 ${isCollapsed ? 'lg:justify-center' : ''}`}>
              <div className="h-9 w-9 min-w-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm shadow-md shadow-blue-600/20">
                {user.firstName.charAt(0).toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate capitalize">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all
                ${isCollapsed ? 'lg:justify-center' : ''}
              `}
              title={isCollapsed ? 'Logout' : undefined}
            >
              <LogOut className="h-5 w-5 min-w-5" />
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="shrink-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex items-center gap-4 ml-auto">
              <Link
                href="/profile"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">My Profile</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}