import { useEffect } from 'react'; 
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_PATHS } from '@/constants/api_paths';
import { useCartStore } from '@/lib/store';
import { useAuth } from '@/contexts/auth-context';
import type { CartProduct, CartItem } from '@/types/cart_types';

interface DbCartApiResponse {
  cart: {
    items: {
      id: string;          
      productId: string;
      quantity: number;
      product: CartProduct;
    }[];
  } | null;
}

// Fetch cart from database (only for logged-in users)
export function useCart() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      if (!user) return { items: [] };
      
      const response = await fetch(API_PATHS.cart.base);
      if (!response.ok) throw new Error('Failed to fetch cart');
      
      const data: DbCartApiResponse = await response.json();
      return data.cart || { items: [] };
    },
    enabled: !!user, // Only fetch if user is logged in
    staleTime: 2 * 60 * 1000,
  });
}

//  Add item to cart (works for both anonymous and logged-in)
export function useAddToCart() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { addItem } = useCartStore();

  return useMutation({
    mutationFn: async ({ product, quantity }: { product: CartProduct; quantity: number }) => {
      // Always update Zustand immediately (optimistic UI)
      addItem(product, quantity);

      // If logged in, also save to database
      if (user) {
        const response = await fetch(API_PATHS.cart.base, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product.id, quantity }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to add to cart');
        }

        return response.json();
      }

      return { success: true };
    },
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['cart'] });
      }
    },
    onError: (error, variables) => {
      // If API fails, revert Zustand state
      useCartStore.getState().removeItem(variables.product.id);
      console.error('Add to cart error:', error);
    },
  });
}

// Update cart item quantity
export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { updateQuantity } = useCartStore();

  return useMutation({
    mutationFn: async ({ 
      productId, 
      cartItemId, 
      quantity 
    }: { 
      productId: string; 
      cartItemId?: string; 
      quantity: number;
    }) => {
      // Update Zustand immediately
      updateQuantity(productId, quantity);

      // If logged in and has DB ID, update database
      if (user && cartItemId) {
        const response = await fetch(API_PATHS.cart.base, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartItemId, quantity }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update cart');
        }

        return response.json();
      }

      return { success: true };
    },
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['cart'] });
      }
    },
  });
}

// Remove item from cart
export function useRemoveFromCart() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { removeItem } = useCartStore();

  return useMutation({
    mutationFn: async ({ 
      productId, 
      cartItemId 
    }: { 
      productId: string; 
      cartItemId?: string;
    }) => {
      // Remove from Zustand immediately
      removeItem(productId);

      // If logged in and has DB ID, remove from database
      if (user && cartItemId) {
        const response = await fetch(`${API_PATHS.cart.base}?cartItemId=${cartItemId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to remove from cart');
        }

        return response.json();
      }

      return { success: true };
    },
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['cart'] });
      }
    },
  });
}

export function useSyncCartOnLogin() {
  const { user } = useAuth();
  const { setItems, clearCart } = useCartStore();

  //  Use useEffect to clear cart IMMEDIATELY when user logs out
  useEffect(() => {
    if (!user) {
      clearCart(); // This updates Zustand state AND clears localStorage via persist middleware
    }
  }, [user, clearCart]);

  //  Use useQuery ONLY for merging/fetching when user logs IN
  useQuery({
    queryKey: ['cart-sync', user?.id],
    queryFn: async () => {
      if (!user) return { items: [] }; // Safety fallback
      
      const guestItems = useCartStore.getState().items;
      
      if (guestItems.length > 0) {
        const payload = guestItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        }));

        const mergeResponse = await fetch('/api/cart/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ items: payload }),
        });

        if (mergeResponse.ok) {
          const data: DbCartApiResponse = await mergeResponse.json();
          
          const mergedDbItems: CartItem[] = (data.cart?.items || []).map((dbItem) => ({
            productId: dbItem.productId,
            quantity: dbItem.quantity,
            product: dbItem.product,
            cartItemId: dbItem.id,
          }));
          
          setItems(mergedDbItems);
        }
      } else {
        const response = await fetch('/api/cart', { credentials: 'include' });
        if (response.ok) {
          const data: DbCartApiResponse = await response.json();
          
          const dbItems: CartItem[] = (data.cart?.items || []).map((dbItem) => ({
            productId: dbItem.productId,
            quantity: dbItem.quantity,
            product: dbItem.product,
            cartItemId: dbItem.id,
          }));
          
          setItems(dbItems);
        }
      }
      
      return { success: true };
    },
    enabled: !!user, // Only runs when user is logged in
    staleTime: 0,    // Always runs fresh when user state changes to logged in
  });
}