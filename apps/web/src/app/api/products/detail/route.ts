import { NextRequest, NextResponse } from 'next/server';

const ERP_BASE_URL = process.env.ERP1C_BASE_URL || 'http://203.21.120.60:8080/maximus_trade';
const ERP_USERNAME = process.env.ERP1C_USERNAME || 'TestAPI';
const ERP_PASSWORD = process.env.ERP1C_PASSWORD || 'jI9da0zu';

// Create Basic Auth header
const basicAuth = Buffer.from(`${ERP_USERNAME}:${ERP_PASSWORD}`).toString('base64');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');
    const priceTypeId = searchParams.get('priceTypeId');
    const uuid = searchParams.get('uuid');

    if (!warehouseId || !priceTypeId || !uuid) {
      return NextResponse.json(
        { error: 'Missing required parameters: warehouseId, priceTypeId, uuid' },
        { status: 400 }
      );
    }

    // Build the ERP API URL
    const erpUrl = `${ERP_BASE_URL}/hs/pds/Products?warehouseId=${warehouseId}&priceTypeId=${priceTypeId}&uuid=${uuid}`;
    
    console.log('[ProductDetail] Fetching from ERP:', erpUrl);

    const response = await fetch(erpUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[ProductDetail] ERP API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch product detail from ERP' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // The API returns an array with one product, extract the first one
    const product = Array.isArray(data) ? data[0] : data;
    
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    console.log('[ProductDetail] Product fetched:', product.name, 'Image URL:', product.imgUrl || product.image || product.imageUrl || product.main_image_url || 'NO IMAGE FIELD');

    return NextResponse.json(product);
  } catch (error) {
    console.error('[ProductDetail] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
