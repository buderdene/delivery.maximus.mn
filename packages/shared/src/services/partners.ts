/**
 * Partners Service - REST API
 * ERP: http://203.21.120.60:8080/maximus_trade_test/hs
 */

import { getApiConfig } from './config';
import type { Partner } from '../types';

// ERP API Response Types
interface ERPCompany {
  uuid: string;
  name: string;
  phone: string;
  address: string;
  longitude: number;
  latitude: number;
  debtLimit: number;
  salesLimit: number;
  balance: number;
  balanceDate: string;
  routeId: string;
  routeName: string;
  debtDays: number;
}

interface ERPCompaniesResponse {
  companies: ERPCompany[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

function mapERPCompany(raw: ERPCompany): Partner {
  return {
    id: raw.uuid,
    name: raw.name,
    phone: raw.phone,
    email: null,
    street1: raw.address,
    street2: null,
    city: null,
    erp_uuid: raw.uuid,
    longitude: raw.longitude,
    latitude: raw.latitude,
    balance: raw.balance,
    debtLimit: raw.debtLimit,
    debtDays: raw.debtDays,
    routeId: raw.routeId,
    routeName: raw.routeName,
    created_at: null,
    updated_at: raw.balanceDate,
  };
}

export async function getPartners(
  token: string | null,
  options?: { search?: string; routeId?: string; page?: number; pageSize?: number }
): Promise<{
  success: boolean;
  data?: Partner[];
  error?: string;
}> {
  const { erpUrl } = getApiConfig();
  
  const params = new URLSearchParams({
    page: String(options?.page || 1),
    pageSize: String(options?.pageSize || 400),
  });
  
  if (options?.routeId) params.append('routeId', options.routeId);
  if (options?.search) params.append('name', options.search);

  try {
    const response = await fetch(`${erpUrl}/cl/Companies?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data: ERPCompaniesResponse = await response.json();

    return {
      success: true,
      data: data.companies.map(mapERPCompany),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Сүлжээний алдаа',
    };
  }
}

export async function getPartner(
  token: string | null,
  id: string
): Promise<{
  success: boolean;
  data?: Partner;
  error?: string;
}> {
  // ERP API-д нэг харилцагч авах endpoint байхгүй бол 
  // бүх харилцагчаас хайж олно
  const result = await getPartners(token);
  
  if (result.success && result.data) {
    const partner = result.data.find(p => p.id === id || p.erp_uuid === id);
    if (partner) {
      return { success: true, data: partner };
    }
  }
  
  return { success: false, error: 'Харилцагч олдсонгүй' };
}
