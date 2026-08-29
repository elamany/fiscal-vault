// src/app/layout.tsx
import { QueryProvider } from '@/provider/query-provider';
import { AuthProvider } from '@/contexts/auth-context'; 
import NextTopLoader from 'nextjs-toploader'; 

import "./globals.css";
import Header from '@/components/header';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <AuthProvider>
            <Header />
            <main>{children}</main>
            <NextTopLoader 
              color="#2563eb" 
              initialPosition={0.08}
              crawlSpeed={200}
              height={3}
              crawl={true}
              showSpinner={false}
              easing="ease"
              speed={200}
              shadow="0 0 10px #2563eb,0 0 5px #2563eb"
            />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}