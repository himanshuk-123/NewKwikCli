import { create } from 'zustand';
import { AppStepListDataRecord } from '../types';
import { fetchAppStepListApi } from '../api/valuation.api';

interface UploadedSideData {
  side: string;
  imgUri: string; // Local file URI from camera
}

interface ValuationState {
  steps: AppStepListDataRecord[];
  isLoading: boolean;
  error: string | null;
  uploadedSides: UploadedSideData[]; // Array of uploaded sides with image URIs
  fetchSteps: (leadId: string) => Promise<void>;
  markSideAsUploaded: (side: string, imgUri: string) => void;
  getSideImage: (side: string) => string | null;
  reset: () => void;
}

export const useValuationStore = create<ValuationState>((set, get) => ({
  steps: [],
  isLoading: false,
  error: null,
  uploadedSides: [],

  fetchSteps: async (leadId: string) => {
    set({ isLoading: true, error: null, steps: [] });
    try {
      const data = await fetchAppStepListApi(leadId);
      set({ steps: data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch steps', isLoading: false });
    }
  },

  markSideAsUploaded: (side: string, imgUri: string) => {
    set(state => {
      // Check if side already exists and update it, otherwise add it
      const existing = state.uploadedSides.findIndex(item => item.side === side);
      if (existing !== -1) {
        const updated = [...state.uploadedSides];
        updated[existing] = { side, imgUri };
        return { uploadedSides: updated };
      }
      return { uploadedSides: [...state.uploadedSides, { side, imgUri }] };
    });
  },

  getSideImage: (side: string) => {
    const state = get();
    const found = state.uploadedSides.find(item => item.side === side);
    return found?.imgUri || null;
  },

  reset: () => {
    set({ steps: [], isLoading: false, error: null, uploadedSides: [] });
  }
}));
