/**
 * ERP API Client
 * Communicates with 1C ERP REST API
 */

import { getApiConfig, getErpAuthHeader } from '../config';

// ============ Types ============

export interface ERPRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface ERPResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface ERPPaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============ Product Types ============

export interface ERPProduct {
  nomenclatureId: string;
  nomenclatureCode: string;
  nomenclatureName: string;
  basePrice: number;
  remainCount: number;
  photoUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
}

export interface ERPProductsParams {
  page?: number;
  pageSize?: number;
  warehouseId: string;
  priceTypeId: string;
  article?: string;
  categoryId?: string;
}

// ============ Partner Types ============

export interface ERPPartner {
  partnerId: string;
  partnerName: string;
  partnerINN: string | null;
  partnerPhone: string | null;
  partnerAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  balance: number;
}

export interface ERPPartnersParams {
  page?: number;
  pageSize?: number;
  routeId: string;
  name?: string;
}

// ============ Order Types ============

export interface ERPOrderItem {
  nomenclatureId: string;
  quantity: number;
  price: number;
  amount: number;
}

export interface ERPOrderPayload {
  partnerId: string;
  orderDate: string;
  items: ERPOrderItem[];
  discountPercent: number;
  total: number;
  notes: string | null;
  paymentMethod: string;
}

export interface ERPOrderResponse {
  success: boolean;
  orderId: string;
  orderNumber: string;
}

// ============ Client Class ============

export class ERPApiClient {
  private baseUrl: string;
  private proxyUrl?: string;
  
  constructor(options?: { proxyUrl?: string }) {
    const config = getApiConfig();
    this.baseUrl = config.erpBaseUrl;
    this.proxyUrl = options?.proxyUrl;
  }

  private getUrl(path: string): string {
    // Use proxy if available (for web to avoid CORS)
    if (this.proxyUrl) {
      return `${this.proxyUrl}/${path}`;
    }
    return `${this.baseUrl}/${path}`;
  }

  private buildQueryString(params?: Record<string, string | number | boolean | undefined>): string {
    if (!params) return '';
    
    const filtered = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    
    return filtered.length > 0 ? `?${filtered.join('&')}` : '';
  }

  async request<T>(path: string, options: ERPRequestOptions = {}): Promise<T> {
    const { method = 'GET', params, body, headers = {} } = options;
    
    const url = this.getUrl(path) + this.buildQueryString(params);
    
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Only add auth header if not using proxy (proxy adds it server-side)
    if (!this.proxyUrl) {
      requestHeaders['Authorization'] = getErpAuthHeader();
    }

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`ERP API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // ============ Products ============

  async getProducts(params: ERPProductsParams): Promise<ERPPaginatedResponse<ERPProduct>> {
    const response = await this.request<{
      data: ERPProduct[];
      total: number;
      page: number;
      pageSize: number;
    }>('pr/Products', {
      params: {
        page: params.page || 1,
        pageSize: params.pageSize || 20,
        warehouseId: params.warehouseId,
        priceTypeId: params.priceTypeId,
        article: params.article,
        categoryId: params.categoryId,
      },
    });

    return {
      success: true,
      data: response.data || [],
      total: response.total || 0,
      page: response.page || 1,
      pageSize: response.pageSize || 20,
      hasMore: (response.page || 1) * (response.pageSize || 20) < (response.total || 0),
    };
  }

  async getProductById(productId: string, warehouseId: string, priceTypeId: string): Promise<ERPProduct | null> {
    try {
      const response = await this.request<ERPProduct>(`pr/Products/${productId}`, {
        params: { warehouseId, priceTypeId },
      });
      return response;
    } catch {
      return null;
    }
  }

  // ============ Partners ============

  async getPartners(params: ERPPartnersParams): Promise<ERPPaginatedResponse<ERPPartner>> {
    const response = await this.request<{
      data: ERPPartner[];
      total: number;
      page: number;
      pageSize: number;
    }>('cl/Companies', {
      params: {
        page: params.page || 1,
        pageSize: params.pageSize || 20,
        routeId: params.routeId,
        name: params.name,
      },
    });

    return {
      success: true,
      data: response.data || [],
      total: response.total || 0,
      page: response.page || 1,
      pageSize: response.pageSize || 20,
      hasMore: (response.page || 1) * (response.pageSize || 20) < (response.total || 0),
    };
  }

  async getPartnerById(partnerId: string): Promise<ERPPartner | null> {
    try {
      const response = await this.request<ERPPartner>(`cl/Companies/${partnerId}`);
      return response;
    } catch {
      return null;
    }
  }

  // ============ Orders ============

  async createOrder(payload: ERPOrderPayload): Promise<ERPOrderResponse> {
    return this.request<ERPOrderResponse>('ord/Orders', {
      method: 'POST',
      body: payload,
    });
  }

  async getOrders(params: { page?: number; pageSize?: number }): Promise<ERPPaginatedResponse<any>> {
    return this.request('ord/Orders', {
      params: {
        page: params.page || 1,
        pageSize: params.pageSize || 20,
      },
    });
  }
}

// ============ Singleton Instance ============

let erpClient: ERPApiClient | null = null;

export function getERPClient(options?: { proxyUrl?: string }): ERPApiClient {
  if (!erpClient) {
    erpClient = new ERPApiClient(options);
  }
  return erpClient;
}

export function resetERPClient() {
  erpClient = null;
}

export default ERPApiClient;
