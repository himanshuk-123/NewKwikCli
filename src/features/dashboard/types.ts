export interface AppDashboardType {
  Openlead?: number;
  Assignedlead?: number;
  ROlead?: number;
  ReAssigned?: number;
  RoConfirmation?: number;
  QC?: number;
  QCHold?: number;
  Pricing?: number;
  CompletedLeads?: number;
  OutofTATLeads?: number;
  DuplicateLeads?: number;
  PaymentRequest?: number;
  RejectedLeads?: number;
  [key: string]: any;
}

export interface DashboardResponse {
  Error: number | string;
  Message: string;
  Status: string;
  DataRecord?: AppDashboardType[];
}
