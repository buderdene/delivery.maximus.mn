/**
 * GraphQL API Service
 * cloud.maximus.mn REST + GraphQL API
 */

const API_BASE_URL = 'https://cloud.maximus.mn';
const GRAPHQL_URL = `${API_BASE_URL}/graphql`;
// ERP requests go through local proxy to avoid CORS
const ERP_URL = '/api/erp';

interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{ message: string; extensions?: unknown }>;
}

export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string
): Promise<GraphQLResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  return response.json() as Promise<GraphQLResponse<T>>;
}

// ============================================================================
// Products API (ERP - 1C)
// ============================================================================

// ERP Product Types
interface ERPProduct {
  uuid: string;
  name: string;
  article: string;
  barcode: string;
  brand: { uuid: string; name: string } | null;
  category: { uuid: string; name: string } | null;
  manufacturer: { uuid: string; name: string } | null;
  country: { uuid: string; name: string } | null;
  stockTypes: Array<{ uuid: string; name: string; pcs: number }>;
  price: number;
  stock: number;
  moq: number;
  onlyBoxSale: boolean;
  images: Array<{ info: string }> | null;
  hasImages: boolean;
}

interface ERPProductsResponse {
  count: number;
  results: ERPProduct[];
}

interface ERPCategoriesResponse {
  count: number;
  results: Array<{ uuid: string; name: string }>;
}

export interface ProductData {
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
  uom: { id: string; name: string; pcs: number } | null;
  stockTypes: Array<{ uuid: string; name: string; pcs: number }>;
  images: string[];
  moq: number;
  onlyBoxSale: boolean;
}

function mapERPProduct(raw: ERPProduct): ProductData {
  return {
    id: raw.uuid,
    uuid: raw.uuid,
    name: raw.name,
    article: raw.article || null,
    barcode: raw.barcode || null,
    description: null,
    price: raw.price || 0,
    cost: null,
    current_stock: raw.stock || 0,
    category: raw.category?.name || null,
    categoryId: raw.category?.uuid || null,
    brand: raw.brand?.name || null,
    brandId: raw.brand?.uuid || null,
    main_image: null,
    uom: raw.stockTypes?.[0] ? { id: raw.stockTypes[0].uuid, name: raw.stockTypes[0].name, pcs: raw.stockTypes[0].pcs } : null,
    stockTypes: raw.stockTypes || [],
    images: [],
    moq: raw.moq || 0,
    onlyBoxSale: raw.onlyBoxSale || false,
  };
}

