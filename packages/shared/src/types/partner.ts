/**
 * Partner/Customer Types
 * Shared between web and mobile
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
  longitude?: number;
  latitude?: number;
  balance?: number;
  debtLimit?: number;
  debtDays?: number;
  routeId?: string;
  routeName?: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface PartnerFilters {
  search?: string;
  routeId?: string;
  page?: number;
  perPage?: number;
}
