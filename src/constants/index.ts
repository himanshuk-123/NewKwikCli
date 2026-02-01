/**
 * Application Constants
 */

export const DRAWER_ROUTES_DISABLED_FOR_ROLEID = [20];

export const LEAD_LIST_STATUS_MAPPING: Record<string, string> = {
  SCLeads: "1",
  ROLeads: "2",
  AssignedLeads: "3",
  ReassignedLeads: "4",
  RoConfirmationLeads: "5",
  QCLeads: "6",
  QCHoldLeads: "7",
  PricingLeads: "8",
  CompletedLeads: "9",
  OutofTatLeads: "10",
  DuplicateLeads: "11",
  RejectedLeads: "13",
};

/**
 * Mapping for vehicle type from API response.
 * '2W' => 1, '3W' => 2, etc.
 */
export const VEHICLE_TYPE_LIST_MAPPING: Record<string, number | string> = {
  "2W": 1,
  "3W": 2,
  "4W": 3,
  "5": "FE",
  "4": "CV",
  "6": "CE",
  fe: 5,
  cv: 4,
  ce: 6,
  "1": "2W",
  "2": "3W",
  "3": "4W",
};

export * from './StateCityList';
