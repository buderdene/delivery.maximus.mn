/**
 * Payment Types
 * QPay integration types for B2B Sales platform
 */

// ============ Payment Method Types ============

export type PaymentMethod = 'cash' | 'qpay' | 'card' | 'bank_transfer';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Бэлэн мөнгө',
  qpay: 'QPay',
  card: 'Карт',
  bank_transfer: 'Банкны шилжүүлэг',
};

// ============ QPay API Types ============

/**
 * QPay Access Token Response
 */
export interface QPayTokenResponse {
  token_type: string;
  refresh_expires_in: number;
  refresh_token: string;
  access_token: string;
  expires_in: number;
  scope: string;
  not_before_policy: string;
  session_state: string;
}

/**
 * QPay Invoice Create Request
 */
export interface QPayCreateInvoiceRequest {
  invoice_code: string;
  sender_invoice_no: string;
  invoice_receiver_code: string;
  invoice_description: string;
  amount: number;
  callback_url: string;
  invoice_receiver_data?: {
    register?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
}

/**
 * QPay Bank/App URL for payment
 */
export interface QPayUrl {
  name: string;
  description: string;
  logo: string;
  link: string;
}

/**
 * QPay Invoice Create Response
 */
export interface QPayInvoiceResponse {
  invoice_id: string;
  qr_text: string;
  qr_image: string;
  qPay_shortUrl: string;
  urls: QPayUrl[];
}

/**
 * QPay Payment Record
 */
export interface QPayPaymentRecord {
  payment_id: string;
  payment_status: 'NEW' | 'PAID' | 'FAILED' | 'REFUNDED';
  payment_date: string;
  payment_fee: number;
  payment_amount: number;
  payment_currency: string;
  payment_wallet: string;
  transaction_bank_code: string;
  transaction_type: string;
}

/**
 * QPay Check Payment Response
 */
export interface QPayCheckPaymentResponse {
  count: number;
  paid_amount: number;
  rows: QPayPaymentRecord[];
}

/**
 * QPay Error Response
 */
export interface QPayErrorResponse {
  message: string;
  code: string;
}

// ============ App-level Types ============

/**
 * Invoice Create Request (from client)
 */
export interface CreateInvoiceRequest {
  orderCode: string;
  amount: number;
  description?: string;
  partnerName?: string;
}

/**
 * Invoice Create Response (to client)
 */
export interface CreateInvoiceResponse {
  success: boolean;
  invoiceId?: string;
  qrText?: string;
  qrImage?: string;
  shortUrl?: string;
  urls?: QPayUrl[];
  error?: string;
}

/**
 * Check Payment Request (from client)
 */
export interface CheckPaymentRequest {
  invoiceId: string;
}

/**
 * Check Payment Response (to client)
 */
export interface CheckPaymentResponse {
  success: boolean;
  paid: boolean;
  paidAmount?: number;
  paymentCount?: number;
  error?: string;
}

/**
 * Cancel Invoice Request
 */
export interface CancelInvoiceRequest {
  invoiceId: string;
}

/**
 * Cancel Invoice Response
 */
export interface CancelInvoiceResponse {
  success: boolean;
  error?: string;
}

// ============ Payment Status ============

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Хүлээгдэж буй',
  processing: 'Боловсруулж байна',
  paid: 'Төлөгдсөн',
  failed: 'Амжилтгүй',
  cancelled: 'Цуцлагдсан',
};
