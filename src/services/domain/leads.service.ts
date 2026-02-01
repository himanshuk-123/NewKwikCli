import leadsApi from '@src/api/services/leads.api';
import { LeadListParams, LeadsData, LeadsError } from '@src/types/leads';

/**
 * Domain service for leads.
 * Pure functions, no React imports, no side effects beyond HTTP calls and error classification.
 * 
 * Migrated from Expo app GetLeadListStatuswise: transforms API response and handles errors.
 */

export const leadsService = {
  /**
   * Fetch leads by status type.
   * Transforms API response to domain model.
   * Throws structured error on failure.
   */
  getLeadsList: async (params: LeadListParams): Promise<LeadsData> => {
    try {
      const response = await leadsApi.fetchLeads(params);

      // API returns Error: "0" for success, non-zero for failure
      if (response.Error && response.Error !== '0') {
        throw {
          code: 'NOT_FOUND',
          message: response.MESSAGE || 'Failed to fetch leads',
        } as LeadsError;
      }

      // Transform API response to domain model
      const leads = response.DataRecord || [];
      const totalCount = response.TotalCount || 0;

      return {
        leads,
        totalCount,
        statusType: params.statusType,
      };
    } catch (error: any) {
      // Classify network/HTTP errors
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw {
          code: 'NETWORK_ERROR',
          message: 'Network error. Please check your connection.',
          originalError: error,
        } as LeadsError;
      }

      // Re-throw if already classified
      if (error.code) {
        throw error;
      }

      throw {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'Failed to fetch leads',
        originalError: error,
      } as LeadsError;
    }
  },
};

export default leadsService;
