import leadsApi from '@src/api/services/leads.api';
import { Lead, LeadsError } from '@src/types/leads';

/**
 * Domain service for lead detail.
 * Pure functions, no React imports, no side effects beyond HTTP calls and error classification.
 * 
 * Migrated from Expo app LeadFindId: /App/webservice/LeadReportFindById
 */

export const leadDetailService = {
  /**
   * Fetch single lead by LeadId.
   * Transforms API response to domain model.
   * Throws structured error on failure.
   */
  getLeadDetail: async (leadId: string): Promise<Lead> => {
    try {
      const response = await leadsApi.fetchLeadDetail(leadId);

      // API returns ERROR: "0" for success (note: uppercase ERROR, not Error)
      if (response.ERROR && response.ERROR !== '0') {
        throw {
          code: 'NOT_FOUND',
          message: response.MESSAGE || 'Failed to fetch lead details',
        } as LeadsError;
      }

      // API returns LeadList array, use first element
      const leadData = response.LeadList?.[0];

      if (!leadData) {
        throw {
          code: 'NOT_FOUND',
          message: 'Lead not found',
        } as LeadsError;
      }

      return leadData;
    } catch (error: any) {
      // Network error
      if (!error.response) {
        throw {
          code: 'NETWORK_ERROR',
          message: 'Network request failed. Please check your connection.',
          originalError: error,
        } as LeadsError;
      }

      // API error already classified
      if (error.code) {
        throw error;
      }

      // Unknown error
      throw {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred',
        originalError: error,
      } as LeadsError;
    }
  },
};

export default leadDetailService;
