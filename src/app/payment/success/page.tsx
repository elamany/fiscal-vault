// src/app/payment/success/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const txRef = searchParams.get('txRef');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center bg-gray-50">
      <div className="rounded-full bg-green-100 p-4 mb-6">
        <svg 
          className="h-16 w-16 text-green-600" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M5 13l4 4L19 7" 
          />
        </svg>
      </div>
      
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Payment Successful!
      </h1>
      <p className="text-gray-600 mb-6 max-w-md">
        Thank you for your purchase. Your order has been processed and the sellers have been notified.
      </p>
      
      {txRef && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-8 shadow-sm w-full max-w-md">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Transaction Reference
          </p>
          <p className="text-sm font-mono font-semibold text-gray-800 break-all">
            {txRef}
          </p>
        </div>
      )}
      
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
      >
        Return to Home
      </Link>
    </div>
  );
}