import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getValuationProgressForAllLeads, initValuationProgressDB } from '../database/valuationProgress.db';

/**
 * Hook to get count of leads that have been valuated (captured at least one image)
 * Used for Dashboard to show how many vehicles user has valuated
 */
export const useValuatedLeadsCount = () => {
  const [valuatedCount, setValuatedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchValuatedCount = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await initValuationProgressDB();

      // Get all leads from database
      const allLeads = await getValuationProgressForAllLeads();

      // Count only leads that have been valuated (uploadedCount > 0 means images captured)
      // Note: uploadedCount in DB actually tracks uploaded image count, which is set
      // when user captures images in ValuationPage
      const valuated = allLeads.filter((lead) => lead.uploadedCount > 0).length;

      setValuatedCount(valuated);
      console.log(`[useValuatedLeadsCount] Found ${valuated} valuated leads`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('[useValuatedLeadsCount] Error:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on screen focus (Dashboard refresh)
  useFocusEffect(
    useCallback(() => {
      fetchValuatedCount();
    }, [fetchValuatedCount])
  );

  return {
    valuatedCount,
    isLoading,
    error,
    refetch: fetchValuatedCount,
  };
};
