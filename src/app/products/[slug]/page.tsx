// src/app/products/[slug]/page.tsx
import Link from 'next/link';
import { extractProductIdFromSlug } from '@/utils/slug';
import { API_PATHS } from '@/constants/api_paths';
import { safeFetch } from '@/lib/api-error';
import CustomErrorDisplay from '@/components/custom-error-display';
import ProductImageGallery from '@/components/product-image-gallery';
import AddToCartSection from '@/components/add-to-cart-section';
import { Store, User, Check } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

interface PublicProduct {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  images: { id: string; url: string; order: number }[];
  tenant?: {              
    id: string;
    name: string;
    slug: string;
    ownerName: string;
  }
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const productId = extractProductIdFromSlug(slug);

  // Handle malformed URL
  if (!productId) {
    return (
      <CustomErrorDisplay 
        title="Invalid Product Link" 
        message="The link you followed is malformed. Please check the URL and try again." 
        retryUrl="/products"
      />
    );
  }

  let product: PublicProduct | null = null;
  try {
    const data = await safeFetch<{ product: PublicProduct }>(API_PATHS.products.byId(productId));
    product = data.product;
  } catch (error) {
    return (
      <CustomErrorDisplay 
        title="Product Not Found" 
        message="We couldn't find the product you're looking for. It may have been removed or is temporarily unavailable." 
        retryUrl="/products"
      />
    );
  }

  const stockStatus =
    product.stock === 0
      ? { label: 'Out of Stock', color: 'bg-red-100 text-red-700 border-red-200', disabled: true }
      : product.stock <= 5
      ? { label: `Low Stock - Only ${product.stock} left`, color: 'bg-amber-100 text-amber-700 border-amber-200', disabled: false }
      : { label: 'In Stock', color: 'bg-green-100 text-green-700 border-green-200', disabled: false };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
          >
            ← Back to Products
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          
          {/* Left Column: Image Gallery */}
          <div>
            <ProductImageGallery 
              images={product.images} 
              productName={product.name}
            />
          </div>

          {/* Right Column: Product Info */}
          <div className="flex flex-col">
            {/* Stock Badge */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border w-fit mb-4 ${stockStatus.color}`}>
              {stockStatus.label}
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {product.name}
            </h1>

            <p className="text-4xl font-bold text-blue-600 mb-8">
              {Number(product.price).toLocaleString('en-ET')} ETB
            </p>

            {product.description && (
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Description
                </h2>
                <div
                  className="prose prose-sm max-w-none text-gray-700 
                    prose-headings:text-gray-900 prose-headings:font-bold
                    prose-p:text-gray-700 prose-p:leading-relaxed prose-p:break-words
                    prose-strong:text-gray-900
                    prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-a:break-all
                    prose-ul:text-gray-700
                    prose-ol:text-gray-700
                    prose-li:text-gray-700 prose-li:break-words
                    prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:italic prose-blockquote:break-words
                    prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:break-all
                    prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-xl prose-pre:p-4 prose-pre:overflow-x-auto prose-pre:whitespace-pre-wrap
                    prose-img:rounded-xl prose-img:max-w-full prose-img:h-auto
                    break-words overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            )}

            {/* Add to Cart Section */}
            <div className="mt-auto border-t border-gray-100 pt-6 mb-8">
              <AddToCartSection product={product} />
            </div>

            {/* Store Info Card */}
            {product.tenant && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                    <Store className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Sold by
                    </p>
                    <Link
                      href={`/store/${product.tenant.slug}`}
                      className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors block truncate"
                    >
                      {product.tenant.name}
                    </Link>
                    
                    {/* Owner Name */}
                    {product.tenant.ownerName && (
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                        <User className="h-3.5 w-3.5" />
                        <span>{product.tenant.ownerName}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Visit Store Button */}
                <Link
                  href={`/store/${product.tenant.slug}`}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-all"
                >
                  <Store className="h-4 w-4" />
                  Visit Store
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}