export async function getProducts(
  token: string,
  filters?: {
    search?: string;
    categoryId?: string;
    categoryIds?: string[];
    brandIds?: string[];
    warehouseId?: string;
    priceTypeId?: string;
    page?: number;
    perPage?: number;
  }
): Promise<{
  success: boolean;
  data?: ProductData[];
  paginatorInfo?: {
    total: number;
    currentPage: number;
    lastPage: number;
    perPage: number;
    hasMorePages: boolean;
  };
  error?: string;
}> {
  const params = new URLSearchParams({
    page: String(filters?.page || 1),
    pageSize: String(filters?.perPage || 20),
  });

  // warehouseId and priceTypeId are required for ERP
  if (filters?.warehouseId) params.append('warehouseId', filters.warehouseId);
  if (filters?.priceTypeId) params.append('priceTypeId', filters.priceTypeId);
  
  // Support multi-category filter (comma separated)
  if (filters?.categoryIds && filters.categoryIds.length > 0) {
    params.append('categories', filters.categoryIds.join(','));
  } else if (filters?.categoryId) {
    params.append('categories', filters.categoryId);
  }
  
  // Support multi-brand filter (comma separated)
  if (filters?.brandIds && filters.brandIds.length > 0) {
    params.append('brands', filters.brandIds.join(','));
  }
  
  if (filters?.search) params.append('name', filters.search);

  try {
    const response = await fetch(`${ERP_URL}/pr/Products?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const data: ERPProductsResponse = await response.json();
    const perPage = filters?.perPage || 20;
    const currentPage = filters?.page || 1;
    const totalPages = Math.ceil(data.count / perPage);

    return {
      success: true,
      data: data.results.map(mapERPProduct),
      paginatorInfo: {
        total: data.count,
        currentPage,
        lastPage: totalPages,
        perPage,
        hasMorePages: currentPage < totalPages,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Сүлжээний алдаа' };
  }
}

export async function getCategories(token: string): Promise<{
  success: boolean;
  data?: Array<{ id: string; uuid: string | null; name: string; productsCount: number | null }>;
  error?: string;
}> {
  try {
    const response = await fetch(`${ERP_URL}/ct/Categories`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    // Categories API returns array directly
    const data: Array<{ uuid: string; name: string }> = await response.json();

    return {
      success: true,
      data: data.map(cat => ({
        id: cat.uuid,
        uuid: cat.uuid,
        name: cat.name,
        productsCount: null,
      })),
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Сүлжээний алдаа' };
  }
}

// Get brands from ERP
export async function getBrands(token: string, categoryId?: string): Promise<{
  success: boolean;
  data?: Array<{ id: string; uuid: string; name: string }>;
  error?: string;
}> {
  try {
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    
    const url = params.toString() 
      ? `${ERP_URL}/br/Brands?${params}` 
      : `${ERP_URL}/br/Brands`;
      
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    // Brands API returns array directly
    const data: Array<{ uuid: string; name: string }> = await response.json();

    return {
      success: true,
      data: data.map(brand => ({
        id: brand.uuid,
        uuid: brand.uuid,
        name: brand.name,
      })),
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Сүлжээний алдаа' };
  }
}

// ============================================================================
// Partners/Customers API (ERP - 1C)
// ============================================================================

// ERP API Response Types
interface ERPCompany {
  uuid: string;
  name: string;
  address: string;
  companyCode: string;
  headCompanyName: string;
  headCompanyRegister: string;
  coordinateRange: number;
  what3words: string;
  latitude: string;
  longitude: string;
  routeID: string;
  isRight: boolean;
}

interface ERPCompaniesResponse {
  count: number;
  results: ERPCompany[];
}

export interface PartnerData {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  street1: string | null;
  street2: string | null;
  city: string | null;
  erp_uuid: string | null;
  longitude: number | null;
  latitude: number | null;
  balance: number | null;
  debtLimit: number | null;
  debtDays: number | null;
  salesLimit: number | null;
  routeId: string | null;
  routeName: string | null;
  companyCode: string | null;
  headCompanyName: string | null;
  headCompanyRegister: string | null;
  image: string | null;
  created_at: string | null;
  updated_at: string | null;
}

function mapERPCompany(raw: ERPCompany): PartnerData {
  return {
    id: raw.uuid,
    name: raw.name,
    phone: null,
    email: null,
    street1: raw.address || null,
    street2: null,
    city: null,
    erp_uuid: raw.uuid,
    longitude: raw.longitude ? parseFloat(raw.longitude) : null,
    latitude: raw.latitude ? parseFloat(raw.latitude) : null,
    balance: null,
    debtLimit: null,
    debtDays: null,
    salesLimit: null,
    routeId: raw.routeID || null,
    routeName: null,
    companyCode: raw.companyCode || null,
    headCompanyName: raw.headCompanyName || null,
    headCompanyRegister: raw.headCompanyRegister || null,
    image: null,
    created_at: null,
    updated_at: null,
  };
}

export async function getPartners(
  token: string,
  options?: {
    search?: string;
    routeId?: string;
    page?: number;
    pageSize?: number;
  }
): Promise<{
  success: boolean;
  data?: PartnerData[];
  totalRecords?: number;
  totalPages?: number;
  error?: string;
}> {
  // routeId is required for ERP API
  if (!options?.routeId) {
    return { success: false, error: 'routeId шаардлагатай. Дахин нэвтэрнэ үү.' };
  }

  const params = new URLSearchParams({
    page: String(options?.page || 1),
    pageSize: String(options?.pageSize || 400),
    routeId: options.routeId,
  });

  if (options?.search) params.append('name', options.search);

  try {
    const response = await fetch(`${ERP_URL}/cl/Companies/?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const data: ERPCompaniesResponse = await response.json();

    return {
      success: true,
      data: data.results.map(mapERPCompany),
      totalRecords: data.count,
      totalPages: Math.ceil(data.count / (options?.pageSize || 400)),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Сүлжээний алдаа',
    };
  }
}

export async function getPartner(
  token: string,
  id: string
): Promise<{
  success: boolean;
  data?: PartnerData;
  error?: string;
}> {
  // ERP does not have a single partner endpoint, fetch all and filter
  const result = await getPartners(token);
  
  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  const partner = result.data.find(p => p.id === id || p.erp_uuid === id);
  
  if (partner) {
    return { success: true, data: partner };
  }

  return { success: false, error: 'Харилцагч олдсонгүй' };
}
