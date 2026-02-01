import apiCallService from '../../../services/apiCallService';
import {
  ClientCompanyListResponse,
  CompVehicleTypeResponse,
  CityAreaResponse,
  YardResponse,
  CreateLeadPayload,
  CreateLeadResponse
} from '../types';

export const fetchClientCompanyList = async (): Promise<ClientCompanyListResponse> => {
  const request = {
    service: '/App/webservice/ClientCompanyList',
    body: { Version: '2', TypeName: 'Lead' },
  };
  return apiCallService.post(request) as Promise<ClientCompanyListResponse>;
};

export const fetchCompanyVehicleTypes = async (companyId: string | number): Promise<CompVehicleTypeResponse> => {
  const request = {
    service: `/App/webservice/CompanyVehicleList?companyId=${companyId}`,
  };
  return apiCallService.post(request) as Promise<CompVehicleTypeResponse>;
};

export const fetchCityAreaList = async (cityId: string | number): Promise<CityAreaResponse> => {
  const request = {
    service: `/App/webservice/CityAreaList?CityId=${cityId}`,
    body: { Version: '2' },
  };
  return apiCallService.post(request) as Promise<CityAreaResponse>;
};

export const fetchYardList = async (stateId: string | number): Promise<YardResponse> => {
  const request = {
    service: '/App/webservice/YardList',
    body: { Version: '2', StateId: stateId },
  };
  return apiCallService.post(request) as Promise<YardResponse>;
};

export const submitCreateLead = async (payload: CreateLeadPayload): Promise<CreateLeadResponse> => {
  const request = {
    service: '/App/webservice/CreateLead',
    body: payload,
  };
  const response = await apiCallService.post(request);
  // Normalize response error key if inconsistent
  return {
    ERROR: response.ERROR || response.Error || '1',
    MESSAGE: response.MESSAGE || 'Unknown Error'
  };
};
