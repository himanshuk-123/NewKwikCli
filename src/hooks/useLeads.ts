import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import leadsService from '@src/services/domain/leads.service';
import { LeadsData, LeadStatusType } from '@src/types/leads';

/**
 * useLeads hook
 * Manages leads data by status type via React Query.
 * No Redux storage; React Query handles caching, dedup, and stale-time.
 * Exposes clean API to components.
 * 
 * Migrated from Expo app: uses statusType instead of pageNo/pageSize (no pagination in API).
 */
export const useLeads = (defaultStatusType: LeadStatusType = 'QCLeads') => {
  const [statusType, setStatusType] = useState<LeadStatusType>(defaultStatusType);

  const query: UseQueryResult<LeadsData, any> = useQuery({
    queryKey: ['leads', statusType],
    queryFn: async () => {
      return await leadsService.getLeadsList({ statusType });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const setStatus = useCallback((newStatusType: LeadStatusType) => {
    setStatusType(newStatusType);
  }, []);

  return {
    // Data
    leads: query.data?.leads || [],
    totalCount: query.data?.totalCount || 0,
    statusType,

    // Status
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error?.message || null,

    // Actions
    setStatus,

    // Refetch
    refetch: query.refetch,
  };
};

export default useLeads;
