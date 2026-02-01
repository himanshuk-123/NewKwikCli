/**
 * Leads domain types
 * Based on Expo app's LeadListStatusWiseResp from /App/webservice/LeadListStatuswise
 */

export type LeadStatusType =
  | 'SCLeads'
  | 'ROLeads'
  | 'AssignedLeads'
  | 'ReassignedLeads'
  | 'RoConfirmationLeads'
  | 'QCLeads'
  | 'QCHoldLeads'
  | 'PricingLeads'
  | 'CompletedLeads'
  | 'OutofTatLeads'
  | 'DuplicateLeads'
  | 'RejectedLeads';

export const LEAD_STATUS_ID_MAP: Record<LeadStatusType, string> = {
  SCLeads: '1',
  ROLeads: '2',
  AssignedLeads: '3',
  ReassignedLeads: '4',
  RoConfirmationLeads: '5',
  QCLeads: '6',
  QCHoldLeads: '7',
  PricingLeads: '8',
  CompletedLeads: '9',
  OutofTatLeads: '10',
  DuplicateLeads: '11',
  RejectedLeads: '13',
};

export interface Lead {
  Id?: number;
  LeadId?: string;
  LeadUId?: string;
  CustomerName?: string;
  CustomerMobileNo?: string;
  RegNo?: string;
  VehicleType?: number;
  VehicleTypeValue?: string;
  ProspectNo?: string;
  Pincode?: string;
  City?: number;
  cityname?: string;
  State?: number;
  statename?: string;
  Area?: number;
  areaname?: string;
  StatusId?: number;
  CompanyId?: number;
  companyname?: string;
  ExecutiveName?: string;
  ExecutiveMobile?: string;
  ExecutiveReportEmailId?: string;
  ValuatorName?: string;
  AdminRo?: string;
  LeadTypeName?: string;
  DownLoadUrl?: string;
  ViewUrl?: string;
  QcUpdateDate?: string;
  PriceUpdateDate?: string;
  AddedByDate?: string;
  UpdatedByDate?: string;
  // Additional fields from API
  [key: string]: any;
}

export interface LeadsListResponse {
  Error: string; // "0" for success
  Status: string;
  MESSAGE?: string;
  DataRecord: Lead[];
  DataDetails?: any;
  TotalCount: number;
}

export interface LeadListParams {
  statusType: LeadStatusType;
}

export interface LeadsData {
  leads: Lead[];
  totalCount: number;
  statusType: LeadStatusType;
}

export interface LeadsError {
  code: 'NETWORK_ERROR' | 'NOT_FOUND' | 'UNKNOWN_ERROR';
  message: string;
  originalError?: any;
}

/**
 * Lead Detail API Response
 * From Expo: /App/webservice/LeadReportFindById
 */
export interface LeadDetailResponse {
  ERROR: string; // "0" for success
  MESSAGE?: string;
  LeadList?: Lead[]; // API returns array, we use first element
}
