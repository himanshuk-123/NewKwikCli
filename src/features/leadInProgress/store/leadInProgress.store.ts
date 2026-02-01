import { create } from 'zustand';
import { fetchLeadsInProgressApi } from '../api/leadInProgress.api';
import { LeadListStatuswiseRespDataRecord } from '../types';

interface LeadInProgressState {
  leads: LeadListStatuswiseRespDataRecord[];
  isLoading: boolean;
  error: string | null;
  fetchLeads: () => Promise<void>;
  reset: () => void;
}

export const useLeadInProgressStore = create<LeadInProgressState>((set) => ({
  leads: [],
  isLoading: false,
  error: null,

  fetchLeads: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchLeadsInProgressApi();
      set({ leads: data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Error fetching data', isLoading: false });
    }
  },

  reset: () => set({ leads: [], isLoading: false, error: null }),
}));
