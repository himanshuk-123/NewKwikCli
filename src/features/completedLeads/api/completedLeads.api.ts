import apiCallService from '../../../services/apiCallService';
import { AppLeadCompletedDataRecord, AppLeadCompletedResp } from '../types';
import { ToastAndroid } from 'react-native';

export const fetchAppLeadCompletedApi = async (): Promise<AppLeadCompletedDataRecord | null> => {
  try {
    const request = {
      service: 'App/webservice/AppLeadCompleted',
      body: {
        Version: '2',
      },
    };

    const response = await apiCallService.post(request) as AppLeadCompletedResp;

    if (response?.Error && response.Error !== '0') {
      ToastAndroid.show(response.MESSAGE || 'Failed to load completed leads', ToastAndroid.SHORT);
      return null;
    }

    if (response?.DataRecord && response.DataRecord.length > 0) {
      return response.DataRecord[0];
    }

    return {
      completedLead: 0,
      qccompleted: 0,
      qchold: 0,
      qcpending: 0,
      ValuatorId: 0,
    };
  } catch (error: any) {
    console.error('[AppLeadCompleted] API error:', error);
    ToastAndroid.show('Failed to load completed leads', ToastAndroid.SHORT);
    return null;
  }
};
