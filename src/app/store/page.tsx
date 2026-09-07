'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useProducts } from '@/hooks/use-products';
import { useAuth } from '@/contexts/auth-context';
import { ApiError } from '@/lib/api-error';
import type { Product } from '@/types/product_types';

export default function StorePage() {
  const { 
    data, 
    isLoading, 
    error, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useProducts();
  const { user } = useAuth();

  // Flatten all pages of products into a single array
  const products = data?.pages.flatMap((page) => page.products) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto animate-pulse space-y-8">
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-4 space-y-4">
                <div className="h-48 bg-gray-200 rounded"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage = error instanceof ApiError ? error.message : 'Failed to load products.';
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <p className="text-red-700 font-medium mb-4">{errorMessage}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No products available</h2>
          <p className="text-gray-600">Check back later for new arrivals!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">All Products</h1>
          {!user && (
            <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              Log in to add items to cart →
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product, index) => (
            // Pass isPriority to the first 4 items to fix LCP warnings
            <ProductCard key={product.id} product={product} isLoggedIn={!!user} isPriority={index < 4} />
          ))}
        </div>

        {/* Load More Button */}
        {hasNextPage && (
          <div className="mt-12 text-center">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="px-8 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isFetchingNextPage ? 'Loading more...' : 'Load More Products'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product, isLoggedIn, isPriority }: { product: Product; isLoggedIn: boolean; isPriority?: boolean }) {
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const imageUrl = product.images.length > 0 ? product.images[0].url : 'https://via.placeholder.com/400x300?text=No+Image';

  return (
    <div className="group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <Link href={`/products/${product.name.toLowerCase().replace(/\s+/g, '-')}-${product.id}`} className="block relative h-48 w-full overflow-hidden bg-gray-100">
        <Image 
          src={imageUrl} 
          alt={product.name}
          fill
          priority={isPriority} 
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" // ✅ Fixes missing sizes warning
        />
      </Link>

      <div className="p-4">
        {product.tenant && (
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            {product.tenant.name}
          </p>
        )}
        <Link href={`/products/${product.name.toLowerCase().replace(/\s+/g, '-')}-${product.id}`}>
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1 hover:text-blue-600 transition-colors">
            {product.name}
          </h3>
        </Link>
        {/* <p className="mt-1 text-sm text-gray-600 line-clamp-2 min-h-10">
          {product.description || 'No description available.'}
        </p> */}

        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-xl font-bold text-gray-900">
              {Number(product.price).toLocaleString('en-ET')} ETB
            </p>
            <p className={`text-xs mt-1 font-medium ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-green-600'}`}>
              {isOutOfStock ? 'Out of Stock' : isLowStock ? `Only ${product.stock} left!` : 'In Stock'}
            </p>
          </div>
          <button
            disabled={isOutOfStock || !isLoggedIn}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
              isOutOfStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : !isLoggedIn ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            title={!isLoggedIn ? 'Please log in to add to cart' : ''}
          >
            {isOutOfStock ? 'Sold Out' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}