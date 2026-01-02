/**
 * Product Types
 * Shared between web and mobile
 */

export interface UOM {
  id: string;
  name: string;
  factor?: number;
}

export interface Product {
  id: string;
  uuid: string;
  name: string;
  article: string | null;
  barcode: string | null;
  description: string | null;
  price: number;
  cost: number | null;
  current_stock: number;
  category: string | null;
  brand: string | null;
  main_image: string | null;
  main_image_url: string | null;
  uom: UOM | null;
  images: string[];
  created_at: string | null;
  updated_at: string | null;
  stock_status: 'out_of_stock' | 'low_stock' | 'in_stock';
  formatted_price: string;
}

export interface ProductRaw {
  id: string;
  name: string;
  uuid: string;
  article: string | null;
  barcode: string | null;
  description: string | null;
  price: number | null;
  cost: number | null;
  current_stock: number | null;
  category: string | null;
  brand: string | null;
  main_image: string | null;
  uom: { id: string; name: string; factor: number | null } | null;
  images: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ProductExpireDate {
  serialNumber: string | null;
  expireDate: string;
  stock: number;
  daysToExpire: number;
}

export interface ProductDynamicInfo {
  productUuid: string;
  warehouseId: string;
  priceTypeId: string | null;
  price: number | null;
  stock: number;
  expireDates: ProductExpireDate[];
  syncedAt: string | null;
}

export interface Category {
  id: string;
  uuid: string | null;
  name: string;
  productsCount: number;
  image?: string | null;
}

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  warehouseId?: string;
  page?: number;
  perPage?: number;
}

export interface PaginatorInfo {
  total: number;
  currentPage: number;
  lastPage: number;
  perPage: number;
  hasMorePages: boolean;
}
