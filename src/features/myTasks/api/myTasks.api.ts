import apiCallService from '../../../services/apiCallService';
import { MyTasksResponse, VehicleCountResponse } from '../types';
import { LEAD_LIST_STATUS_MAPPING } from '../../../constants';

export const fetchVehicleCountsApi = async (): Promise<VehicleCountResponse> => {
  const request = {
    service: '/App/webservice/LeadListStatuswiseCount',
    body: {
      Version: '2',
      StatusId: LEAD_LIST_STATUS_MAPPING['AssignedLeads'],
    },
  };

  try {
    const response = await apiCallService.post(request);
    return response as VehicleCountResponse;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch counts');
  }
};

export const fetchMyTasksApi = async (
  page?: number,
  pageSize?: number,
  vehicleTypeValue?: string
): Promise<MyTasksResponse> => {
  const body: any = {
    Version: '2',
    StatusId: LEAD_LIST_STATUS_MAPPING['AssignedLeads'], // 3
  };

  if (page !== undefined && pageSize !== undefined) {
    body.PageNumber = page.toString();
    body.PageSize = pageSize.toString();
  }

  if (vehicleTypeValue) {
    body.VehicleTypeValue = vehicleTypeValue;
  }

  const request = {
    service: '/App/webservice/LeadListStatuswise',
    body,
  };

  try {
    const response = await apiCallService.post(request);
    return response as MyTasksResponse;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch tasks');
  }
};

export const leadAppointmentDateApi = async (leadId: string, appointmentDate: Date): Promise<void> => {
  const request = {
    service: '/App/webservice/LeadAppointmentDate',
    body: {
      LeadId: leadId,
      AppointmentDate: appointmentDate,
    },
  };

  await apiCallService.post(request);
};
