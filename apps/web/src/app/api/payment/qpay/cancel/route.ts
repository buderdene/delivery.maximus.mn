/**
 * QPay Cancel Invoice API
 * POST /api/payment/qpay/cancel - Cancel invoice
 */

import { NextRequest, NextResponse } from 'next/server';
import { cancelInvoice } from '@/lib/qpay';
import type { CancelInvoiceRequest } from '@/types/payment';

export async function POST(request: NextRequest) {
  try {
    const body: CancelInvoiceRequest = await request.json();
    
    const { invoiceId } = body;
    
    // Validation
    if (!invoiceId || typeof invoiceId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'invoiceId is required' },
        { status: 400 }
      );
    }
    
    // Cancel invoice
    const result = await cancelInvoice(invoiceId);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[API] QPay cancel error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
