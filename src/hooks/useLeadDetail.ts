import { useQuery, UseQueryResult } from '@tanstack/react-query';
import leadDetailService from '@src/services/domain/leadDetail.service';
import { Lead } from '@src/types/leads';

/**
 * useLeadDetail hook
 * Fetches single lead by ID via React Query.
 * No Redux storage; React Query handles caching.
 * 
 * Migrated from Expo app LeadFindId usage pattern.
 */
export const useLeadDetail = (leadId: string) => {
  const query: UseQueryResult<Lead, any> = useQuery({
    queryKey: ['leadDetail', leadId],
    queryFn: async () => {
      return await leadDetailService.getLeadDetail(leadId);
    },
    enabled: !!leadId, // Only fetch if leadId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    // Data
    lead: query.data,

    // Status
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error?.message || null,

    // Actions
    refetch: query.refetch,
  };
};

export default useLeadDetail;
