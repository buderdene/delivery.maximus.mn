/**
 * Checkout Store
 * Order creation, payment, and sync management
 */

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { 
  Order, 
  OrderItem, 
  OrderStatus, 
  PaymentMethod, 
  PaymentStatus,
  CheckoutDraft,
  OrderSummary,
  CartItem,
} from '../types';
import { 
  calculateOrderSummary,
  cartToOrderItems,
  generateOrderNumber,
  calculateRemainingAmount,
  getPaymentStatus,
  validateDiscount,
  formatPrice,
} from '../logic';

// ============ State Interface ============

export interface CheckoutState {
  // Orders
  orders: Order[];
  currentOrder: Order | null;
  
  // Checkout draft
  checkout: CheckoutDraft;
  
  // Loading states
  isCheckingOut: boolean;
  isSyncing: boolean;
  isLoading: boolean;
  
  // Errors
  checkoutError: string | null;
  syncError: string | null;
  error: string | null;
}

export interface CheckoutActions {
  // Checkout actions
  setCustomer: (customerId: string, name: string, phone?: string, address?: string) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setDiscount: (percent: number) => void;
  setNotes: (notes: string) => void;
  setDeliveryNotes: (notes: string) => void;
  resetCheckout: () => void;
  
  // Order actions
  createOrder: (cartItems: CartItem[]) => Promise<Order>;
  confirmOrder: (orderId: string) => Promise<void>;
  cancelOrder: (orderId: string) => void;
  
  // Payment actions
  recordPayment: (orderId: string, amount: number, method: PaymentMethod) => void;
  
  // Sync actions
  syncOrderToERP: (orderId: string, apiClient: ERPApiClient) => Promise<boolean>;
  syncPendingOrders: (apiClient: ERPApiClient) => Promise<void>;
  
  // Query actions
  getOrderById: (orderId: string) => Order | undefined;
  getOrdersByStatus: (status: OrderStatus) => Order[];
  getOrdersByCustomer: (customerId: string) => Order[];
  
  // Hydration
  setOrders: (orders: Order[]) => void;
  setCheckout: (checkout: CheckoutDraft) => void;
}

export interface CheckoutComputed {
  getOrderSummary: (cartItems: CartItem[]) => OrderSummary;
  getPendingOrders: () => Order[];
  getUnsyncedOrders: () => Order[];
  getTodaysOrders: () => Order[];
  getOrderStats: () => OrderStats;
}

export type CheckoutStore = CheckoutState & CheckoutActions & CheckoutComputed;

// ============ Types ============

export interface ERPApiClient {
  createOrder: (payload: ERPOrderPayload) => Promise<{ orderId: string }>;
}

export interface ERPOrderPayload {
  partnerId: string;
  orderDate: string;
  items: Array<{
    nomenclatureId: string;
    quantity: number;
    price: number;
    amount: number;
  }>;
  discountPercent: number;
  total: number;
  notes: string | null;
  paymentMethod: PaymentMethod;
}

export interface OrderStats {
  totalOrders: number;
  todaysOrders: number;
  todaysRevenue: number;
  pendingCount: number;
  unsyncedCount: number;
}

// ============ Initial State ============

const initialCheckout: CheckoutDraft = {
  customerId: null,
  customerName: null,
  customerPhone: null,
  customerAddress: null,
  paymentMethod: 'cash',
  discountPercent: 0,
  notes: null,
  deliveryNotes: null,
};

// ============ Store Factory ============

