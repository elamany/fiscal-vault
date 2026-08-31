// src/app/auth/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle background glow for premium feel */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-lg h-64 bg-blue-500/10 rounded-full blur-3xl -z-10"></div>
      
      {/* Smooth entry animation */}
      <div className="w-full max-w-md transition-all duration-500 ease-out">
        {children}
      </div>
    </div>
  );
}