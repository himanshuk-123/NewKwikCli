export interface AppLeadCompletedResp {
  Error?: string;
  Status?: string;
  MESSAGE?: string;
  DataRecord?: AppLeadCompletedDataRecord[];
  DataDetails?: null;
  TotalCount?: number;
}

export interface AppLeadCompletedDataRecord {
  ValuatorId?: number;
  qcpending?: number;
  qchold?: number;
  qccompleted?: number;
  completedLead?: number;
}