export function createCheckoutStore() {
  return createStore<CheckoutStore>()((set, get) => ({
    // Initial state
    orders: [],
    currentOrder: null,
    checkout: initialCheckout,
    isCheckingOut: false,
    isSyncing: false,
    isLoading: false,
    checkoutError: null,
    syncError: null,
    error: null,

    // Set customer
    setCustomer: (customerId, name, phone, address) => {
      set((state) => ({
        checkout: {
          ...state.checkout,
          customerId,
          customerName: name,
          customerPhone: phone || null,
          customerAddress: address || null,
        },
        checkoutError: null,
      }));
    },

    // Set payment method
    setPaymentMethod: (method) => {
      set((state) => ({
        checkout: { ...state.checkout, paymentMethod: method },
      }));
    },

    // Set discount
    setDiscount: (percent) => {
      set((state) => ({
        checkout: { 
          ...state.checkout, 
          discountPercent: validateDiscount(percent),
        },
      }));
    },

    // Set notes
    setNotes: (notes) => {
      set((state) => ({
        checkout: { ...state.checkout, notes },
      }));
    },

    // Set delivery notes
    setDeliveryNotes: (notes) => {
      set((state) => ({
        checkout: { ...state.checkout, deliveryNotes: notes },
      }));
    },

    // Reset checkout
    resetCheckout: () => {
      set({ 
        checkout: initialCheckout, 
        checkoutError: null,
        currentOrder: null,
      });
    },

    // Create order
    createOrder: async (cartItems: CartItem[]) => {
      const { checkout } = get();
      
      if (!checkout.customerId || !checkout.customerName) {
        throw new Error('Харилцагч сонгоно уу');
      }
      
      if (cartItems.length === 0) {
        throw new Error('Сагс хоосон байна');
      }

      set({ isCheckingOut: true, checkoutError: null });

      try {
        const orderItems = cartToOrderItems(cartItems);
        const summary = calculateOrderSummary(
          cartItems,
          checkout.discountPercent,
          false,
          0
        );

        const now = new Date().toISOString();
        
        const newOrder: Order = {
          id: `order-${Date.now()}`,
          orderNumber: generateOrderNumber(),
          erpOrderId: null,
          
          customerId: checkout.customerId,
          customerName: checkout.customerName,
          customerPhone: checkout.customerPhone,
          customerAddress: checkout.customerAddress,
          
          items: orderItems,
          
          subtotal: summary.subtotal,
          discountPercent: summary.discountPercent,
          discountAmount: summary.discountAmount,
          taxAmount: summary.taxAmount,
          deliveryFee: summary.deliveryFee,
          total: summary.total,
          formattedTotal: summary.formattedTotal,
          
          paymentMethod: checkout.paymentMethod,
          paymentStatus: 'unpaid',
          paidAmount: 0,
          remainingAmount: summary.total,
          
          status: 'draft',
          
          notes: checkout.notes,
          deliveryNotes: checkout.deliveryNotes,
          
          createdAt: now,
          updatedAt: now,
          confirmedAt: null,
          deliveredAt: null,
          
          syncedToERP: false,
          syncError: null,
        };

        set((state) => ({
          orders: [newOrder, ...state.orders],
          currentOrder: newOrder,
          isCheckingOut: false,
          checkout: initialCheckout,
        }));

        return newOrder;
      } catch (error: any) {
        set({ 
          isCheckingOut: false, 
          checkoutError: error.message || 'Захиалга үүсгэхэд алдаа гарлаа',
        });
        throw error;
      }
    },

    // Confirm order
    confirmOrder: async (orderId: string) => {
      const order = get().getOrderById(orderId);
      if (!order) throw new Error('Захиалга олдсонгүй');

      const now = new Date().toISOString();
      
      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === orderId
            ? { 
                ...o, 
                status: 'pending' as OrderStatus, 
                confirmedAt: now,
                updatedAt: now,
              }
            : o
        ),
      }));
    },

    // Cancel order
    cancelOrder: (orderId: string) => {
      const order = get().getOrderById(orderId);
      if (!order) return;
      
      if (order.status === 'delivered') {
        throw new Error('Хүргэгдсэн захиалгыг цуцлах боломжгүй');
      }

      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === orderId
            ? { 
                ...o, 
                status: 'cancelled' as OrderStatus,
                updatedAt: new Date().toISOString(),
              }
            : o
        ),
      }));
    },

    // Record payment
    recordPayment: (orderId: string, amount: number, method: PaymentMethod) => {
      const order = get().getOrderById(orderId);
      if (!order) return;

      const newPaidAmount = order.paidAmount + amount;
      const newRemainingAmount = calculateRemainingAmount(order.total, newPaidAmount);
      const newPaymentStatus = getPaymentStatus(order.total, newPaidAmount);

      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === orderId
            ? { 
                ...o, 
                paidAmount: newPaidAmount,
                remainingAmount: newRemainingAmount,
                paymentStatus: newPaymentStatus,
                paymentMethod: method,
                updatedAt: new Date().toISOString(),
              }
            : o
        ),
      }));
    },

    // Sync order to ERP
    syncOrderToERP: async (orderId: string, apiClient: ERPApiClient) => {
      const order = get().getOrderById(orderId);
      if (!order) return false;
      if (order.syncedToERP) return true;

      set({ isSyncing: true, syncError: null });

      try {
        const payload: ERPOrderPayload = {
          partnerId: order.customerId,
          orderDate: order.createdAt,
          items: order.items.map((item) => ({
            nomenclatureId: item.productId,
            quantity: item.quantity,
            price: item.unitPrice,
            amount: item.totalPrice,
          })),
          discountPercent: order.discountPercent,
          total: order.total,
          notes: order.notes,
          paymentMethod: order.paymentMethod,
        };

        const result = await apiClient.createOrder(payload);

        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId
              ? { 
                  ...o, 
                  syncedToERP: true,
                  erpOrderId: result.orderId,
                  syncError: null,
                  updatedAt: new Date().toISOString(),
                }
              : o
          ),
          isSyncing: false,
        }));

        return true;
      } catch (error: any) {
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId
              ? { ...o, syncError: error.message }
              : o
          ),
          isSyncing: false,
          syncError: error.message,
        }));
        return false;
      }
    },

    // Sync pending orders
    syncPendingOrders: async (apiClient: ERPApiClient) => {
      const pendingOrders = get().getUnsyncedOrders();
      
      for (const order of pendingOrders) {
        await get().syncOrderToERP(order.id, apiClient);
      }
    },

    // Get order by ID
    getOrderById: (orderId: string) => {
      return get().orders.find((o) => o.id === orderId);
    },

    // Get orders by status
    getOrdersByStatus: (status: OrderStatus) => {
      return get().orders.filter((o) => o.status === status);
    },

    // Get orders by customer
    getOrdersByCustomer: (customerId: string) => {
      return get().orders.filter((o) => o.customerId === customerId);
    },

    // Set orders (hydration)
    setOrders: (orders: Order[]) => {
      set({ orders });
    },

    // Set checkout (hydration)
    setCheckout: (checkout: CheckoutDraft) => {
      set({ checkout });
    },

    // Get order summary
    getOrderSummary: (cartItems: CartItem[]): OrderSummary => {
      const { checkout } = get();
      return calculateOrderSummary(cartItems, checkout.discountPercent, false, 0);
    },

    // Get pending orders
    getPendingOrders: () => {
      return get().orders.filter((o) => o.status === 'pending');
    },

    // Get unsynced orders
    getUnsyncedOrders: () => {
      return get().orders.filter(
        (o) => !o.syncedToERP && o.status !== 'cancelled' && o.status !== 'draft'
      );
    },

    // Get today's orders
    getTodaysOrders: () => {
      const today = new Date().toISOString().split('T')[0];
      return get().orders.filter((o) => o.createdAt.startsWith(today));
    },

    // Get order stats
    getOrderStats: (): OrderStats => {
      const { orders } = get();
      const todaysOrders = get().getTodaysOrders();
      
      return {
        totalOrders: orders.length,
        todaysOrders: todaysOrders.length,
        todaysRevenue: todaysOrders.reduce((sum, o) => sum + o.total, 0),
        pendingCount: orders.filter((o) => o.status === 'pending').length,
        unsyncedCount: get().getUnsyncedOrders().length,
      };
    },
  }));
}

// ============ Default Store Instance ============

export const checkoutStore = createCheckoutStore();

// ============ React Hook ============

export function useCheckoutStore(): CheckoutStore;
export function useCheckoutStore<T>(selector: (state: CheckoutStore) => T): T;
export function useCheckoutStore<T>(selector?: (state: CheckoutStore) => T) {
  return useStore(checkoutStore, selector!);
}

// ============ Selectors ============

export const selectOrders = (state: CheckoutStore) => state.orders;
export const selectCurrentOrder = (state: CheckoutStore) => state.currentOrder;
export const selectCheckout = (state: CheckoutStore) => state.checkout;
export const selectIsCheckingOut = (state: CheckoutStore) => state.isCheckingOut;
export const selectCheckoutError = (state: CheckoutStore) => state.checkoutError;
