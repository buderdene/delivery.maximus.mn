// Auth API configuration
const API_BASE_URL = 'https://cloud.maximus.mn/api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface Warehouse {
  uuid: string;
  name: string;
  priceTypeId: string;
  isdefault: boolean;
  isSale: boolean;
}

export interface ErpDetails {
  routeId: string;
  routeName: string;
  routeIMEI: string;
  routeRange: string;
  routeBussinesRegion: string | null;
  warehouses: Warehouse[];
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  is_active: number;
  delivery_type: string;
  sales_note: string | null;
  default_company_id: number;
  partner_id: number | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  user?: AuthUser;
  erp_details?: ErpDetails;
}

export interface AuthError {
  message: string;
  errors?: Record<string, string[]>;
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error: AuthError = await response.json().catch(() => ({
      message: 'Login failed. Please try again.',
    }));
    throw new Error(error.message || 'Authentication failed');
  }

  const data: AuthResponse = await response.json();
  
  // Store token, user and ERP details in localStorage
  if (typeof window !== 'undefined' && data.access_token) {
    localStorage.setItem('auth_token', data.access_token);
    if (data.user) {
      localStorage.setItem('auth_user', JSON.stringify(data.user));
    }
    if (data.erp_details) {
      localStorage.setItem('erp_details', JSON.stringify(data.erp_details));
    }
  }

  return data;
}

export async function logout(): Promise<void> {
  const token = getToken();
  
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
      console.error('Logout error:', error);
    }
  }

  // Clear local storage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('erp_details');
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('auth_user');
  return user ? JSON.parse(user) : null;
}

export function getErpDetails(): ErpDetails | null {
  if (typeof window === 'undefined') return null;
  const details = localStorage.getItem('erp_details');
  return details ? JSON.parse(details) : null;
}

export function getRouteId(): string | null {
  const details = getErpDetails();
  return details?.routeId || null;
}

export function getDefaultWarehouse(): Warehouse | null {
  const details = getErpDetails();
  if (!details?.warehouses) return null;
  return details.warehouses.find(w => w.isdefault) || details.warehouses[0] || null;
}

export function getSalesWarehouse(): Warehouse | null {
  const details = getErpDetails();
  if (!details?.warehouses) return null;
  return details.warehouses.find(w => w.isSale) || null;
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
