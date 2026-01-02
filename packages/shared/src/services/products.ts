/**
 * Products Service - REST API
 * ERP: http://203.21.120.60:8080/maximus_trade_test/hs
 */

import { getApiConfig } from './config';
import type { Product, Category, PaginatorInfo, ProductFilters } from '../types';

// ERP API Response Types
interface ERPProduct {
  uuid: string;
  name: string;
  article: string;
  barcode: string;
  categoryId: string;
  categoryName: string;
  brandId: string;
  brandName: string;
  uomId: string;
  uomName: string;
  price: number;
  cost: number;
  qty: number;
  image: string;
}

interface ERPProductsResponse {
  products: ERPProduct[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

interface ERPCategory {
  uuid: string;
  name: string;
  parentId: string;
}

// Helpers
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('mn-MN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price) + '₮';
}

export function getStockStatus(stock: number): 'out_of_stock' | 'low_stock' | 'in_stock' {
  if (stock <= 0) return 'out_of_stock';
  if (stock <= 10) return 'low_stock';
  return 'in_stock';
}

export function getImageUrl(image: string | null): string | null {
  if (!image) return null;
  if (image.startsWith('http')) return image;
  return `data:image/jpeg;base64,${image}`;
}

export function mapERPProduct(raw: ERPProduct): Product {
  const price = raw.price || 0;
  const stock = raw.qty || 0;

  return {
    id: raw.uuid,
    uuid: raw.uuid,
    name: raw.name,
    article: raw.article,
    barcode: raw.barcode,
    description: null,
    price,
    cost: raw.cost,
    current_stock: stock,
    category: raw.categoryName,
    brand: raw.brandName,
    main_image: raw.image,
    main_image_url: getImageUrl(raw.image),
    uom: raw.uomName ? { id: raw.uomId, name: raw.uomName, factor: 1 } : null,
    images: [],
    created_at: null,
    updated_at: null,
    stock_status: getStockStatus(stock),
    formatted_price: formatPrice(price),
  };
}

export async function getProducts(
  token: string | null,
  filters?: ProductFilters,
  warehouseId?: string,
  routeId?: string
): Promise<{
  success: boolean;
  data?: Product[];
  paginatorInfo?: PaginatorInfo;
  error?: string;
}> {
  const { erpUrl } = getApiConfig();
  
  const params = new URLSearchParams({
    page: String(filters?.page || 1),
    pageSize: String(filters?.perPage || 100),
  });
  
  if (warehouseId) params.append('warehouseId', warehouseId);
  if (routeId) params.append('routeId', routeId);
  if (filters?.categoryId) params.append('categoryId', filters.categoryId);

  try {
    const response = await fetch(`${erpUrl}/pr/Products?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data: ERPProductsResponse = await response.json();

    return {
      success: true,
      data: data.products.map(mapERPProduct),
      paginatorInfo: {
        total: data.totalRecords,
        currentPage: data.page,
        lastPage: data.totalPages,
        perPage: data.pageSize,
        hasMorePages: data.page < data.totalPages,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Сүлжээний алдаа',
    };
  }
}

export async function getCategories(token: string | null): Promise<{
  success: boolean;
  data?: Category[];
  error?: string;
}> {
  const { erpUrl } = getApiConfig();

  try {
    const response = await fetch(`${erpUrl}/ct/Categories`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data: ERPCategory[] = await response.json();

    return {
      success: true,
      data: data.map((c) => ({
        id: c.uuid,
        uuid: c.uuid,
        name: c.name,
        productsCount: 0,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Сүлжээний алдаа',
    };
  }
}
