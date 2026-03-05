/**
 * Delivery App Auth Store
 * JWT authentication with employee_code + system_pin
 * API: https://cloud.maximus.mn/api/delivery/auth
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://cloud.maximus.mn/api/delivery';

// Worker types
export interface Department {
  id: number;
  name: string;
}

export interface Job {
  id: number;
  name: string;
}

export interface Worker {
  id: number;
  employee_code: string;
  name: string;
  phone: string | null;
  avatar: string | null;
  worker_type: 'driver' | 'deliverer' | 'helper' | 'other' | string;
  worker_type_label: string;
  is_available?: boolean;
  department?: Department | null;
  job?: Job | null;
}

export interface ErpRoute {
  routeId: string;
  routeName: string;
  routeIMEI: string;
  routeRange: string;
  routeBussinesRegion: string;
  warehouses: Array<{
    uuid: string;
    name: string;
    priceTypeId: string;
    priceTypeName: string;
    isDefault: boolean;
    isSale: boolean;
  }>;
}

export interface EmployeeDetail {
  general: {
    employee_code: string;
    last_name: string;
    first_name: string;
    register: string;
    gender: string;
    avatar: string | null;
    department: string;
    job_position: string;
    work_location: string;
    mobile_phone: string | null;
    work_phone: string | null;
    work_email: string | null;
  };
  warehouses: Array<{ uuid: string; name: string }>;
  routes: Array<{ uuid: string; name: string }>;
  business_regions: Array<{ uuid: string; name: string }>;
  delivery_zones: Array<{ uuid: string; name: string }>;
}

export interface Car {
  id: number;
  plate: string;
  brand: string;
  model: string;
}

export interface CarDetail {
  id: number;
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  color: string | null;
  max_cbm: number;
  fuel_type: string | null;
  status: string;
  status_label: string;
  status_color: string;
  image_url: string | null;
  zones: Array<{ id: number; name: string }>;
}

export interface Coworker {
  id: number;
  name: string;
  phone: string | null;
  avatar: string | null;
  worker_type: string;
  worker_type_label: string;
  is_available: boolean;
}

export interface DeliveryInfo {
  worker: {
    id: number;
    employee_id: number;
    worker_type: string;
    worker_type_label: string;
    is_available: boolean;
    license_number: string | null;
    license_expiry: string | null;
  };
  car: CarDetail | null;
  coworkers: Coworker[];
}

export interface TodayStats {
  total_orders: number;
  pending: number;
  in_progress: number;
  delivered: number;
  failed: number;
  total_amount: number;
  delivered_amount: number;
}

interface AuthState {
  worker: Worker | null;
  token: string | null;
  erpRoutes: ErpRoute[] | null;
  employeeDetail: EmployeeDetail | null;
  deliveryInfo: DeliveryInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (employeeCode: string, systemPin: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  getToken: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      worker: null,
      token: null,
      erpRoutes: null,
      employeeDetail: null,
      deliveryInfo: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (employeeCode: string, systemPin: string) => {
        set({ isLoading: true, error: null });

        console.log('Delivery Auth: Starting login for employee code', employeeCode);

        try {
          const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ 
              employee_code: employeeCode, 
              system_pin: systemPin 
            }),
          });

          const responseText = await response.text();
          console.log('Delivery Auth: Response status:', response.status);
          console.log('Delivery Auth: Response body (first 500 chars):', responseText.substring(0, 500));

          let data: any;
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error('Delivery Auth: Failed to parse JSON. Server returned non-JSON response.');
            set({
              isLoading: false,
              error: `Серверийн алдаа (${response.status}). JSON бус хариу ирлээ.`,
            });
            return false;
          }

          if (response.ok && data.access_token && data.client) {
            // Map cloud.maximus.mn auth response to Worker format
            const client = data.client;
            const empDetail = data.employee_detail?.general;
            
            // Determine department from employee_detail
            const departmentName = empDetail?.department || null;
            const jobName = empDetail?.job_position || null;
            
            // Map department name to id for checker type logic
            // "Агуулах" (warehouse) department maps to id=3
            const deptId = departmentName === 'Агуулах' ? 3 : 0;
            
            const worker: Worker = {
              id: client.id,
              employee_code: empDetail?.employee_code || client.corporate_id || employeeCode,
              name: client.name,
              phone: empDetail?.mobile_phone || null,
              avatar: empDetail?.avatar || null,
              worker_type: client.sub_type || 'delivery',
              worker_type_label: jobName || client.sub_type || 'Хүргэлт',
              is_available: client.is_active,
              department: departmentName ? { id: deptId, name: departmentName } : null,
              job: jobName ? { id: 0, name: jobName } : null,
            };

            console.log('Delivery Auth: Login successful, worker:', worker.name, 'dept:', departmentName, 'job:', jobName);
            if (data.delivery_info) {
              console.log('Delivery Auth: Car:', data.delivery_info.car?.plate, data.delivery_info.car?.brand, data.delivery_info.car?.model);
              console.log('Delivery Auth: Coworkers:', data.delivery_info.coworkers?.length || 0);
            }
            set({
              worker,
              token: data.access_token,
              erpRoutes: data.erp_details || null,
              employeeDetail: data.employee_detail || null,
              deliveryInfo: data.delivery_info || null,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return true;
          } else if (response.ok && data.success && data.data?.token) {
            // Legacy response format support
            console.log('Delivery Auth: Login successful (legacy), worker:', data.data.worker.name);
            set({
              worker: data.data.worker,
              token: data.data.token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return true;
          } else {
            const errorMsg = data.message || data.error || 'Нэвтрэхэд алдаа гарлаа';
            console.log('Delivery Auth: Login failed:', errorMsg);
            set({
              isLoading: false,
              error: errorMsg,
            });
            return false;
          }
        } catch (error) {
          console.error('Delivery Auth: Network error:', error);
          set({
            isLoading: false,
            error: 'Сүлжээний алдаа. Интернэт холболтоо шалгана уу.',
          });
          return false;
        }
      },

      logout: async () => {
        const token = get().token;
        
        // Try to invalidate token on server
        if (token) {
          try {
            await fetch(`${API_BASE_URL}/auth/logout`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
              },
            });
          } catch (error) {
            console.log('Logout API error (ignored):', error);
          }
        }

        set({
          worker: null,
          token: null,
          erpRoutes: null,
          employeeDetail: null,
          deliveryInfo: null,
          isAuthenticated: false,
          error: null,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      getToken: () => {
        return get().token;
      },
    }),
    {
      name: 'delivery-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        worker: state.worker, 
        token: state.token, 
        erpRoutes: state.erpRoutes,
        employeeDetail: state.employeeDetail,
        deliveryInfo: state.deliveryInfo,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
