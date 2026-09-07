'use client';

import { Package, ClipboardList, TrendingUp, Boxes, PlusCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';

export default function DashboardHomePage() {
   const { user } = useAuth();
  
  const stats = [
    {
      name: 'Total Products',
      value: '0',
      icon: Package,
      color: 'blue',
      href: '/dashboard/products',
    },
    {
      name: 'Total Orders',
      value: '0',
      icon: ClipboardList,
      color: 'green',
      href: '/dashboard/orders',
    },
    {
      name: 'Revenue',
      value: '0 ETB',
      icon: TrendingUp,
      color: 'purple',
      href: '/dashboard/analytics',
    },
    {
      name: 'Low Stock Items',
      value: '0',
      icon: Boxes,
      color: 'amber',
      href: '/dashboard/inventory',
    },
  ];

  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'bg-blue-100 text-blue-600',
      border: 'border-blue-200',
    },
    green: {
      bg: 'bg-green-50',
      icon: 'bg-green-100 text-green-600',
      border: 'border-green-200',
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'bg-purple-100 text-purple-600',
      border: 'border-purple-200',
    },
    amber: {
      bg: 'bg-amber-50',
      icon: 'bg-amber-100 text-amber-600',
      border: 'border-amber-200',
    },
  };

  return (
    <div>
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 capitalize">
          Welcome back, {user?.firstName}!!
        </h1>
        <p className="mt-2 text-gray-600">
          Here&apos;s what&apos;s happening with your store today.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colors = colorClasses[stat.color as keyof typeof colorClasses];
          return (
            <Link
              key={stat.name}
              href={stat.href}
              className={`group bg-white rounded-2xl border ${colors.border} p-6 hover:shadow-lg transition-all hover:-translate-y-0.5`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`h-12 w-12 rounded-xl ${colors.icon} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">{stat.name}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </Link>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/dashboard/products/new"
            className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors group"
          >
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <PlusCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Add Product</p>
              <p className="text-sm text-gray-600">Create a new product listing</p>
            </div>
          </Link>

          <Link
            href="/dashboard/orders"
            className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200 hover:bg-green-100 transition-colors group"
          >
            <div className="h-10 w-10 rounded-lg bg-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">View Orders</p>
              <p className="text-sm text-gray-600">Check incoming orders</p>
            </div>
          </Link>

          <Link
            href="/dashboard/inventory"
            className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors group"
          >
            <div className="h-10 w-10 rounded-lg bg-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Boxes className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Check Inventory</p>
              <p className="text-sm text-gray-600">Monitor stock levels</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}