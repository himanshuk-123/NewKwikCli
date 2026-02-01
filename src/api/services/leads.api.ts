import client from '../client';
import { LeadsListResponse, LeadListParams, LEAD_STATUS_ID_MAP, LeadDetailResponse } from '@src/types/leads';

/**
 * Pure API service layer for leads endpoints.
 * No side effects beyond HTTP calls.
 * Response transformation and error classification happen in domain service.
 * 
 * Migrated from Expo app: /App/webservice/LeadListStatuswise
 */

export const leadsApi = {
  /**
   * POST /App/webservice/LeadListStatuswise
   * Fetches leads by status type (SCLeads, QCLeads, CompletedLeads, etc.)
   * Maps status type to StatusId for API.
   */
  fetchLeads: async (params: LeadListParams): Promise<LeadsListResponse> => {
    const statusId = LEAD_STATUS_ID_MAP[params.statusType];

    const response = await client.post<LeadsListResponse>(
      '/App/webservice/LeadListStatuswise',
      {
        Version: '2',
        StatusId: statusId,
      }
    );

    return response.data;
  },

  /**
   * POST /App/webservice/LeadReportFindById
   * Fetches single lead details by LeadId.
   * Used for lead detail screen.
   */
  fetchLeadDetail: async (leadId: string): Promise<LeadDetailResponse> => {
    const response = await client.post<LeadDetailResponse>(
      '/App/webservice/LeadReportFindById',
      {
        LeadId: leadId,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  },
};

export default leadsApi;
