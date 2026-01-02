/**
 * QPay Payment Service
 * 
 * QPay v2 API integration for B2B Sales platform
 * Based on kiosk project implementation
 * 
 * Docs: https://developer.qpay.mn/
 */

import type {
  QPayTokenResponse,
  QPayCreateInvoiceRequest,
  QPayInvoiceResponse,
  QPayCheckPaymentResponse,
  CreateInvoiceResponse,
  CheckPaymentResponse,
  CancelInvoiceResponse,
} from '@/types/payment';

// ============ Configuration ============

const QPAY_CONFIG = {
  // Sandbox or Production URL
  baseUrl: process.env.QPAY_BASE_URL || 'https://merchant-sandbox.qpay.mn',
  username: process.env.QPAY_USERNAME || 'TEST_MERCHANT',
  password: process.env.QPAY_PASSWORD || '123456',
  invoiceCode: process.env.QPAY_INVOICE_CODE || 'TEST_INVOICE',
  callbackUrl: process.env.QPAY_CALLBACK_URL || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payment/qpay/callback`,
};

// Token cache (in-memory, server-side only)
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

// ============ Helper Functions ============

/**
 * Get access token (cached)
 */
async function getAccessToken(): Promise<string | null> {
  const now = Date.now();
  
  // Check if cached token is still valid (with 5 min buffer)
  if (cachedToken && cachedToken.expiresAt > now + 5 * 60 * 1000) {
    return cachedToken.accessToken;
  }
  
  try {
    const credentials = Buffer.from(`${QPAY_CONFIG.username}:${QPAY_CONFIG.password}`).toString('base64');
    
    const response = await fetch(`${QPAY_CONFIG.baseUrl}/v2/auth/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('[QPay] Failed to get access token:', response.status, await response.text());
      return null;
    }
    
    const data: QPayTokenResponse = await response.json();
    
    // Cache token (expires_in is in seconds)
    cachedToken = {
      accessToken: data.access_token,
      expiresAt: now + data.expires_in * 1000,
    };
    
    console.log('[QPay] Access token fetched successfully');
    return data.access_token;
    
  } catch (error) {
    console.error('[QPay] Error fetching access token:', error);
    return null;
  }
}

/**
 * Clear cached access token (call when token is expired)
 */
function clearAccessToken(): void {
  cachedToken = null;
}

// ============ Public API ============

/**
 * Create QPay Invoice
 * 
 * @param orderCode - Order/Invoice code
 * @param amount - Amount in MNT
 * @param description - Invoice description
 * @param receiverData - Optional receiver data
 */
export async function createInvoice(
  orderCode: string,
  amount: number,
  description?: string,
  receiverData?: { register?: string; name?: string; email?: string; phone?: string }
): Promise<CreateInvoiceResponse> {
  const token = await getAccessToken();
  
  if (!token) {
    return {
      success: false,
      error: 'Failed to authenticate with QPay',
    };
  }
  
  try {
    const payload: QPayCreateInvoiceRequest = {
      invoice_code: QPAY_CONFIG.invoiceCode,
      sender_invoice_no: orderCode,
      invoice_receiver_code: 'terminal',
      invoice_description: description || `B2B Order: ${orderCode}`,
      amount: Math.round(amount), // Must be integer
      callback_url: `${QPAY_CONFIG.callbackUrl}?order_code=${orderCode}`,
    };
    
    if (receiverData) {
      payload.invoice_receiver_data = receiverData;
    }
    
    console.log('[QPay] Creating invoice:', { orderCode, amount });
    
    const response = await fetch(`${QPAY_CONFIG.baseUrl}/v2/invoice`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (response.status === 401) {
      // Token expired, clear and retry once
      clearAccessToken();
      console.log('[QPay] Token expired, retrying...');
      return createInvoice(orderCode, amount, description, receiverData);
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[QPay] Failed to create invoice:', response.status, errorText);
      return {
        success: false,
        error: `QPay error: ${response.status}`,
      };
    }
    
    const data: QPayInvoiceResponse = await response.json();
    
    console.log('[QPay] Invoice created:', { invoiceId: data.invoice_id, orderCode });
    
    return {
      success: true,
      invoiceId: data.invoice_id,
      qrText: data.qr_text,
      qrImage: data.qr_image,
      shortUrl: data.qPay_shortUrl,
      urls: data.urls,
    };
    
  } catch (error) {
    console.error('[QPay] Error creating invoice:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check payment status
 * 
 * @param invoiceId - QPay invoice ID
 */
export async function checkPayment(invoiceId: string): Promise<CheckPaymentResponse> {
  const token = await getAccessToken();
  
  if (!token) {
    return {
      success: false,
      paid: false,
      error: 'Failed to authenticate with QPay',
    };
  }
  
  try {
    const payload = {
      object_type: 'INVOICE',
      object_id: invoiceId,
      offset: {
        page_number: 1,
        page_limit: 100,
      },
    };
    
    const response = await fetch(`${QPAY_CONFIG.baseUrl}/v2/payment/check`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (response.status === 401) {
      clearAccessToken();
      return checkPayment(invoiceId);
    }
    
    if (!response.ok) {
      console.error('[QPay] Failed to check payment:', response.status);
      return {
        success: false,
        paid: false,
        error: 'Failed to check payment status',
      };
    }
    
    const data: QPayCheckPaymentResponse = await response.json();
    
    // Check if any payment is PAID
    let paid = false;
    let paidAmount = 0;
    
    for (const payment of data.rows || []) {
      if (payment.payment_status === 'PAID') {
        paid = true;
        paidAmount += payment.payment_amount;
      }
    }
    
    return {
      success: true,
      paid,
      paidAmount,
      paymentCount: data.count || 0,
    };
    
  } catch (error) {
    console.error('[QPay] Error checking payment:', error);
    return {
      success: false,
      paid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Cancel invoice
 * 
 * @param invoiceId - QPay invoice ID
 */
export async function cancelInvoice(invoiceId: string): Promise<CancelInvoiceResponse> {
  const token = await getAccessToken();
  
  if (!token) {
    return {
      success: false,
      error: 'Failed to authenticate with QPay',
    };
  }
  
  try {
    const response = await fetch(`${QPAY_CONFIG.baseUrl}/v2/invoice/${invoiceId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (response.status === 401) {
      clearAccessToken();
      return cancelInvoice(invoiceId);
    }
    
    if (!response.ok) {
      console.error('[QPay] Failed to cancel invoice:', response.status);
      return {
        success: false,
        error: 'Failed to cancel invoice',
      };
    }
    
    console.log('[QPay] Invoice cancelled:', invoiceId);
    
    return { success: true };
    
  } catch (error) {
    console.error('[QPay] Error cancelling invoice:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get QPay configuration (for debugging)
 */
export function getQPayConfig() {
  return {
    baseUrl: QPAY_CONFIG.baseUrl,
    invoiceCode: QPAY_CONFIG.invoiceCode,
    callbackUrl: QPAY_CONFIG.callbackUrl,
    // Don't expose credentials
    hasCredentials: !!(QPAY_CONFIG.username && QPAY_CONFIG.password),
  };
}
