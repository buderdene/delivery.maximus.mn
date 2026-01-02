/**
 * Auth Types
 * Shared between web and mobile
 */

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  delivery_type?: string;
  warehouses?: Warehouse[];
  erp_user?: number;
  erp_routeId?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  erp_uuid?: string;
  is_sale?: boolean;
  is_default?: boolean;
  discount_percent?: number;
  price_type_id?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  user: User;
}

export interface AuthError {
  message: string;
  errors?: Record<string, string[]>;
}
