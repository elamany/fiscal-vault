'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/hooks/use-cart';
import { useUpdateCartItem } from '@/hooks/use-cart';
import { useRemoveFromCart } from '@/hooks/use-cart';
import { useCartStore } from '@/lib/store';
import type { CartItem } from '@/types/cart_types';

export default function CartPage() {
  const { data: cartData, isLoading } = useCart();
  const updateCartItem = useUpdateCartItem();
  const removeFromCart = useRemoveFromCart();
  
  // Fallback to local store if query is still loading or user is anonymous
  const items = cartData?.items || useCartStore.getState().items;

  // Group items by store/tenant
  const itemsByStore = items.reduce((acc, item) => {
    const storeName = item.product.tenant?.name || 'Unknown Store';
    if (!acc[storeName]) {
      acc[storeName] = [];
    }
    acc[storeName].push(item);
    return acc;
  }, {} as Record<string, CartItem[]>);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const isAnyItemOutOfStock = items.some((item) => item.quantity > item.product.stock);

  // Handle quantity change
  const handleQuantityChange = (item: CartItem, newQuantity: number) => {
    if (newQuantity < 1 || newQuantity > item.product.stock) return;
    
    updateCartItem.mutate({
      productId: item.productId,
      cartItemId: item.cartItemId,
      quantity: newQuantity,
    });
  };

  // Handle item removal
  const handleRemove = (item: CartItem) => {
    removeFromCart.mutate({
      productId: item.productId,
      cartItemId: item.cartItemId,
    });
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Empty State
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Looks like you haven&apos;t added anything yet.</p>
          <Link 
            href="/store" 
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Cart Items */}
          <div className="lg:col-span-8 space-y-6">
            {Object.entries(itemsByStore).map(([storeName, storeItems]) => (
              <div key={storeName} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Store Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {storeName}
                  </h2>
                </div>

                {/* Items List */}
                <ul className="divide-y divide-gray-200">
                  {storeItems.map((item) => {
                    const isOutOfStock = item.quantity > item.product.stock;
                    const imageUrl = item.product.images[0]?.url || 'https://via.placeholder.com/100?text=No+Image';

                    return (
                      <li key={item.productId} className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                        {/* Product Image */}
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100">
                          <Image
                            src={imageUrl}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        </div>

                        {/* Product Details */}
                        <div className="flex flex-1 flex-col">
                          <div className="flex justify-between">
                            <h3 className="text-base font-semibold text-gray-900">
                              <Link href={`/products/${item.product.name.toLowerCase().replace(/\s+/g, '-')}-${item.productId}`} className="hover:text-blue-600">
                                {item.product.name}
                              </Link>
                            </h3>
                            <p className="text-base font-medium text-gray-900">
                              {(Number(item.product.price) * item.quantity).toLocaleString('en-ET')} ETB
                            </p>
                          </div>
                          
                          <p className="mt-1 text-sm text-gray-500">
                            {Number(item.product.price).toLocaleString('en-ET')} ETB each
                          </p>

                          {isOutOfStock && (
                            <p className="mt-2 text-sm text-red-600 font-medium">
                              ⚠️ Only {item.product.stock} available in stock. Please reduce quantity.
                            </p>
                          )}

                          {/* Controls */}
                          <div className="mt-4 flex items-center gap-4">
                            <div className="flex items-center border border-gray-300 rounded-md">
                              <button
                                onClick={() => handleQuantityChange(item, item.quantity - 1)}
                                disabled={item.quantity <= 1 || updateCartItem.isPending}
                                className="px-3 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                              >
                                -
                              </button>
                              <span className="px-4 py-1 font-medium min-w-8 text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleQuantityChange(item, item.quantity + 1)}
                                disabled={item.quantity >= item.product.stock || updateCartItem.isPending}
                                className="px-3 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                              >
                                +
                              </button>
                            </div>

                            <button
                              onClick={() => handleRemove(item)}
                              disabled={removeFromCart.isPending}
                              className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1 disabled:opacity-50"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Remove
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            
            <Link 
              href="/store" 
              className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              ← Continue Shopping
            </Link>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-4 mt-8 lg:mt-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{subtotal.toLocaleString('en-ET')} ETB</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between text-base font-bold text-gray-900">
                  <span>Total</span>
                  <span>{subtotal.toLocaleString('en-ET')} ETB</span>
                </div>
              </div>

              {isAnyItemOutOfStock && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-800">
                    Some items exceed available stock. Please adjust quantities before checkout.
                  </p>
                </div>
              )}

              <Link
                href={isAnyItemOutOfStock ? '#' : '/checkout'}
                onClick={(e) => isAnyItemOutOfStock && e.preventDefault()}
                className={`mt-6 w-full flex justify-center items-center px-6 py-3 rounded-md text-base font-semibold transition-colors ${
                  isAnyItemOutOfStock
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                }`}
              >
                Proceed to Checkout
              </Link>
              
              <p className="mt-4 text-center text-xs text-gray-500">
                Secure checkout powered by Chapa
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}