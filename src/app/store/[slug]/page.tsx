import Link from 'next/link';
import Image from 'next/image';
import { Store, User, ShoppingBag, Package, ArrowLeft, Image as ImageIcon, AlertCircle } from 'lucide-react';
import StoreOwnerBanner from '@/components/store-owner-banner';

interface StoreProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  images: { id: string; url: string; order: number }[];
}

interface StoreData {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  products: StoreProduct[];
}

export const dynamic = 'force-dynamic';

interface StorePageProps {
  params: Promise<{ slug: string }>;
}

export default async function StorePage({ params }: StorePageProps) {
  const { slug } = await params;

  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/stores/${slug}`, {
    cache: 'no-store',
  });

  if (response.status === 404) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-md w-full">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
            <Store className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Store Not Found</h3>
          <p className="text-gray-600 mb-6">
            The store you are looking for does not exist or may have been removed.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Products
          </Link>
        </div>
      </div>
    );
  }

  if (!response.ok) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-md w-full">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-50 mb-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
          <p className="text-gray-600 mb-6">
            We couldn&apos;t load the store details. Please try again later.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Products
          </Link>
        </div>
      </div>
    );
  }

  const data = await response.json();
  const store: StoreData = data.store;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to All Products
          </Link>
        </div>
      </div>

      {/* Store Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-start gap-6">
              <div className="h-20 w-20 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/20">
                <Store className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2 capitalize">{store.name}</h1>
                <div className="flex items-center gap-2 text-gray-600 mb-3">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium capitalize">Owned by {store.ownerName}</span>
                </div>
                <StoreOwnerBanner storeId={store.id} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900 capitalize">
            Products from {store.name}
          </h2>
          <span className="text-sm text-gray-500">
            {store.products.length} {store.products.length === 1 ? 'product' : 'products'}
          </span>
        </div>

        {store.products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No active products</h3>
            <p className="text-gray-600">
              This store hasn&apos;t published any products yet. Check back later!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {store.products.map((product) => (
              <StoreProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Simplified Product Card for Store Page
function StoreProductCard({ product }: { product: StoreProduct }) {
  const mainImage = product.images[0];
  const stockStatus =
    product.stock === 0
      ? { label: 'Out of Stock', color: 'bg-red-100 text-red-700' }
      : product.stock <= 5
      ? { label: `Only ${product.stock} left`, color: 'bg-amber-100 text-amber-700' }
      : { label: 'In Stock', color: 'bg-green-100 text-green-700' };

  return (
    <Link
      href={`/products/${product.name.toLowerCase().replace(/\s+/g, '-')}-${product.id}`}
      className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {mainImage ? (
          <Image
            src={mainImage.url}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-gray-300" />
          </div>
        )}

        {/* Stock Badge */}
        <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold ${stockStatus.color}`}>
          {stockStatus.label}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-base font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
          {product.name}
        </h3>

        <div className="flex items-center justify-between">
          <p className="text-xl font-bold text-blue-600">
            {product.price.toLocaleString('en-ET')} ETB
          </p>
          <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
            <ShoppingBag className="h-4 w-4 text-blue-600 group-hover:text-white transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  );
}