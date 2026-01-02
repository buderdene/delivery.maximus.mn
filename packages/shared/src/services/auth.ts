/**
 * Auth Service
 * Platform-agnostic authentication
 */

import { getApiConfig } from './config';
import type { LoginCredentials, AuthResponse, User, Warehouse } from '../types';

interface RestLoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: number;
    name: string;
    email: string;
    is_active: number;
    delivery_type: string;
    sales_note?: string;
    partner_id?: number;
  };
  erp_user?: number;
  erp_routeId?: string;
  erp_details?: {
    routeId: string;
    routeName: string;
    routeIMEI: string;
    routeRange: string;
    routeBussinesRegion?: string;
    warehouses: Array<{
      uuid: string;
      name: string;
      priceTypeId: string;
      isdefault: boolean;
      isSale: boolean;
    }>;
  };
}

export async function login(credentials: LoginCredentials): Promise<{
  success: boolean;
  data?: AuthResponse;
  error?: string;
}> {
  const { authUrl } = getApiConfig();

  try {
    const response = await fetch(`${authUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}: Нэвтрэхэд алдаа гарлаа`,
      };
    }

    const data: RestLoginResponse = await response.json();

    // Convert ERP warehouses
    const warehouses: Warehouse[] = (data.erp_details?.warehouses || []).map((w) => ({
      id: w.uuid,
      name: w.name,
      erp_uuid: w.uuid,
      is_sale: w.isSale,
      is_default: w.isdefault,
      price_type_id: w.priceTypeId,
    }));

    // Build user object
    const user: User = {
      id: String(data.user.id),
      name: data.user.name,
      email: data.user.email,
      delivery_type: data.user.delivery_type,
      warehouses,
      erp_user: data.erp_user,
      erp_routeId: data.erp_details?.routeId,
    };

    return {
      success: true,
      data: {
        access_token: data.access_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
        user,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Сүлжээний алдаа',
    };
  }
}

export async function logout(token: string): Promise<boolean> {
  const { authUrl } = getApiConfig();

  try {
    await fetch(`${authUrl}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return true;
  } catch {
    return false;
  }
}
