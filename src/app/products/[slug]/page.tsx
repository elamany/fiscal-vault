// src/app/products/[slug]/page.tsx
import Link from 'next/link';
import { extractProductIdFromSlug } from '@/utils/slug';
import { API_PATHS } from '@/constants/api_paths';
import { safeFetch } from '@/lib/api-error';
import type { Product } from '@/types/product_types';
import CustomErrorDisplay from '@/components/custom-error-display';
import ProductImageGallery from '@/components/product-image-gallery';
import AddToCartSection from '@/components/add-to-cart-section';

export const dynamic = 'force-dynamic';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
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
        retryUrl={`/products/${slug}`}
      />
    );
  }

  // Handle missing product or API failure
  let product: Product | null = null;
  try {
    const data = await safeFetch<{ product: Product }>(API_PATHS.products.byId(productId));
    product = data.product;
  } catch (error) {
    return (
      <CustomErrorDisplay 
        title="Product Not Found" 
        message="We couldn't find the product you're looking for. It may have been removed or is temporarily unavailable." 
        retryUrl={`/products/${slug}`}
      />
    );
  }

  // Success State: Render Product Details
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
        {/* Back Link */}
        <div className="mb-6">
          <Link href="/store" className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium">
            ← Back to Products
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <ProductImageGallery 
              images={product.images} 
              productName={product.name}
            />
          </div>

          <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
            
            {product.tenant && (
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
                Sold by: {product.tenant.name}
              </p>
            )}

            <p className="text-gray-600 mb-6 leading-relaxed">
              {product.description || 'No description available for this product.'}
            </p>

            <div className="mt-auto border-t border-gray-100 pt-6">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-3xl font-bold text-blue-600">
                    {Number(product.price).toLocaleString('en-ET')} ETB
                  </p>
                  <p className={`text-sm mt-2 font-medium ${
                    product.stock === 0 ? 'text-red-600' : 
                    product.stock <= 5 ? 'text-amber-600' : 'text-green-600'
                  }`}>
                    {product.stock === 0 ? 'Out of Stock' : 
                     product.stock <= 5 ? `Only ${product.stock} left in stock!` : 
                     `${product.stock} available`}
                  </p>
                </div>
              </div>

              <AddToCartSection product={product} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}