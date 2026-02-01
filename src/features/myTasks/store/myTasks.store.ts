import { create } from 'zustand';
import { fetchMyTasksApi, fetchVehicleCountsApi } from '../api/myTasks.api';
import { LeadListStatuswiseRespDataRecord } from '../types';

interface MyTasksState {
  // Data State
  countsByVehicle: Record<string, number>;
  tasks: LeadListStatuswiseRespDataRecord[];

  // UI State
  currentVehicle: string;
  pageNumber: number;
  pageSize: number;

  // Status State
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  setVehicle: (vehicleType: string) => void;
  setPage: (page: number) => void;
  fetchPaginatedTasks: () => Promise<void>;
  confirmAppointment: (leadId: string, date: Date) => Promise<void>;
  reset: () => void;
}

const DEFAULT_PAGE_SIZE = 10;
const INITIAL_VEHICLE = "2W";

export const useMyTasksStore = create<MyTasksState>((set, get) => ({
  countsByVehicle: {},
  tasks: [],
  currentVehicle: INITIAL_VEHICLE,
  pageNumber: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  isLoading: false,
  isInitializing: false,
  error: null,

  reset: () => set({
    tasks: [],
    isLoading: true,
    error: null,
    countsByVehicle: {},
    pageNumber: 1,
    currentVehicle: INITIAL_VEHICLE
  }),

  initialize: async () => {
    set({ isInitializing: true, isLoading: true, error: null });
    try {
      // 1. Fetch Counts API
      const response = await fetchVehicleCountsApi();

      if (response.Error !== '0') {
        set({ error: response.MESSAGE || 'Init failed', isInitializing: false, isLoading: false });
        return;
      }

      // Convert array response to Record<string, number>
      const counts: Record<string, number> = {};
      (response.DataRecord || []).forEach(item => {
        counts[item.VehicleTypeValue] = item.counts;
      });

      set({
        countsByVehicle: counts,
        isInitializing: false,
      });

      // 2. Fetch Initial Data for Default Vehicle
      get().fetchPaginatedTasks();

    } catch (error: any) {
      set({ error: error.message, isInitializing: false, isLoading: false });
    }
  },

  setVehicle: (vehicleType: string) => {
    // Clear tasks to show loader, reset page
    set({ currentVehicle: vehicleType, pageNumber: 1, tasks: [], isLoading: true });
    get().fetchPaginatedTasks();
  },

  setPage: (page: number) => {
    set({ pageNumber: page });
    get().fetchPaginatedTasks();
  },

  fetchPaginatedTasks: async () => {
    const { currentVehicle, pageNumber, pageSize } = get();
    set({ isLoading: true, error: null });

    try {
      // Pass currentVehicle (e.g. "2W", "4W") directly as VehicleTypeValue
      const response = await fetchMyTasksApi(
        pageNumber,
        pageSize,
        currentVehicle
      );

      if (response.Error !== '0') {
        set({ error: response.MESSAGE || 'Fetch failed', isLoading: false });
        return;
      }

      set({
        tasks: response.DataRecord || [],
        isLoading: false
      });

    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  confirmAppointment: async (leadId: string, date: Date) => {
    // We don't necessarily need to set global loading here if we want a seamless experience,
    // but setting it handles blocking properly.
    // Or we could have a specific loading state. For now, reusing isLoading is safe.
    // set({ isLoading: true, error: null }); 
    // Actually, let's NOT block the whole UI logic, just fire it. 
    // But error handling is good.
    try {
      await import('../api/myTasks.api').then(m => m.leadAppointmentDateApi(leadId, date));
    } catch (error: any) {
      set({ error: error.message });
      throw error; // Re-throw so UI can show Toast
    }
  }
}));
