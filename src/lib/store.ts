import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartState, CartItem, CartProduct } from '@/types/cart_types';

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product: CartProduct, quantity: number) => {
        set((state) => {
          const existingItem = state.items.find((item) => item.productId === product.id);
          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.productId === product.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          }
          return {
            items: [...state.items, { productId: product.id, quantity, product }],
          };
        });
      },

      removeItem: (productId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        }));
      },

      updateQuantity: (productId: string, quantity: number) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId ? { ...item, quantity } : item
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      setItems: (items: CartItem[]) => set({ items }),

      //  Merge local anonymous cart with database cart on login
      mergeItems: (dbItems: CartItem[]) => {
        set((state) => {
          const merged = [...dbItems];
          // For each local item, check if it already exists in the DB items
          state.items.forEach((localItem) => {
            const existingInDb = merged.find((item) => item.productId === localItem.productId);
            
            if (existingInDb) {
              // Item exists in DB: add the local quantity to the DB quantity
              existingInDb.quantity += localItem.quantity;
            } else {
              // Item not in DB: add the local item to the merged array
              merged.push(localItem);
            }
          });
          
          return { items: merged };
        });
      },

      getTotal: () => {
        return get().items.reduce((total, item) => {
          return total + Number(item.product.price) * item.quantity;
        }, 0);
      },
    }),
    {
      name: 'shopping-cart', // Name in localStorage
    }
  )
);