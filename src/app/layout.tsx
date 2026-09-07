import "./globals.css";
import { QueryProvider } from '@/provider/query-provider';
import { AuthProvider } from '@/contexts/auth-context';
import CartSyncProvider from '@/components/cart-sync-provider';
import HeaderWrapper from '@/components/header-wrapper';
import NextTopLoader from 'nextjs-toploader';


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <QueryProvider>
          <AuthProvider>
            <CartSyncProvider>
              <HeaderWrapper />
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
            </CartSyncProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

