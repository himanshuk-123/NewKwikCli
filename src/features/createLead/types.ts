export interface ClientCompanyListRecord {
  id: number;
  name: string;
  CityName: string;
}

export interface ClientCompanyListResponse {
  Error: string;
  MESSAGE: string;
  DataRecord?: ClientCompanyListRecord[];
}

export interface CompVehicleTypeRecord {
  id: number;
  name: string;
}

export interface CompVehicleTypeResponse {
  Error: string;
  MESSAGE: string;
  DataRecord?: CompVehicleTypeRecord[];
}

export interface CityAreaRecord {
  id: number;
  name: string;
  pincode: number;
  city_id: number;
}

export interface CityAreaResponse {
  Error: string;
  MESSAGE: string;
  DataRecord?: CityAreaRecord[];
}

export interface YardRecord {
  id: number;
  name: string;
  state_id: number;
}

export interface YardResponse {
  Error: string;
  MESSAGE: string;
  DataRecord?: YardRecord[];
}

export interface CreateLeadPayload {
  CompanyId: number;
  RegNo: string;
  ProspectNo: string;
  CustomerName: string;
  CustomerMobileNo: string;
  Vehicle: string; // Vehicle Category Name (2W, 4W)
  StateId: number;
  City: number | string;
  Area: number | string;
  Pincode: string;
  ManufactureDate: string;
  ChassisNo: string;
  EngineNo: string;
  StatusId: number;
  ClientCityId: number | string;
  VehicleType: number; // Vehicle Type ID
  vehicleCategoryId: number; // Same as VehicleType
  VehicleTypeValue: string; // Vehicle Category Name (2W, 4W)
  YardId: number | 0;
  autoAssign: number;
  version: string;
}

export interface CreateLeadResponse {
  ERROR: string; // Note: API seems to use ERROR vs Error inconsistently based on analysis, using typical pattern
  MESSAGE: string;
}
