import { ToastAndroid } from 'react-native';
import apiCallService from '../../../services/apiCallService';
import { LEAD_LIST_STATUS_MAPPING } from '../../../constants';
import { LeadListStatuswiseRespDataRecord, LeadListStatusWiseResp, AppLeadDaybookDataRecord, AppLeadDaybookResp } from '../types';

export const fetchValuationCompletedLeadsApi = async (): Promise<LeadListStatuswiseRespDataRecord[]> => {
  try {
    const request = {
      service: '/App/webservice/LeadListStatuswise',
      body: {
        Version: '2',
        StatusId: LEAD_LIST_STATUS_MAPPING['CompletedLeads'],
      },
    };

    // The generic type in apiCallService might handle mapping, but here we cast response for safety
    const response = await apiCallService.post(request) as LeadListStatusWiseResp;

    if (response.Error !== '0') {
      ToastAndroid.show(response.MESSAGE || 'Failed to fetch completed leads', ToastAndroid.LONG);
      return [];
    }

    return response.DataRecord || [];

  } catch (error: any) {
    ToastAndroid.show('Something went wrong', ToastAndroid.SHORT);
    throw error;
  }
};

export const fetchLeadDayBookApi = async (): Promise<AppLeadDaybookDataRecord> => {
  try {
    const request = {
      service: '/App/webservice/AppLeadDaybook',
      body: {},
    };

    // Cast response
    const response = await apiCallService.post(request) as AppLeadDaybookResp;

    // Check for DataRecord existence (Expo parity)
    if (response.DataRecord && response.DataRecord.length > 0) {
      return response.DataRecord[0];
    }

    // Only warn if explicit error
    if (response.Error && response.Error !== '0') {
      console.warn('DayBook API Error:', response.MESSAGE);
    }

    return { lastmonth: 0, thismonth: 0, Today: 0 };

  } catch (error: any) {
    console.error('DayBook API Exception:', error);
    return { lastmonth: 0, thismonth: 0, Today: 0 };
  }
};
