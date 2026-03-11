import { create } from 'zustand';
import { AppStepListDataRecord } from '../types';
import { fetchAppStepListApi } from '../api/valuation.api';

export type UploadStatus =
  | 'pending'
  | 'uploading'
  | 'uploaded'
  | 'failed';

interface SideUploadState {
  side: string;
  localUri: string;
  status: UploadStatus;
}

interface ValuationState {
  steps: AppStepListDataRecord[];
  isLoading: boolean;
  error: string | null;

  sideUploads: SideUploadState[];

  fetchSteps: (leadId: string) => Promise<void>;
  markLocalCaptured: (side: string, localUri: string) => void;
  updateUploadStatus: (side: string, status: UploadStatus) => void;
  getSideUpload: (side: string) => SideUploadState | undefined;

  reset: () => void;
}

export const useValuationStore = create<ValuationState>((set, get) => ({
  steps: [],
  isLoading: false,
  error: null,
  sideUploads: [],

  /* ===================== API ===================== */

  fetchSteps: async (leadId: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchAppStepListApi(leadId);
      set({ steps: data, isLoading: false });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to fetch steps', isLoading: false });
    }
  },

  /* ===================== LOCAL CAPTURE ===================== */

  markLocalCaptured: (side, localUri) => {
    console.log('[Store] markLocalCaptured called:', { side, localUri });
    set(state => {
      const existingIndex = state.sideUploads.findIndex(s => s.side === side);
      if (existingIndex !== -1) {
        console.log('[Store] Updating existing side and moving to end:', side);
        // Remove from current position
        const updatedItem = {
          ...state.sideUploads[existingIndex],
          localUri,
          status: 'pending' as UploadStatus,
        };
        const newUploads = [
          ...state.sideUploads.slice(0, existingIndex),
          ...state.sideUploads.slice(existingIndex + 1),
          updatedItem,  // Add to end
        ];
        console.log('[Store] Moved to end, last item is now:', newUploads[newUploads.length - 1]?.side);
        return { sideUploads: newUploads };
      }
      console.log('[Store] Adding new side:', side);
      const newUploads = [
        ...state.sideUploads,
        { side, localUri, status: 'pending' },
      ];
      console.log('[Store] New sideUploads array, last item:', newUploads[newUploads.length - 1]?.side);
      return {
        sideUploads: newUploads,
      };
    });
  },

  /* ===================== UPLOAD STATUS ===================== */

  updateUploadStatus: (side, status) => {
    set(state => {
      const existing = state.sideUploads.find(s => s.side === side);
      if (!existing) return state;

      existing.status = status;
      return { sideUploads: [...state.sideUploads] };
    });
  },

  /* ===================== SELECTORS ===================== */

  getSideUpload: side => {
    return get().sideUploads.find(s => s.side === side);
  },

  /* ===================== RESET ===================== */

  reset: () => {
    set({
      steps: [],
      isLoading: false,
      error: null,
      sideUploads: [],
    });
  },
}));
