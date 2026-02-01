import { create } from 'zustand';
import {
  fetchClientCompanyList,
  fetchCompanyVehicleTypes,
  fetchCityAreaList,
  fetchYardList,
  submitCreateLead
} from '../api/createLead.api';
import {
  ClientCompanyListRecord,
  CompVehicleTypeRecord,
  CityAreaRecord,
  YardRecord,
  CreateLeadPayload
} from '../types';
import { STATE_CITY_LIST } from '../../../constants';

export interface CreateLeadFormData {
  clientName: string;
  vehicleType: string;      // This maps to Vehicle Category (Retail/Repo logic relies on this display name)
  vehicleCategory: string;  // 2W/4W
  clientCity: string;
  registrationNumber: string;
  prospectNumber: string;
  customerName: string;
  customerMobile: string;
  customerState: string;
  customerCity: string;
  customerArea: string;
  customerPin: string;
  customerAddress: string;
  yardName: string;
  chassisNo: string;
}

interface DropdownData {
  companies: ClientCompanyListRecord[];
  clientCities: string[]; // List of names
  states: string[];       // List of names
  customerCities: string[]; // Filtered by selected state
  vehicleTypes: CompVehicleTypeRecord[]; // Specific types for selected company
  areas: CityAreaRecord[];
  yards: YardRecord[];
}

interface CreateLeadState {
  formData: CreateLeadFormData;
  dropdowns: DropdownData;
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;

  // Actions
  initialize: () => Promise<void>;
  setField: (key: keyof CreateLeadFormData, value: string) => void;
  fetchVehicleTypesForCompany: (companyName: string) => Promise<void>;
  fetchAreasForCity: (cityName: string) => Promise<void>;
  fetchCitiesForState: (stateName: string) => void; // Local filter
  fetchYardsForState: (stateName: string) => Promise<void>;
  submit: () => Promise<boolean>;
  reset: () => void;
}

const INITIAL_FORM: CreateLeadFormData = {
  clientName: '',
  vehicleType: '',
  vehicleCategory: '',
  clientCity: '',
  registrationNumber: '',
  prospectNumber: '',
  customerName: '',
  customerMobile: '',
  customerState: '',
  customerCity: '',
  customerArea: '',
  customerPin: '',
  customerAddress: '',
  yardName: '',
  chassisNo: '',
};

