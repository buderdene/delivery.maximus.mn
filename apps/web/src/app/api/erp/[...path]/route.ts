/**
 * ERP API Proxy Route
 * Proxies requests to 1C ERP to avoid CORS issues
 * Uses Basic Auth from environment variables
 */

import { NextRequest, NextResponse } from 'next/server';

const ERP_BASE_URL = process.env.ERP1C_BASE_URL || 'http://203.21.120.60:8080/maximus_trade';
const ERP_USERNAME = process.env.ERP1C_USERNAME || 'TestAPI';
const ERP_PASSWORD = process.env.ERP1C_PASSWORD || 'jI9da0zu';

// Create Basic Auth header
const basicAuth = Buffer.from(`${ERP_USERNAME}:${ERP_PASSWORD}`).toString('base64');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${ERP_BASE_URL}/hs/${pathString}${searchParams ? `?${searchParams}` : ''}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `ERP Error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('ERP Proxy Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'ERP connection failed' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${ERP_BASE_URL}/hs/${pathString}${searchParams ? `?${searchParams}` : ''}`;

  try {
    const body = await request.json();
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `ERP Error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('ERP Proxy Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'ERP connection failed' },
      { status: 500 }
    );
  }
}
