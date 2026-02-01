export interface AppStepListDataRecord {
  Id?: number;
  Name?: string;
  VehicleType?: string;
  Images?: boolean;
  Display?: number;
  Questions?: string | string[] | null;
  Answer?: string | null;
  Appcolumn?: string;
}

export interface AppStepListResponse {
  ERROR: string;
  MESSAGE: string;
  DataList: AppStepListDataRecord[];
}
