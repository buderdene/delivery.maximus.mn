/**
 * Commerce Logic
 * Business logic for pricing, validation, calculations
 */

import type { CartItem, OrderItem, CartValidation, OrderSummary, StockStatus } from '../types';

// ============ Constants ============

export const COMMERCE_CONFIG = {
  // Хамгийн бага захиалгын дүн
  MIN_ORDER_AMOUNT: 50000,
  
  // Нэг барааны хамгийн их тоо
  MAX_ITEM_QUANTITY: 1000,
  
  // Нийт барааны төрөл
  MAX_CART_ITEMS: 100,
  
  // Бага үлдэгдлийн босго
  LOW_STOCK_THRESHOLD: 10,
  
  // НӨАТ хувь
  TAX_RATE: 0.10,
  
  // Default page size
  DEFAULT_PAGE_SIZE: 20,
  
  // Max page size
  MAX_PAGE_SIZE: 100,
} as const;

// ============ Formatting ============

/**
 * Format price in MNT
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('mn-MN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price) + '₮';
}

/**
 * Format number with thousand separators
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('mn-MN').format(num);
}

/**
 * Format balance (negative = өртэй, positive = авлагатай)
 */
export function formatBalance(balance: number): string {
  const formatted = formatPrice(Math.abs(balance));
  if (balance < 0) return `-${formatted}`;
  if (balance > 0) return `+${formatted}`;
  return formatted;
}

// ============ Stock Logic ============

/**
 * Determine stock status based on quantity
 */
export function getStockStatus(stock: number): StockStatus {
  if (stock <= 0) return 'out_of_stock';
  if (stock < COMMERCE_CONFIG.LOW_STOCK_THRESHOLD) return 'low_stock';
  return 'in_stock';
}

/**
 * Check if product can be added to cart
 */
export function canAddToCart(stock: number, currentCartQty: number = 0): boolean {
  return stock > 0 && currentCartQty < stock;
}

/**
 * Get maximum addable quantity
 */
export function getMaxAddableQuantity(stock: number, currentCartQty: number = 0): number {
  return Math.max(0, stock - currentCartQty);
}

// ============ Cart Calculations ============

/**
 * Calculate cart totals
 */
export function calculateCartTotals(items: CartItem[]) {
  const itemCount = items.length;
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  return {
    itemCount,
    totalItems,
    subtotal,
    formattedSubtotal: formatPrice(subtotal),
    isEmpty: items.length === 0,
  };
}

/**
 * Validate cart before checkout
 */
export function validateCart(items: CartItem[], totalAmount: number): CartValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if cart is empty
  if (items.length === 0) {
    errors.push('Сагс хоосон байна');
  }

  // Check minimum order amount
  if (totalAmount < COMMERCE_CONFIG.MIN_ORDER_AMOUNT) {
    errors.push(`Хамгийн бага захиалгын дүн ${formatPrice(COMMERCE_CONFIG.MIN_ORDER_AMOUNT)}`);
  }

  // Check maximum items
  if (items.length > COMMERCE_CONFIG.MAX_CART_ITEMS) {
    errors.push(`Хамгийн олон ${COMMERCE_CONFIG.MAX_CART_ITEMS} төрлийн бараа нэмэх боломжтой`);
  }

  // Check each item
  items.forEach((item) => {
    // Check stock availability
    if (item.quantity > item.maxQuantity) {
      errors.push(`"${item.name}" барааны үлдэгдэл хүрэлцэхгүй байна`);
    }
    
    // Check max quantity per item
    if (item.quantity > COMMERCE_CONFIG.MAX_ITEM_QUANTITY) {
      errors.push(`"${item.name}" барааны тоо хэтэрсэн байна`);
    }
    
    // Warn about low stock
    if (item.maxQuantity <= COMMERCE_CONFIG.LOW_STOCK_THRESHOLD && item.maxQuantity > 0) {
      warnings.push(`"${item.name}" барааны үлдэгдэл цөөн байна`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============ Order Calculations ============

/**
 * Calculate order summary with discount
 */
export function calculateOrderSummary(
  items: CartItem[],
  discountPercent: number = 0,
  includeTax: boolean = false,
  deliveryFee: number = 0
): OrderSummary {
  const { itemCount, totalItems, subtotal } = calculateCartTotals(items);
  
  // Calculate discount
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  
  // Calculate tax (НӨАТ)
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = includeTax ? Math.round(taxableAmount * COMMERCE_CONFIG.TAX_RATE) : 0;
  
  // Calculate total
  const total = subtotal - discountAmount + taxAmount + deliveryFee;
  
  return {
    itemCount,
    totalItems,
    subtotal,
    formattedSubtotal: formatPrice(subtotal),
    discountPercent,
    discountAmount,
    formattedDiscount: formatPrice(discountAmount),
    taxAmount,
    formattedTax: formatPrice(taxAmount),
    deliveryFee,
    formattedDeliveryFee: formatPrice(deliveryFee),
    total,
    formattedTotal: formatPrice(total),
  };
}

/**
 * Convert cart items to order items
 */
export function cartToOrderItems(cartItems: CartItem[]): OrderItem[] {
  return cartItems.map((item) => ({
    id: `order-item-${item.productId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productId: item.productId,
    productName: item.name,
    article: item.article,
    quantity: item.quantity,
    unitPrice: item.price,
    totalPrice: item.price * item.quantity,
    imageUrl: item.imageUrl,
  }));
}

/**
 * Generate order number
 */
export function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${year}${month}${day}-${random}`;
}

// ============ Payment Calculations ============

/**
 * Calculate remaining amount after payment
 */
export function calculateRemainingAmount(total: number, paidAmount: number): number {
  return Math.max(0, total - paidAmount);
}

/**
 * Determine payment status based on amounts
 */
export function getPaymentStatus(total: number, paidAmount: number): 'unpaid' | 'partial' | 'paid' {
  if (paidAmount >= total) return 'paid';
  if (paidAmount > 0) return 'partial';
  return 'unpaid';
}

// ============ Validation Helpers ============

/**
 * Validate discount percent
 */
export function validateDiscount(percent: number): number {
  return Math.max(0, Math.min(100, percent));
}

/**
 * Validate quantity
 */
export function validateQuantity(quantity: number, maxQuantity: number): number {
  return Math.max(0, Math.min(quantity, maxQuantity, COMMERCE_CONFIG.MAX_ITEM_QUANTITY));
}

// ============ Export ============

export default {
  COMMERCE_CONFIG,
  formatPrice,
  formatNumber,
  formatBalance,
  getStockStatus,
  canAddToCart,
  getMaxAddableQuantity,
  calculateCartTotals,
  validateCart,
  calculateOrderSummary,
  cartToOrderItems,
  generateOrderNumber,
  calculateRemainingAmount,
  getPaymentStatus,
  validateDiscount,
  validateQuantity,
};
