import { ToastAndroid } from 'react-native';
import apiCallService from '../../../services/apiCallService';
import { LEAD_LIST_STATUS_MAPPING } from '../../../constants';
import { LeadListStatuswiseRespDataRecord, MyTasksResponse } from '../../myTasks/types';

export const fetchQcLeadsApi = async (): Promise<LeadListStatuswiseRespDataRecord[]> => {
  try {
    const request = {
      service: '/App/webservice/LeadListStatuswise',
      body: {
        Version: '2',
        StatusId: LEAD_LIST_STATUS_MAPPING['QCLeads'],
      },
    };

    const response = await apiCallService.post(request) as MyTasksResponse;

    if (response?.Error && response.Error !== '0') {
      ToastAndroid.show(response.MESSAGE || 'Failed to fetch QC leads', ToastAndroid.SHORT);
      return [];
    }

    return response.DataRecord || [];
  } catch (error: any) {
    console.error('[QCLeads] API error:', error);
    ToastAndroid.show('Failed to fetch QC leads', ToastAndroid.SHORT);
    return [];
  }
};
