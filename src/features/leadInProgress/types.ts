export interface LeadListStatuswiseRespDataRecord {
  Id: number;
  LeadUId: string;
  CustomerName: string;
  CustomerMobileNo: string;
  VehicleType: string;
  Vehicle: string;
  LeadType: number;
  LeadTypeName: string;
  StatusId: number;
  Status: string;
  AddedBy: number;
  AddedByDate: string;
  UpdatedBy: number;
  UpdatedByDate: string;
  RegNo: string;
  ChassisNo: string;
  EngineNo: string;
  ProspectNo: string;
  LeadRemark: string;
  ViewUrl: string;
  QcUpdateDate?: string;
}

export interface LeadListStatusWiseResp {
  Error: string;
  MESSAGE: string;
  DataRecord: LeadListStatuswiseRespDataRecord[];
}
