/**
 * Cart Store for Web
 * Uses localStorage for persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '@/types';

// Cart Item type
export interface CartItem {
  id: string;
  productId: string;
  name: string;
  article: string | null;
  price: number;
  formattedPrice: string;
  quantity: number;
  maxQuantity: number;
  imageUrl: string | null;
  category: string | null;
  addedAt: string;
}

// Cart validation result
export interface CartValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Constants
const MIN_ORDER_AMOUNT = 50000;

// Format price helper
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('mn-MN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price) + '₮';
};

// Calculate totals
const calculateTotals = (items: CartItem[]) => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return {
    itemCount: items.length,
    totalItems,
    totalAmount,
    formattedTotal: formatPrice(totalAmount),
    isEmpty: items.length === 0,
  };
};

// Cart State
interface CartState {
  items: CartItem[];
  isLoading: boolean;
  
  // Computed
  itemCount: number;
  totalItems: number;
  totalAmount: number;
  formattedTotal: string;
  isEmpty: boolean;
  
  // Actions
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  incrementQuantity: (productId: string) => void;
  decrementQuantity: (productId: string) => void;
  clearCart: () => void;
  
  // Helpers
  getItemByProductId: (productId: string) => CartItem | undefined;
  isInCart: (productId: string) => boolean;
  getItemQuantity: (productId: string) => number;
  
  // Validation
  validateCart: () => CartValidation;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      
      // Computed values (recalculated on rehydration)
      itemCount: 0,
      totalItems: 0,
      totalAmount: 0,
      formattedTotal: '0₮',
      isEmpty: true,
      
      // Add item to cart
      addItem: (product: Product, quantity = 1) => {
        if (product.stock_status === 'out_of_stock' || product.current_stock <= 0) {
          console.warn('Cannot add out of stock product');
          return;
        }

        set((state) => {
          const existingItem = state.items.find((item) => item.productId === product.id);
          
          let newItems: CartItem[];
          
          if (existingItem) {
            const newQuantity = Math.min(
              existingItem.quantity + quantity,
              existingItem.maxQuantity
            );
            newItems = state.items.map((item) =>
              item.productId === product.id
                ? { ...item, quantity: newQuantity }
                : item
            );
          } else {
            const newItem: CartItem = {
              id: `cart-${product.id}-${Date.now()}`,
              productId: product.id,
              name: product.name,
              article: product.article || null,
              price: product.price,
              formattedPrice: product.formatted_price,
              quantity: Math.min(quantity, product.current_stock),
              maxQuantity: product.current_stock,
              imageUrl: product.main_image_url || null,
              category: product.category || null,
              addedAt: new Date().toISOString(),
            };
            newItems = [...state.items, newItem];
          }
          
          return {
            items: newItems,
            ...calculateTotals(newItems),
          };
        });
      },
      
      // Remove item from cart
      removeItem: (productId: string) => {
        set((state) => {
          const newItems = state.items.filter((item) => item.productId !== productId);
          return {
            items: newItems,
            ...calculateTotals(newItems),
          };
        });
      },
      
      // Update quantity
      updateQuantity: (productId: string, quantity: number) => {
        set((state) => {
          if (quantity <= 0) {
            const newItems = state.items.filter((item) => item.productId !== productId);
            return {
              items: newItems,
              ...calculateTotals(newItems),
            };
          }
          
          const newItems = state.items.map((item) =>
            item.productId === productId
              ? { ...item, quantity: Math.min(quantity, item.maxQuantity) }
              : item
          );
          
          return {
            items: newItems,
            ...calculateTotals(newItems),
          };
        });
      },
      
      // Increment quantity
      incrementQuantity: (productId: string) => {
        const item = get().getItemByProductId(productId);
        if (item && item.quantity < item.maxQuantity) {
          get().updateQuantity(productId, item.quantity + 1);
        }
      },
      
      // Decrement quantity
      decrementQuantity: (productId: string) => {
        const item = get().getItemByProductId(productId);
        if (item) {
          get().updateQuantity(productId, item.quantity - 1);
        }
      },
      
      // Clear cart
      clearCart: () => {
        set({
          items: [],
          itemCount: 0,
          totalItems: 0,
          totalAmount: 0,
          formattedTotal: '0₮',
          isEmpty: true,
        });
      },
      
      // Get item by product ID
      getItemByProductId: (productId: string) => {
        return get().items.find((item) => item.productId === productId);
      },
      
      // Check if product is in cart
      isInCart: (productId: string) => {
        return get().items.some((item) => item.productId === productId);
      },
      
      // Get quantity of product in cart
      getItemQuantity: (productId: string) => {
        const item = get().getItemByProductId(productId);
        return item?.quantity || 0;
      },

      // Validate cart before checkout
      validateCart: () => {
        const { items, totalAmount } = get();
        const errors: string[] = [];
        const warnings: string[] = [];

        if (items.length === 0) {
          errors.push('Сагс хоосон байна');
        }

        if (totalAmount < MIN_ORDER_AMOUNT) {
          errors.push(`Хамгийн бага захиалгын дүн ${formatPrice(MIN_ORDER_AMOUNT)}`);
        }

        items.forEach((item) => {
          if (item.quantity > item.maxQuantity) {
            errors.push(`"${item.name}" барааны үлдэгдэл хүрэлцэхгүй байна`);
          }
          if (item.maxQuantity <= 5) {
            warnings.push(`"${item.name}" барааны үлдэгдэл цөөн байна`);
          }
        });

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const totals = calculateTotals(state.items);
          Object.assign(state, totals);
        }
      },
    }
  )
);

// Selectors
export const selectCartItemCount = (state: CartState) => state.itemCount;
export const selectCartTotal = (state: CartState) => state.totalAmount;
export const selectCartIsEmpty = (state: CartState) => state.isEmpty;
