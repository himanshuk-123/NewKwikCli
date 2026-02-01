import { create } from 'zustand';
import { fetchValuationCompletedLeadsApi, fetchLeadDayBookApi } from '../api/valuationCompletedLeads.api';
import { LeadListStatuswiseRespDataRecord, AppLeadDaybookDataRecord } from '../types';

interface ValuationCompletedLeadsState {
  leads: LeadListStatuswiseRespDataRecord[];
  dayBook: AppLeadDaybookDataRecord;
  isLoading: boolean;
  error: string | null;
  fetchLeads: () => Promise<void>;
  reset: () => void;
}

export const useValuationCompletedLeadsStore = create<ValuationCompletedLeadsState>((set) => ({
  leads: [],
  dayBook: { lastmonth: 0, thismonth: 0, Today: 0 },
  isLoading: false,
  error: null,

  fetchLeads: async () => {
    set({ isLoading: true, error: null });

    // Fetch Leads (Critical)
    try {
      const leadsData = await fetchValuationCompletedLeadsApi();
      set({ leads: leadsData });
    } catch (error: any) {
      console.error("Leads Fetch Error:", error);
      set({ error: error.message || 'Error fetching leads' });
    }

    // Fetch DayBook (Non-Critical) - Run independently
    try {
      const dayBookData = await fetchLeadDayBookApi();
      set({ dayBook: dayBookData });
    } catch (error: any) {
      console.warn("DayBook Fetch Error:", error);
      // Keep default dayBook state, don't override error if leads succeeded
    } finally {
      set({ isLoading: false });
    }
  },

  reset: () => set({
    leads: [],
    dayBook: { lastmonth: 0, thismonth: 0, Today: 0 },
    isLoading: false,
    error: null
  }),
}));
