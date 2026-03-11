import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  getValuationProgressForAllLeads,
  getActualUniqueCounts,
  ValuationProgressItem as DBValuationProgressItem,
} from '../database/valuationProgress.db';

export interface ValuationLead extends DBValuationProgressItem {
  isPartiallyUploaded: boolean;
  uploadProgress: number;
}

export const useValuationLeads = () => {
  const [leads, setLeads] = useState<ValuationLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const dbLeads = await getValuationProgressForAllLeads();

      // Keep totalCount from database (set by ValuatePage from API steps count: 20 for 4W)
      // For progress we want to track how many UNIQUE sides have been CAPTURED (online or offline),
      // not just how many have finished uploading. This ensures the ValuatedLeads screen correctly
      // reflects user work even when offline.
      const transformedLeads: ValuationLead[] = await Promise.all(
        dbLeads.map(async (lead) => {
          // Get actual unique counts from captured media
          const { totalUniqueSides, uploadedUniqueSides } =
            await getActualUniqueCounts(lead.leadId);

          // totalCount = expected number of cards for this vehicle (from API)
          const totalCount = lead.totalCount;

          // capturedCount = how many UNIQUE sides have been captured locally
          // (pending OR uploaded). This is what the UX copy on ValuatedLeads
          // refers to as "how many images are captured".
          const capturedCount = totalUniqueSides;

          // Clamp captured count to totalCount so we never show e.g. 21/20
          const normalizedCapturedCount =
            totalCount > 0
              ? Math.min(capturedCount, totalCount)
              : capturedCount;

          return {
            ...lead,
            totalCount,
            // NOTE: For the ValuatedLeads screen, uploadedCount now represents
            // "captured count" (unique sides the user has taken), so the UI
            // can correctly show progress even when uploads are still pending.
            uploadedCount: normalizedCapturedCount,
            isPartiallyUploaded: totalCount > normalizedCapturedCount,
            uploadProgress:
              totalCount > 0
                ? Math.round(
                    (normalizedCapturedCount / totalCount) * 100
                  )
                : 0,
          };
        })
      );
      
      // Sort by most recently updated first
      transformedLeads.sort((a, b) => b.updatedAt - a.updatedAt);
      
      setLeads(transformedLeads);
      console.log(`[Hook] Fetched ${transformedLeads.length} leads with accurate upload counts`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('[Hook] Error fetching leads:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchLeads();
    }, [fetchLeads])
  );

  return {
    leads,
    isLoading,
    error,
    refetch: fetchLeads,
  };
};
