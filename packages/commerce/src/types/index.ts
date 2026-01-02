/**
 * Commerce Types
 * Shared types for Cart, Order, Checkout
 */

// ============ Product Types ============

export interface Product {
  id: string;
  name: string;
  article: string | null;
  barcode?: string | null;
  price: number;
  formatted_price: string;
  current_stock: number;
  stock_status: StockStatus;
  main_image_url: string | null;
  category: string | null;
  category_id?: string | null;
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

// ============ Cart Types ============

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

export interface CartValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CartSummary {
  itemCount: number;
  totalItems: number;
  subtotal: number;
  formattedSubtotal: string;
  isEmpty: boolean;
}

// ============ Order Types ============

export type OrderStatus = 
  | 'draft'         // Ноорог
  | 'pending'       // Хүлээгдэж буй
  | 'confirmed'     // Баталгаажсан
  | 'processing'    // Бэлтгэж буй
  | 'shipped'       // Хүргэгдэж буй
  | 'delivered'     // Хүргэгдсэн
  | 'cancelled';    // Цуцлагдсан

export type PaymentStatus = 
  | 'unpaid'        // Төлөгдөөгүй
  | 'partial'       // Хэсэгчлэн төлсөн
  | 'paid'          // Бүрэн төлсөн
  | 'refunded';     // Буцаагдсан

export type PaymentMethod = 
  | 'cash'          // Бэлэн мөнгө
  | 'qpay'          // QPay
  | 'bank_transfer' // Банк шилжүүлэг
  | 'credit';       // Зээлээр

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  article: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  erpOrderId: string | null;
  
  // Customer
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  
  // Items
  items: OrderItem[];
  
  // Amounts
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxAmount: number;
  deliveryFee: number;
  total: number;
  formattedTotal: string;
  
  // Payment
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  remainingAmount: number;
  
  // Status
  status: OrderStatus;
  
  // Notes
  notes: string | null;
  deliveryNotes: string | null;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  deliveredAt: string | null;
  
  // Sync
  syncedToERP: boolean;
  syncError: string | null;
}

// ============ Checkout Types ============

export interface CheckoutDraft {
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  paymentMethod: PaymentMethod;
  discountPercent: number;
  notes: string | null;
  deliveryNotes: string | null;
}

export interface CheckoutStep {
  id: 'customer' | 'review' | 'payment' | 'confirm';
  title: string;
  completed: boolean;
}

export interface OrderSummary {
  itemCount: number;
  totalItems: number;
  subtotal: number;
  formattedSubtotal: string;
  discountPercent: number;
  discountAmount: number;
  formattedDiscount: string;
  taxAmount: number;
  formattedTax: string;
  deliveryFee: number;
  formattedDeliveryFee: string;
  total: number;
  formattedTotal: string;
}

// ============ Customer Types ============

export interface Customer {
  id: string;
  name: string;
  tin?: string | null;
  phone: string | null;
  address: string | null;
  location?: {
    lat: number;
    lng: number;
  } | null;
  balance?: number;
  status?: 'active' | 'inactive' | 'blocked';
}

// ============ Constants ============

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'Ноорог',
  pending: 'Хүлээгдэж буй',
  confirmed: 'Баталгаажсан',
  processing: 'Бэлтгэж буй',
  shipped: 'Хүргэгдэж буй',
  delivered: 'Хүргэгдсэн',
  cancelled: 'Цуцлагдсан',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  draft: 'gray',
  pending: 'yellow',
  confirmed: 'blue',
  processing: 'orange',
  shipped: 'purple',
  delivered: 'green',
  cancelled: 'red',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Төлөгдөөгүй',
  partial: 'Хэсэгчлэн',
  paid: 'Төлөгдсөн',
  refunded: 'Буцаагдсан',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Бэлэн мөнгө',
  qpay: 'QPay',
  bank_transfer: 'Банк шилжүүлэг',
  credit: 'Зээлээр',
};

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: 'Байгаа',
  low_stock: 'Цөөн',
  out_of_stock: 'Дууссан',
};
