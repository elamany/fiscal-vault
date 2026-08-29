// src/components/custom-error-display.tsx
'use client'; 

import Link from 'next/link';

interface CustomErrorDisplayProps {
  title: string;
  message: string;
  retryUrl?: string;
}

export default function CustomErrorDisplay({ title, message, retryUrl }: CustomErrorDisplayProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md w-full">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {retryUrl && (
            <Link 
              href={retryUrl}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium text-center"
            >
              Try Again
            </Link>
          )}
          <Link 
            href="/store"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-center"
          >
            Go to Product Listing
          </Link>
        </div>
      </div>
    </div>
  );
}