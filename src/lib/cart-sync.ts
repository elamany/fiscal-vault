import { useCartStore, type CartItem, type CartProduct } from './store';

// Define the exact shape of the API response to avoid 'any'
interface DbCartItemResponse {
  id: string; // This is the cartItemId in the database
  productId: string;
  quantity: number;
  product: CartProduct;
}

interface CartApiResponse {
  cart: {
    items: DbCartItemResponse[];
  } | null;
}

export async function syncCartWithDatabase() {
  try {
    const response = await fetch('/api/cart');
    
    if (response.ok) {
      const data: CartApiResponse = await response.json();
      
      if (data.cart && data.cart.items.length > 0) {
        // Strictly typed map: no 'any' allowed!
        const dbItems: CartItem[] = data.cart.items.map((item: DbCartItemResponse) => ({
          productId: item.productId,
          quantity: item.quantity,
          product: item.product,
          cartItemId: item.id, // Store the DB ID for future updates/deletes
        }));
        
        // Overwrite local Zustand store with database truth
        useCartStore.getState().setItems(dbItems);
      }
    }
  } catch (error) {
    console.error('Failed to sync cart with database:', error);
  }
}

export async function addToCartDatabase(productId: string, quantity: number) {
  try {
    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity }),
    });
    
    if (response.ok) {
      const data: CartApiResponse = await response.json();
      return data.cart;
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to add to cart');
    }
  } catch (error) {
    console.error('Failed to add to cart in database:', error);
    throw error;
  }
}