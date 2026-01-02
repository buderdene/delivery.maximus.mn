/**
 * Cart Store
 * Platform-agnostic cart management
 * Works with both Web (localStorage) and Mobile (AsyncStorage)
 */

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { CartItem, Product, CartValidation, CartSummary } from '../types';
import { 
  calculateCartTotals, 
  validateCart, 
  validateQuantity,
  canAddToCart,
} from '../logic';

// ============ State Interface ============

export interface CartState {
  items: CartItem[];
  isLoading: boolean;
}

export interface CartActions {
  // Core actions
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  incrementQuantity: (productId: string) => void;
  decrementQuantity: (productId: string) => void;
  clearCart: () => void;
  
  // Hydration
  setItems: (items: CartItem[]) => void;
  
  // Helpers
  getItemByProductId: (productId: string) => CartItem | undefined;
  isInCart: (productId: string) => boolean;
  getItemQuantity: (productId: string) => number;
}

export interface CartComputed {
  // Getters (computed from state)
  getSummary: () => CartSummary;
  validate: () => CartValidation;
}

export type CartStore = CartState & CartActions & CartComputed;

// ============ Store Factory ============

export function createCartStore() {
  return createStore<CartStore>()((set, get) => ({
    // Initial state
    items: [],
    isLoading: false,

    // Add item to cart
    addItem: (product: Product, quantity = 1) => {
      if (!canAddToCart(product.current_stock, get().getItemQuantity(product.id))) {
        console.warn('Cannot add: out of stock or max quantity reached');
        return;
      }

      set((state) => {
        const existingItem = state.items.find((item) => item.productId === product.id);
        
        if (existingItem) {
          // Update existing item
          const newQuantity = validateQuantity(
            existingItem.quantity + quantity,
            existingItem.maxQuantity
          );
          
          return {
            items: state.items.map((item) =>
              item.productId === product.id
                ? { ...item, quantity: newQuantity }
                : item
            ),
          };
        }
        
        // Add new item
        const newItem: CartItem = {
          id: `cart-${product.id}-${Date.now()}`,
          productId: product.id,
          name: product.name,
          article: product.article,
          price: product.price,
          formattedPrice: product.formatted_price,
          quantity: validateQuantity(quantity, product.current_stock),
          maxQuantity: product.current_stock,
          imageUrl: product.main_image_url,
          category: product.category,
          addedAt: new Date().toISOString(),
        };
        
        return { items: [...state.items, newItem] };
      });
    },

    // Remove item
    removeItem: (productId: string) => {
      set((state) => ({
        items: state.items.filter((item) => item.productId !== productId),
      }));
    },

    // Update quantity
    updateQuantity: (productId: string, quantity: number) => {
      if (quantity <= 0) {
        get().removeItem(productId);
        return;
      }

      set((state) => ({
        items: state.items.map((item) =>
          item.productId === productId
            ? { ...item, quantity: validateQuantity(quantity, item.maxQuantity) }
            : item
        ),
      }));
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
      set({ items: [] });
    },

    // Set items (for hydration)
    setItems: (items: CartItem[]) => {
      set({ items });
    },

    // Get item by product ID
    getItemByProductId: (productId: string) => {
      return get().items.find((item) => item.productId === productId);
    },

    // Check if in cart
    isInCart: (productId: string) => {
      return get().items.some((item) => item.productId === productId);
    },

    // Get quantity
    getItemQuantity: (productId: string) => {
      return get().getItemByProductId(productId)?.quantity || 0;
    },

    // Get summary
    getSummary: (): CartSummary => {
      return calculateCartTotals(get().items);
    },

    // Validate
    validate: (): CartValidation => {
      const { items } = get();
      const { subtotal } = calculateCartTotals(items);
      return validateCart(items, subtotal);
    },
  }));
}

// ============ Default Store Instance ============

export const cartStore = createCartStore();

// ============ React Hook ============

export function useCartStore(): CartStore;
export function useCartStore<T>(selector: (state: CartStore) => T): T;
export function useCartStore<T>(selector?: (state: CartStore) => T) {
  return useStore(cartStore, selector!);
}

// ============ Selectors ============

export const selectCartItems = (state: CartStore) => state.items;
export const selectCartItemCount = (state: CartStore) => state.items.length;
export const selectCartTotalItems = (state: CartStore) => 
  state.items.reduce((sum, item) => sum + item.quantity, 0);
export const selectCartSubtotal = (state: CartStore) => 
  state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
export const selectCartIsEmpty = (state: CartStore) => state.items.length === 0;
