/**
 * Partner Store
 * Platform-agnostic Zustand store
 */
import { create } from 'zustand';
import { getPartners } from '../services/partners';
import type { Partner } from '../types';

interface PartnerFilters {
  search: string;
}

interface PartnerState {
  // Data
  partners: Partner[];
  selectedPartner: Partner | null;
  
  // Loading
  isLoading: boolean;
  error: string | null;
  
  // Filters
  filters: PartnerFilters;
  
  // Token getter (set by platform)
  getToken: () => string | null;
  setTokenGetter: (getter: () => string | null) => void;
  
  // Actions
  fetchPartners: () => Promise<void>;
  setSearch: (search: string) => void;
  selectPartner: (partner: Partner | null) => void;
  refresh: () => Promise<void>;
  reset: () => void;
}

export const usePartnerStore = create<PartnerState>((set, get) => ({
  partners: [],
  selectedPartner: null,
  isLoading: false,
  error: null,
  filters: { search: '' },
  
  getToken: () => null,
  setTokenGetter: (getter) => set({ getToken: getter }),

  fetchPartners: async () => {
    const token = get().getToken();
    if (!token) {
      set({ error: 'Нэвтрээгүй байна', isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });
    const { filters } = get();

    try {
      const result = await getPartners(token, {
        search: filters.search || undefined,
      });

      if (result.success && result.data) {
        set({ partners: result.data, isLoading: false });
      } else {
        set({ error: result.error || 'Харилцагч татахад алдаа гарлаа', isLoading: false });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Сүлжээний алдаа', isLoading: false });
    }
  },

  setSearch: (search) => {
    set((state) => ({ filters: { ...state.filters, search } }));
    get().fetchPartners();
  },

  selectPartner: (partner) => {
    set({ selectedPartner: partner });
  },

  refresh: async () => {
    await get().fetchPartners();
  },

  reset: () => {
    set({
      partners: [],
      selectedPartner: null,
      isLoading: false,
      error: null,
      filters: { search: '' },
    });
  },
}));
