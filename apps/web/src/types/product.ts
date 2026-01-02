/**
 * Product Types for Sales Maximus
 * ERP: 1C Products API
 */

export interface UOM {
  id: string;
  name: string;
  pcs?: number;
  factor?: number;
}

export interface StockType {
  uuid: string;
  name: string;
  pcs: number;
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
  categoryId: string | null;
  brand: string | null;
  brandId: string | null;
  main_image: string | null;
  main_image_url: string | null;
  uom: UOM | null;
  stockTypes: StockType[];
  images: string[];
  moq: number;
  onlyBoxSale: boolean;
  stock_status: 'out_of_stock' | 'low_stock' | 'in_stock';
  formatted_price: string;
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
