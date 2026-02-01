import { ToastAndroid } from 'react-native';
import apiCallService from '../../../services/apiCallService';
import { LEAD_LIST_STATUS_MAPPING } from '../../../constants';
import { LeadListStatuswiseRespDataRecord, LeadListStatusWiseResp } from '../types';

export const fetchLeadsInProgressApi = async (): Promise<LeadListStatuswiseRespDataRecord[]> => {
  try {

    // StatusId: LEAD_LIST_STATUS_MAPPING['QCHoldLeads'] is "7" based on constants
    const request = {
      service: '/App/webservice/LeadListStatuswise',
      body: {
        Version: '2',
        StatusId: LEAD_LIST_STATUS_MAPPING['QCHoldLeads'],
      },
    };

    const response = await apiCallService.post(request) as LeadListStatusWiseResp;

    if (response.Error !== '0') {
      ToastAndroid.show(response.MESSAGE || 'Failed to fetch leads', ToastAndroid.LONG);
      return [];
    }

    return response.DataRecord || [];

  } catch (error: any) {
    ToastAndroid.show('Something went wrong', ToastAndroid.SHORT);
    throw error;
  }
};
