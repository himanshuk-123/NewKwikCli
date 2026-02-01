import { create } from "zustand";
import { getDashboardData } from "../api/dashboard.api";
import { AppDashboardType } from "../types";

interface DashboardState {
  dashboardData: AppDashboardType | null;
  isLoading: boolean;
  error: string | null;
  fetchDashboardData: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  dashboardData: null,
  isLoading: false,
  error: null,

  fetchDashboardData: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await getDashboardData();



      // Check for error (API returns "0" as string for success)
      if (Number(response?.Error) !== 0) {
        set({
          error: response?.Message ?? "Unknown error",
          isLoading: false,
        });
        return;
      }

      const record = response?.DataRecord?.[0] ?? null;

      set({
        dashboardData: record,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        error: err?.message ?? "Something went wrong",
        isLoading: false,
      });
    }
  },
}));
