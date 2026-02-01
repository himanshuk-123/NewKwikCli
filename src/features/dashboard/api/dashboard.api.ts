import apiCallService from '../../../services/apiCallService';
import { DashboardResponse } from '../types';

export const getDashboardData = async (): Promise<DashboardResponse> => {
  const request = {
    service: '/App/webservice/AppDashboard',
    body: {
      Version: '2',
    },
  };

  try {
    const response = await apiCallService.post(request);
    return response as DashboardResponse;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch dashboard data');
  }
};
