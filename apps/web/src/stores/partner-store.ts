/**
 * Partner Store
 * Zustand store for managing partners/customers state
 */
import { create } from 'zustand';
import { getPartners } from '@/services/api';
import { getToken, getRouteId } from '@/lib/auth';
import type { Partner } from '@/types';

interface PartnerFilters {
  search: string;
}

interface PartnerState {
  // Partners
  partners: Partner[];
  selectedPartner: Partner | null;
  isLoading: boolean;
  error: string | null;
  
  // Pagination
  totalRecords: number;
  totalPages: number;
  currentPage: number;

  // Filters
  filters: PartnerFilters;

  // Actions
  fetchPartners: () => Promise<void>;
  setSearch: (search: string) => void;
  selectPartner: (partner: Partner | null) => void;
  refresh: () => Promise<void>;
  reset: () => void;
}

export const usePartnerStore = create<PartnerState>((set, get) => ({
  // Initial state
  partners: [],
  selectedPartner: null,
  isLoading: false,
  error: null,
  
  // Pagination
  totalRecords: 0,
  totalPages: 0,
  currentPage: 1,

  filters: {
    search: '',
  },

  // Fetch partners from ERP (1C)
  fetchPartners: async () => {
    const routeId = getRouteId();
    if (!routeId) {
      set({ error: 'Дахин нэвтэрнэ үү (routeId олдсонгүй)', isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });

    const { filters, currentPage } = get();
    const token = getToken();

    try {
      const result = await getPartners(token || '', {
        search: filters.search || undefined,
        routeId: routeId,
        page: currentPage,
        pageSize: 400,
      });

      if (result.success && result.data) {
        set({ 
          partners: result.data, 
          totalRecords: result.totalRecords || 0,
          totalPages: result.totalPages || 0,
          isLoading: false 
        });
      } else {
        set({ error: result.error || 'Харилцагч татахад алдаа гарлаа', isLoading: false });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Сүлжээний алдаа', isLoading: false });
    }
  },

  // Set search filter
  setSearch: (search: string) => {
    set((state) => ({
      filters: { ...state.filters, search },
      currentPage: 1,
    }));
    get().fetchPartners();
  },

  // Select partner
  selectPartner: (partner: Partner | null) => {
    set({ selectedPartner: partner });
  },

  // Refresh partners
  refresh: async () => {
    await get().fetchPartners();
  },

  // Reset store
  reset: () => {
    set({
      partners: [],
      selectedPartner: null,
      isLoading: false,
      error: null,
      totalRecords: 0,
      totalPages: 0,
      currentPage: 1,
      filters: { search: '' },
    });
  },
}));
