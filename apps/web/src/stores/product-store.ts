/**
 * Product Store
 * Zustand store for managing products state
 */
import { create } from 'zustand';
import { getProducts, getCategories } from '@/services/api';
import { getToken, getDefaultWarehouse } from '@/lib/auth';
import type { Product, Category, PaginatorInfo } from '@/types';

const IMAGE_BASE_URL = 'https://cloud.maximus.mn';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('mn-MN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price) + '₮';
}

function getStockStatus(stock: number): 'out_of_stock' | 'low_stock' | 'in_stock' {
  if (stock <= 0) return 'out_of_stock';
  if (stock <= 10) return 'low_stock';
  return 'in_stock';
}

function getImageUrl(mainImage: string | null): string | null {
  if (!mainImage) return null;
  if (mainImage.startsWith('http')) return mainImage;
  return `${IMAGE_BASE_URL}${mainImage}`;
}

function mapProduct(raw: {
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
}): Product {
  const price = raw.price || 0;
  const stock = raw.current_stock || 0;

  return {
    id: raw.id,
    uuid: raw.uuid || raw.id,
    name: raw.name,
    article: raw.article,
    barcode: raw.barcode,
    description: raw.description,
    price,
    cost: raw.cost,
    current_stock: stock,
    category: raw.category,
    categoryId: raw.categoryId,
    brand: raw.brand,
    brandId: raw.brandId,
    main_image: raw.main_image,
    main_image_url: getImageUrl(raw.main_image),
    uom: raw.uom,
    stockTypes: raw.stockTypes || [],
    images: raw.images || [],
    moq: raw.moq || 0,
    onlyBoxSale: raw.onlyBoxSale || false,
    stock_status: getStockStatus(stock),
    formatted_price: formatPrice(price),
  };
}
interface ProductFilters {
  search: string;
  categoryId: string | null;
  warehouseId: string | null;
}

interface ProductState {
  // Products
  products: Product[];
  isLoading: boolean;
  error: string | null;
  paginatorInfo: PaginatorInfo | null;

  // Categories
  categories: Category[];
  categoriesLoading: boolean;

  // Filters
  filters: ProductFilters;

  // Actions
  fetchProducts: (page?: number) => Promise<void>;
  fetchCategories: () => Promise<void>;
  loadMore: () => Promise<void>;
  setSearch: (search: string) => void;
  setCategory: (categoryId: string | null) => void;
  setWarehouse: (warehouseId: string | null) => void;
  clearFilters: () => void;
  refresh: () => Promise<void>;
}

export const useProductStore = create<ProductState>((set, get) => ({
  // Initial state
  products: [],
  isLoading: false,
  error: null,
  paginatorInfo: null,

  categories: [],
  categoriesLoading: false,

  filters: {
    search: '',
    categoryId: null,
    warehouseId: null,
  },

  // Fetch products from ERP (1C)
  fetchProducts: async (page = 1) => {
    const token = getToken();
    const warehouse = getDefaultWarehouse();
    
    if (!warehouse) {
      set({ error: 'Дахин нэвтэрнэ үү (warehouse олдсонгүй)', isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });

    const { filters } = get();

    try {
      const result = await getProducts(token || '', {
        search: filters.search || undefined,
        categoryId: filters.categoryId || undefined,
        warehouseId: warehouse.uuid,
        priceTypeId: warehouse.priceTypeId,
        page,
        perPage: 20,
      });

      if (result.success && result.data) {
        const products = result.data.map(mapProduct);

        if (page === 1) {
          set({ products, paginatorInfo: result.paginatorInfo, isLoading: false });
        } else {
          set((state) => ({
            products: [...state.products, ...products],
            paginatorInfo: result.paginatorInfo,
            isLoading: false,
          }));
        }
      } else {
        set({ error: result.error || 'Бараа татахад алдаа гарлаа', isLoading: false });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Сүлжээний алдаа', isLoading: false });
    }
  },

  // Fetch categories
  fetchCategories: async () => {
    const token = getToken();
    if (!token) return;

    set({ categoriesLoading: true });

    try {
      const result = await getCategories(token);

      if (result.success && result.data) {
        const categories: Category[] = result.data.map((c) => ({
          id: c.id,
          uuid: c.uuid,
          name: c.name,
          productsCount: c.productsCount || 0,
        }));
        set({ categories, categoriesLoading: false });
      } else {
        set({ categoriesLoading: false });
      }
    } catch {
      set({ categoriesLoading: false });
    }
  },

  // Load more products
  loadMore: async () => {
    const { paginatorInfo, isLoading } = get();
    if (isLoading || !paginatorInfo?.hasMorePages) return;

    await get().fetchProducts(paginatorInfo.currentPage + 1);
  },

  // Set search filter
  setSearch: (search: string) => {
    set((state) => ({
      filters: { ...state.filters, search },
    }));
  },

  // Set category filter
  setCategory: (categoryId: string | null) => {
    set((state) => ({
      filters: { ...state.filters, categoryId },
    }));
    get().fetchProducts(1);
  },

  // Set warehouse filter
  setWarehouse: (warehouseId: string | null) => {
    set((state) => ({
      filters: { ...state.filters, warehouseId },
    }));
    get().fetchProducts(1);
  },

  // Clear all filters
  clearFilters: () => {
    set({
      filters: {
        search: '',
        categoryId: null,
        warehouseId: null,
      },
    });
    get().fetchProducts(1);
  },

  // Refresh products
  refresh: async () => {
    await get().fetchProducts(1);
  },
}));
