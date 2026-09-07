'use client';

import { useState } from 'react';
import { Minus, Plus, Trash2, Loader2, ShoppingCart } from 'lucide-react';
import { useAddToCart, useRemoveFromCart, useUpdateCartItem } from '@/hooks/use-cart';
import { useCartStore } from '@/lib/store';
import type { Product } from '@/types/product_types';
import type { CartProduct } from '@/types/cart_types';

interface AddToCartSectionProps {
  product: Product;
}

export default function AddToCartSection({ product }: AddToCartSectionProps) {
  const { items } = useCartStore();
  const existingItem = items.find((item) => item.productId === product.id);
  
  // When navigating back to this page, the component remounts and picks up the latest quantity.
  const [quantity, setQuantity] = useState(existingItem?.quantity ?? 1);

  const addToCart = useAddToCart();
  const removeFromCart = useRemoveFromCart();
  const updateCartItem = useUpdateCartItem();

  const isOutOfStock = product.stock === 0;
  const isLoading = addToCart.isPending || removeFromCart.isPending || updateCartItem.isPending;

  const handleAddToCart = async () => {
    if (isOutOfStock) return;

    if (existingItem) {
      try {
        await updateCartItem.mutateAsync({
          productId: product.id,
          cartItemId: existingItem.cartItemId,
          quantity: quantity, 
        });
      } catch (error) {
        console.error('Failed to update cart:', error);
      }
      return;
    }
    
    const cartProduct: CartProduct = {
      id: product.id,
      name: product.name,
      price: product.price,
      stock: product.stock,
      tenant: product.tenant || null,
      images: product.images,
    };

    try {
      await addToCart.mutateAsync({ product: cartProduct, quantity });
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

  const handleRemove = async () => {
    if (!existingItem) return;
    try {
      await removeFromCart.mutateAsync({ 
        productId: product.id, 
        cartItemId: existingItem.cartItemId 
      });
    } catch (error) {
      console.error('Failed to remove from cart:', error);
    }
  };

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1 || newQuantity > product.stock) return;
    setQuantity(newQuantity);

    // If it's already in the cart, update it in the database immediately
    if (existingItem) {
      try {
        await updateCartItem.mutateAsync({
          productId: product.id,
          cartItemId: existingItem.cartItemId,
          quantity: newQuantity,
        });
      } catch (error) {
        console.error('Failed to update quantity:', error);
      }
    }
  };

  if (isOutOfStock) {
    return (
      <button type="button" disabled className="w-full px-6 py-3 rounded-md text-base font-semibold bg-gray-100 text-gray-400 cursor-not-allowed flex items-center justify-center gap-2">
        <ShoppingCart className="h-5 w-5" />
        Out of Stock
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quantity Selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">Quantity:</span>
        <div className="flex items-center border border-gray-300 rounded-md bg-white">
          <button
            type="button"
            onClick={() => handleQuantityChange(quantity - 1)}
            disabled={quantity <= 1 || isLoading}
            className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="px-4 py-2 font-medium min-w-12 text-center border-x border-gray-300 text-gray-900">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => handleQuantityChange(quantity + 1)}
            disabled={quantity >= product.stock || isLoading}
            className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {existingItem && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isLoading}
            className="flex-1 px-6 py-3 rounded-md text-base font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isLoading && removeFromCart.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Trash2 className="h-5 w-5" />
            )}
            {isLoading && removeFromCart.isPending ? 'Removing...' : 'Remove'}
          </button>
        )}

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isLoading}
          className={`flex-1 px-6 py-3 rounded-md text-base font-semibold text-white transition-colors flex items-center justify-center gap-2 ${
            isLoading ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700 shadow-sm'
          }`}
        >
          {isLoading && addToCart.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ShoppingCart className="h-5 w-5" />
          )}
          {isLoading && addToCart.isPending 
            ? (existingItem ? 'Updating...' : 'Adding...') 
            : (existingItem ? 'Update Cart' : 'Add to Cart')
          }
        </button>
      </div>
    </div>
  );
}