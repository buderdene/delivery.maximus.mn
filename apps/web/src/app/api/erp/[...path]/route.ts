/**
 * ERP API Proxy Route
 * Proxies requests to 1C ERP to avoid CORS issues
 * Uses Basic Auth from environment variables
 * Includes SQLite caching for improved performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getCache, 
  setCache, 
  generateCacheKey, 
  CACHE_CONFIG 
} from '@/lib/cache';

const ERP_BASE_URL = process.env.ERP1C_BASE_URL || 'http://203.21.120.60:8080/maximus_trade';
const ERP_USERNAME = process.env.ERP1C_USERNAME || 'TestAPI';
const ERP_PASSWORD = process.env.ERP1C_PASSWORD || 'jI9da0zu';

// Create Basic Auth header
const basicAuth = Buffer.from(`${ERP_USERNAME}:${ERP_PASSWORD}`).toString('base64');

// Determine cache TTL based on endpoint
function getCacheTTL(pathString: string): number {
  if (pathString.includes('ct/Categories')) return CACHE_CONFIG.categories;
  if (pathString.includes('br/Brands')) return CACHE_CONFIG.brands;
  if (pathString.includes('pr/Products')) return CACHE_CONFIG.products;
  if (pathString.includes('cl/Companies')) return CACHE_CONFIG.partners;
  return CACHE_CONFIG.default;
}

// Check if endpoint should be cached (only GET requests for read-only data)
function shouldCache(pathString: string): boolean {
  const cacheableEndpoints = [
    'ct/Categories',
    'br/Brands', 
    'pr/Products',
    'cl/Companies',
  ];
  return cacheableEndpoints.some(ep => pathString.includes(ep));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${ERP_BASE_URL}/hs/${pathString}${searchParams ? `?${searchParams}` : ''}`;

  // Check cache first for cacheable endpoints
  if (shouldCache(pathString)) {
    const cacheKey = generateCacheKey(pathString, Object.fromEntries(request.nextUrl.searchParams));
    const cached = getCache(cacheKey);
    
    if (cached) {
      console.log(`[ERP API] Cache HIT: ${pathString}`);
      return NextResponse.json(cached, {
        headers: {
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
        }
      });
    }
    console.log(`[ERP API] Cache MISS: ${pathString}`);
  }

  try {
    const startTime = Date.now();
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
      },
    });

    const fetchTime = Date.now() - startTime;
    console.log(`[ERP API] Fetch: ${pathString} - ${fetchTime}ms`);

    if (!response.ok) {
      return NextResponse.json(
        { error: `ERP Error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Cache the response for cacheable endpoints
    if (shouldCache(pathString)) {
      const cacheKey = generateCacheKey(pathString, Object.fromEntries(request.nextUrl.searchParams));
      const ttl = getCacheTTL(pathString);
      setCache(cacheKey, data, ttl);
      
      return NextResponse.json(data, {
        headers: {
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey,
          'X-Cache-TTL': String(ttl),
          'X-Fetch-Time': `${fetchTime}ms`,
        }
      });
    }
    
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
