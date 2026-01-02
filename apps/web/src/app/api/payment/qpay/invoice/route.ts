/**
 * QPay Invoice API
 * POST /api/payment/qpay/invoice - Create invoice
 */

import { NextRequest, NextResponse } from 'next/server';
import { createInvoice } from '@/lib/qpay';
import type { CreateInvoiceRequest } from '@/types/payment';

export async function POST(request: NextRequest) {
  try {
    const body: CreateInvoiceRequest = await request.json();
    
    const { orderCode, amount, description, partnerName } = body;
    
    // Validation
    if (!orderCode || typeof orderCode !== 'string') {
      return NextResponse.json(
        { success: false, error: 'orderCode is required' },
        { status: 400 }
      );
    }
    
    if (!amount || typeof amount !== 'number' || amount < 1) {
      return NextResponse.json(
        { success: false, error: 'amount must be a positive number' },
        { status: 400 }
      );
    }
    
    // Create invoice description
    const invoiceDescription = description || 
      (partnerName ? `${partnerName} - Захиалга: ${orderCode}` : `B2B Захиалга: ${orderCode}`);
    
    // Create QPay invoice
    const result = await createInvoice(orderCode, amount, invoiceDescription);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      invoiceId: result.invoiceId,
      qrText: result.qrText,
      qrImage: result.qrImage,
      shortUrl: result.shortUrl,
      urls: result.urls,
    });
    
  } catch (error) {
    console.error('[API] QPay invoice error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
