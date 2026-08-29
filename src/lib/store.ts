import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Define strict types for our cart data
export interface CartTenant {
  id: string;
  name: string;
  slug: string;
}

export interface CartProduct {
  id: string;
  name: string;
  price: string | number; //Prisma Decimal often serializes as string
  stock: number;
  tenant: CartTenant | null;
  images: { url: string }[];
}

export interface CartItem {
  productId: string;
  quantity: number;
  product: CartProduct;
  cartItemId?: string; // Optional: only exists when synced from the database
}

interface CartState {
  items: CartItem[];
  addItem: (product: CartProduct, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setItems: (items: CartItem[]) => void; // Used for DB sync
  getTotal: () => number;
}

//  Create the store with localStorage persistence
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product, quantity) => {
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

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        }));
      },

      updateQuantity: (productId, quantity) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId ? { ...item, quantity } : item
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      setItems: (items) => set({ items }),

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