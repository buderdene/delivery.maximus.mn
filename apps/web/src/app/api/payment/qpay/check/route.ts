/**
 * QPay Check Payment API
 * POST /api/payment/qpay/check - Check payment status
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkPayment } from '@/lib/qpay';
import type { CheckPaymentRequest } from '@/types/payment';

export async function POST(request: NextRequest) {
  try {
    const body: CheckPaymentRequest = await request.json();
    
    const { invoiceId } = body;
    
    // Validation
    if (!invoiceId || typeof invoiceId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'invoiceId is required' },
        { status: 400 }
      );
    }
    
    // Check payment status
    const result = await checkPayment(invoiceId);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      paid: result.paid,
      paidAmount: result.paidAmount,
      paymentCount: result.paymentCount,
    });
    
  } catch (error) {
    console.error('[API] QPay check error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
