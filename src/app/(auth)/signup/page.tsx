'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, ShoppingBag, Store, User, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useRedirectIfAuth } from '@/hooks/use-auth-redirects';

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  useRedirectIfAuth('/dashboard');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'BUSINESS_OWNER'>('CUSTOMER');
  
  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (role === 'BUSINESS_OWNER' && (!tenantName.trim() || !tenantSlug.trim())) {
      setError('Business owners must provide a store name and URL slug');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await signup(email, password, firstName.trim(), lastName.trim(), role, tenantName.trim() || undefined, tenantSlug.trim() || undefined);
      router.push('/auth/verify-email'); 
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create your account</h1>
        <p className="mt-2 text-sm text-gray-600">Join FiscalVault today</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
              <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type={showPassword ? 'text' : 'password'} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type={showPassword ? 'text' : 'password'} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">I want to:</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setRole('CUSTOMER')} className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${role === 'CUSTOMER' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                <ShoppingBag className="h-6 w-6" />
                <span className="text-sm font-medium">Shop</span>
              </button>
              <button type="button" onClick={() => setRole('BUSINESS_OWNER')} className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${role === 'BUSINESS_OWNER' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                <Store className="h-6 w-6" />
                <span className="text-sm font-medium">Sell</span>
              </button>
            </div>
          </div>

          {role === 'BUSINESS_OWNER' && (
            <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm font-medium text-blue-900 flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Store Details
              </p>
              <div>
                <label className="block text-xs font-medium text-blue-800 mb-1">Store Name</label>
                <input type="text" required value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder="e.g., Abebe's Electronics" className="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-blue-800 mb-1">Store URL Slug</label>
                <input type="text" required value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))} placeholder="e.g., abebes-electronics" className="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <p className="text-xs text-blue-600 mt-1">Lowercase letters, numbers, and hyphens only.</p>
              </div>
            </div>
          )}

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
          <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-wait transition-colors">
            {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Creating account...</> : 'Create account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">Already have an account? <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">Sign in</Link></p>
        </div>
      </div>
    </>
  );
}