export const useCreateLeadStore = create<CreateLeadState>((set, get) => ({
  formData: { ...INITIAL_FORM },
  dropdowns: {
    companies: [],
    clientCities: [], // Start empty, populate from Constants
    states: [],       // Start empty, populate from Constants
    customerCities: [],
    vehicleTypes: [],
    areas: [],
    yards: [],
  },
  isLoading: false,
  error: null,
  successMessage: null,

  reset: () => set({
    formData: { ...INITIAL_FORM },
    dropdowns: { ...get().dropdowns, customerCities: [], vehicleTypes: [], areas: [], yards: [] }, // Keep static lists loaded
    isLoading: false,
    error: null,
    successMessage: null
  }),

  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      // 1. Populate Static Lists from CONSTANTS
      const allStates = STATE_CITY_LIST.STATE_LIST.CircleList.map(s => s.name);
      // For Client Cities, we usually show ALL cities or a subset. Expo used all cities.
      const allCities = STATE_CITY_LIST.CITY_LIST.DataRecord.map(c => c.name);

      set(state => ({
        dropdowns: {
          ...state.dropdowns,
          states: allStates,
          clientCities: allCities,
        }
      }));

      // 2. Fetch Initial Company Data
      const response = await fetchClientCompanyList();
      if (response.Error === '0' && response.DataRecord) {
        set((state) => ({
          dropdowns: { ...state.dropdowns, companies: response.DataRecord || [] },
          isLoading: false
        }));
      } else {
        set({ error: response.MESSAGE || 'Failed to fetch companies', isLoading: false });
      }
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  setField: (key, value) => set((state) => ({
    formData: { ...state.formData, [key]: value }
  })),

  fetchVehicleTypesForCompany: async (companyName: string) => {
    const { dropdowns } = get();
    const company = dropdowns.companies.find(c => c.name === companyName);
    if (!company) return;

    set({ isLoading: true });
    try {
      const response = await fetchCompanyVehicleTypes(company.id);
      set((state) => ({
        dropdowns: { ...state.dropdowns, vehicleTypes: response.DataRecord || [] },
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchCitiesForState: (stateName: string) => {
    const stateObj = STATE_CITY_LIST.STATE_LIST.CircleList.find(s => s.name === stateName);
    if (!stateObj) {
      set(state => ({ dropdowns: { ...state.dropdowns, customerCities: [] } }));
      return;
    }

    const filteredCities = STATE_CITY_LIST.CITY_LIST.DataRecord
      .filter(c => c.stateid === stateObj.id)
      .map(c => c.name);

    set(state => ({
      dropdowns: { ...state.dropdowns, customerCities: filteredCities }
    }));
  },

  fetchAreasForCity: async (cityName: string) => {
    // Find ID from Constant List
    const city = STATE_CITY_LIST.CITY_LIST.DataRecord.find(c => c.name === cityName);
    if (!city) return;

    set({ isLoading: true });
    try {
      const response = await fetchCityAreaList(city.id);
      set((state) => ({
        dropdowns: { ...state.dropdowns, areas: response.DataRecord || [] },
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchYardsForState: async (stateName: string) => {
    const stateObj = STATE_CITY_LIST.STATE_LIST.CircleList.find(s => s.name === stateName);
    if (!stateObj) return;

    set({ isLoading: true });
    try {
      const response = await fetchYardList(stateObj.id);
      set((state) => ({
        dropdowns: { ...state.dropdowns, yards: response.DataRecord || [] },
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  submit: async () => {
    const { formData, dropdowns } = get();
    set({ isLoading: true, error: null });

    // Lookup IDs
    const company = dropdowns.companies.find(c => c.name === formData.clientName);
    const vehicleTypeObj = dropdowns.vehicleTypes.find(v => v.name === formData.vehicleType);
    const stateObj = STATE_CITY_LIST.STATE_LIST.CircleList.find(s => s.name === formData.customerState);
    const cityObj = STATE_CITY_LIST.CITY_LIST.DataRecord.find(c => c.name === formData.customerCity);

    // For Retail: City/Area IDs required
    // For Repo: Yard ID required
    const isRepo = formData.vehicleType.toLowerCase() === 'repo';

    const yardObj = isRepo ? dropdowns.yards.find(y => y.name === formData.yardName) : null;
    const areaObj = !isRepo ? dropdowns.areas.find(a => a.name === formData.customerArea) : null;
    const clientCityObj = STATE_CITY_LIST.CITY_LIST.DataRecord.find(c => c.name === formData.clientCity);

    // Payload Normalization
    const payload: CreateLeadPayload = {
      CompanyId: Number(company?.id || 0),
      RegNo: formData.registrationNumber.toUpperCase(),
      ProspectNo: formData.prospectNumber.toUpperCase(),
      CustomerName: formData.customerName.toUpperCase(),
      CustomerMobileNo: formData.customerMobile,
      Vehicle: formData.vehicleCategory.toUpperCase(), // 2W, 4W
      StateId: Number(stateObj?.id || 0),
      City: !isRepo && cityObj ? Number(cityObj.id) : "",
      Area: !isRepo && areaObj ? Number(areaObj.id) : "",
      Pincode: formData.customerPin,
      ManufactureDate: "",
      ChassisNo: isRepo ? formData.chassisNo.toUpperCase() : "",
      EngineNo: "",
      StatusId: 1,
      ClientCityId: !isRepo && clientCityObj ? Number(clientCityObj.id) : "",
      VehicleType: Number(vehicleTypeObj?.id || 0),
      vehicleCategoryId: Number(vehicleTypeObj?.id || 0),
      VehicleTypeValue: formData.vehicleCategory.toUpperCase(),
      YardId: isRepo && yardObj ? Number(yardObj.id) : 0,
      autoAssign: 1,
      version: "2",
    };

    try {
      const response = await submitCreateLead(payload);
      if (response.ERROR === '0') {
        set({ successMessage: response.MESSAGE || 'Lead Created Successfully', isLoading: false });
        return true;
      } else {
        set({ error: response.MESSAGE || 'Submission Failed', isLoading: false });
        return false;
      }
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      return false;
    }
  }
}));
