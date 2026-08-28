// src/app/cart/page.tsx
'use client';

import { useCartStore } from '@/lib/cart-store';

export default function CartPage() {
  const { items, addItem, removeItem, updateQuantity, getTotal, clearCart } = useCartStore();

  // Mock function to add a test item
  const addTestItem = () => {
    addItem({
      productId: 'test-123',
      name: 'Premium Coffee Beans',
      price: 450.00,
      quantity: 1,
      imageUrl: null,
    });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Shopping Cart</h1>
      
      <button 
        onClick={addTestItem}
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Add Test Item
      </button>

      {items.length === 0 ? (
        <p className="text-gray-500">Your cart is empty.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.productId} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-gray-600">${item.price.toFixed(2)} each</p>
              </div>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  -
                </button>
                <span className="w-8 text-center">{item.quantity}</span>
                <button 
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  +
                </button>
                <button 
                  onClick={() => removeItem(item.productId)}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          
          <div className="mt-8 pt-4 border-t flex justify-between items-center">
            <span className="text-xl font-bold">Total:</span>
            <span className="text-2xl font-bold text-green-600">${getTotal().toFixed(2)}</span>
          </div>
          
          <button 
            onClick={clearCart}
            className="mt-4 w-full px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
          >
            Clear Cart
          </button>
        </div>
      )}
    </div>
  );
}