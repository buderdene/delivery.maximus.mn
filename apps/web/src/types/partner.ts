/**
 * Partner/Customer Types for Sales Maximus
 * ERP: 1C Companies API
 */

export interface Partner {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  street1: string | null;
  street2: string | null;
  city: string | null;
  erp_uuid: string | null;
  // ERP additional fields
  longitude: number | null;
  latitude: number | null;
  balance: number | null;
  debtLimit: number | null;
  debtDays: number | null;
  salesLimit: number | null;
  routeId: string | null;
  routeName: string | null;
  // Company info
  companyCode: string | null;
  headCompanyName: string | null;
  headCompanyRegister: string | null;
  image: string | null;
  // Timestamps
  created_at: string | null;
  updated_at: string | null;
}

export interface PartnerFilters {
  search?: string;
  routeId?: string;
  page?: number;
  pageSize?: number;
}
