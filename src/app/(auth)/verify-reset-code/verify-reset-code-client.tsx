'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {  Loader2, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { API_PATHS } from '@/constants/api_paths';
import { useRedirectIfAuth } from '@/hooks/use-auth-redirects';

interface VerifyResetCodeClientProps {
  initialEmail: string;
}

export default function VerifyResetCodeClient({ initialEmail }: VerifyResetCodeClientProps) {
  const router = useRouter();
  useRedirectIfAuth('/dashboard');
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      router.push('/forgot-password');
    }
  }, [email, router]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = otp.join('');
    
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    if (!email) {
      setError('Email is missing. Please start over.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch(API_PATHS.auth.verifyResetCode, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid code');
      }

      // Store token in sessionStorage and redirect to reset password
      sessionStorage.setItem('reset_token', data.token);
      router.push('/reset-password');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Verification failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResendLoading(true);
    setError('');
    
    try {
      const response = await fetch(API_PATHS.auth.forgotPassword, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to resend');
      }

      setResendTimer(60);
      setOtp(['', '', '', '', '', '']);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend';
      setError(errorMessage);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/20">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Verify Reset Code</h1>
        <p className="mt-2 text-sm text-gray-500">
          We sent a 6-digit code to <strong className="text-gray-900">{email}</strong>
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 sm:p-10">
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-50 border border-red-100 p-4">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Enter OTP code
            </label>
            <div className="flex justify-center gap-2 sm:gap-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-900 bg-gray-50/50 focus:bg-white transition-all"
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || otp.join('').length !== 6}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-wait transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Code'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Didn&apos;t receive the code?{' '}
            {resendTimer > 0 ? (
              <span className="font-medium text-gray-400">
                Resend in <span className="text-gray-900">{resendTimer}s</span>
              </span>
            ) : (
              <button
                onClick={handleResend}
                disabled={resendLoading}
                className="font-semibold text-blue-600 hover:text-blue-700 transition-colors disabled:text-gray-400"
              >
                {resendLoading ? 'Sending...' : 'Resend code'}
              </button>
            )}
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <Link href="/forgot-password" className="inline-flex items-center text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Try a different email
          </Link>
        </div>
      </div>
    </>
  );
}