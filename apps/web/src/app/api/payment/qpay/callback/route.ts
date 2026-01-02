/**
 * QPay Callback API (Webhook)
 * POST /api/payment/qpay/callback - QPay sends payment notification here
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkPayment } from '@/lib/qpay';

export async function POST(request: NextRequest) {
  try {
    // Log callback data for debugging
    const body = await request.json().catch(() => ({}));
    const orderCode = request.nextUrl.searchParams.get('order_code');
    
    console.log('[QPay Callback] Received:', {
      orderCode,
      body,
      headers: Object.fromEntries(request.headers.entries()),
    });
    
    // TODO: In production, verify callback signature if QPay provides one
    
    // TODO: Update order status in database
    // Example:
    // if (orderCode) {
    //   const order = await db.order.findUnique({ where: { code: orderCode } });
    //   if (order && order.qpayInvoiceId) {
    //     const result = await checkPayment(order.qpayInvoiceId);
    //     if (result.paid) {
    //       await db.order.update({
    //         where: { code: orderCode },
    //         data: { status: 'paid', paidAt: new Date() }
    //       });
    //     }
    //   }
    // }
    
    // Always return success to QPay
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[QPay Callback] Error:', error);
    // Still return success to prevent QPay from retrying
    return NextResponse.json({ success: true });
  }
}

// Also handle GET for testing
export async function GET(request: NextRequest) {
  const orderCode = request.nextUrl.searchParams.get('order_code');
  
  return NextResponse.json({
    message: 'QPay callback endpoint',
    orderCode,
    timestamp: new Date().toISOString(),
  });
}
