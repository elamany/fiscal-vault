
export interface CartTenant {
  id: string;
  name: string;
  slug: string;
}

export interface CartProduct {
  id: string;
  name: string;
  price: string | number; // Prisma Decimal often serializes as string
  stock: number;
  tenant: CartTenant | null;
  images: { id?: string; url: string; order: number }[];
}

export interface CartItem {
  productId: string;
  quantity: number;
  product: CartProduct;
  cartItemId?: string; // Optional: only exists when synced from the database
}

export interface CartState {
  items: CartItem[];
  addItem: (product: CartProduct, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setItems: (items: CartItem[]) => void;
  mergeItems: (dbItems: CartItem[]) => void;
  getTotal: () => number;
}

export interface CartResponse {
  cart: {
    items: CartItem[];
  } | null;
}