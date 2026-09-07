// src/lib/store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem, CartProduct, CartState } from '@/types/cart_types';

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product: CartProduct, quantity: number) => {
        set((state) => {
          const existingItem = state.items.find((i) => i.productId === product.id);
          if (existingItem) {
            return {
              items: state.items.map((i) => 
                i.productId === product.id
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            };
          }
          return { 
            items: [...state.items, { productId: product.id, quantity, product }] 
          };
        });
      },
      
      removeItem: (productId: string) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }));
      },
      
      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        }));
      },
      
      clearCart: () => {
        set({ items: [] });
      },

      setItems: (items: CartItem[]) => {
        set({ items });
      },
      
      mergeItems: (dbItems: CartItem[]) => {
        set((state) => {
          const guestItems = state.items;
          const mergedMap = new Map<string, CartItem>();

          dbItems.forEach((item) => {
            mergedMap.set(item.productId, item);
          });

          //  Merge guest items: if it exists in DB, add quantities. If not, add as new.
          guestItems.forEach((guestItem) => {
            const existing = mergedMap.get(guestItem.productId);
            if (existing) {
              mergedMap.set(guestItem.productId, {
                ...existing,
                quantity: existing.quantity + guestItem.quantity,
              });
            } else {
              mergedMap.set(guestItem.productId, guestItem);
            }
          });

          return { items: Array.from(mergedMap.values()) };
        });
      },
      
      getTotal: () => {
        return get().items.reduce(
          (total, item) => total + Number(item.product.price) * item.quantity,
          0
        );
      },
    }),
    {
      name: 'fiscal-vault-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);