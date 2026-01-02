/**
 * Product Store
 * Platform-agnostic Zustand store
 */
import { create } from 'zustand';
import { getProducts, getCategories } from '../services/products';
import type { Product, Category, PaginatorInfo } from '../types';

interface ProductFilters {
  search: string;
  categoryId: string | null;
  warehouseId: string | null;
}

interface ProductState {
  // Data
  products: Product[];
  categories: Category[];
  
  // Loading
  isLoading: boolean;
  categoriesLoading: boolean;
  error: string | null;
  
  // Pagination
  paginatorInfo: PaginatorInfo | null;
  
  // Filters
  filters: ProductFilters;
  
  // Token getter (set by platform)
  getToken: () => string | null;
  setTokenGetter: (getter: () => string | null) => void;
  
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
  products: [],
  categories: [],
  isLoading: false,
  categoriesLoading: false,
  error: null,
  paginatorInfo: null,
  filters: {
    search: '',
    categoryId: null,
    warehouseId: null,
  },
  
  getToken: () => null,
  setTokenGetter: (getter) => set({ getToken: getter }),

  fetchProducts: async (page = 1) => {
    const token = get().getToken();
    if (!token) {
      set({ error: 'Нэвтрээгүй байна', isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });
    const { filters } = get();

    try {
      const result = await getProducts(token, {
        search: filters.search || undefined,
        categoryId: filters.categoryId || undefined,
        warehouseId: filters.warehouseId || undefined,
        page,
        perPage: 20,
      });

      if (result.success && result.data) {
        if (page === 1) {
          set({ products: result.data, paginatorInfo: result.paginatorInfo, isLoading: false });
        } else {
          set((state) => ({
            products: [...state.products, ...result.data!],
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

  fetchCategories: async () => {
    const token = get().getToken();
    if (!token) return;

    set({ categoriesLoading: true });

    try {
      const result = await getCategories(token);

      if (result.success && result.data) {
        set({ categories: result.data, categoriesLoading: false });
      } else {
        set({ categoriesLoading: false });
      }
    } catch {
      set({ categoriesLoading: false });
    }
  },

  loadMore: async () => {
    const { paginatorInfo, isLoading } = get();
    if (isLoading || !paginatorInfo?.hasMorePages) return;
    await get().fetchProducts(paginatorInfo.currentPage + 1);
  },

  setSearch: (search) => {
    set((state) => ({ filters: { ...state.filters, search } }));
  },

  setCategory: (categoryId) => {
    set((state) => ({ filters: { ...state.filters, categoryId } }));
    get().fetchProducts(1);
  },

  setWarehouse: (warehouseId) => {
    set((state) => ({ filters: { ...state.filters, warehouseId } }));
    get().fetchProducts(1);
  },

  clearFilters: () => {
    set({ filters: { search: '', categoryId: null, warehouseId: null } });
    get().fetchProducts(1);
  },

  refresh: async () => {
    await get().fetchProducts(1);
  },
}));
