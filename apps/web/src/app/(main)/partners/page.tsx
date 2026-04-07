'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Search, Phone, Mail, MapPin, Loader2, Building2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePartnerStore } from '@/stores/partner-store';
import { useTranslation } from '@/hooks/useTranslation';
import type { Partner } from '@/types';
import { getToken } from '@/lib/auth';
import CustomerAddDialog, { type CustomerFormData } from '@/components/shadcn-studio/blocks/dashboard-dialog-14/customer-add-dialog';

// Weekday route tabs - Monday to Friday abbreviated in Mongolian
const WEEKDAY_IDS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;

// Sub-filter options
const SUB_FILTER_IDS = ['all', 'arrived', 'far'] as const;

// Partner Row Component
function PartnerRow({ partner, onClick }: { partner: Partner; onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <TableRow 
      className="cursor-pointer hover:bg-muted/50"
      onClick={onClick}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{partner.name}</p>
            {partner.erp_uuid && (
              <p className="text-xs text-muted-foreground">ERP: {partner.erp_uuid.slice(0, 8)}...</p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        {partner.phone ? (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{partner.phone}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        {partner.email ? (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{partner.email}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        {partner.city || partner.street1 ? (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="truncate max-w-[200px]">
              {[partner.city, partner.street1].filter(Boolean).join(', ')}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{t('partners.active')}</Badge>
      </TableCell>
    </TableRow>
  );
}

// Partner Detail Modal/Sheet content
function PartnerDetail({ partner, onClose }: { partner: Partner; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Card className="fixed right-4 top-20 w-96 z-50 shadow-xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{partner.name}</h3>
              <p className="text-sm text-muted-foreground">{t('partners.partner')}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="space-y-4">
          {partner.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t('partners.phone')}</p>
                <p className="font-medium">{partner.phone}</p>
              </div>
            </div>
          )}
          
          {partner.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t('partners.email')}</p>
                <p className="font-medium">{partner.email}</p>
              </div>
            </div>
          )}
          
          {(partner.city || partner.street1 || partner.street2) && (
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t('partners.address')}</p>
                <p className="font-medium">
                  {[partner.street1, partner.street2, partner.city].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          <Button className="flex-1">{t('partners.createOrder')}</Button>
          <Button variant="outline" className="flex-1">{t('partners.details')}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PartnersPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    partners,
    selectedPartner,
    isLoading,
    error,
    filters,
    fetchPartners,
    setSearch,
    selectPartner,
  } = usePartnerStore();

  const [searchInput, setSearchInput] = useState('');
  const [selectedDay, setSelectedDay] = useState('monday');
  const [subFilter, setSubFilter] = useState('all');
  // Default sort by name (asc) for consistent, readable partner lists
  const [sortField, setSortField] = useState<'name' | 'companyCode' | null>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Weekday config with translations
  const WEEKDAYS = WEEKDAY_IDS.map(id => ({
    id,
    label: t(`partners.weekdays.${id}Short` as any),
    fullName: t(`partners.weekdays.${id}` as any),
  }));

  // Sub-filter config with translations
  const SUB_FILTERS = SUB_FILTER_IDS.map(id => ({
    id,
    label: t(`partners.subFilters.${id}` as any),
  }));

  // Get current weekday and set it as default
  useEffect(() => {
    const today = new Date().getDay();
    const dayMap: { [key: number]: string } = {
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
    };
    if (dayMap[today]) {
      setSelectedDay(dayMap[today]);
    }
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleSort = (field: 'name' | 'companyCode') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedPartners = useMemo(() => {
    if (!sortField) return partners;
    return [...partners].sort((a, b) => {
      const aVal = (a[sortField] != null ? a[sortField]! : '').toLowerCase();
      const bVal = (b[sortField] != null ? b[sortField]! : '').toLowerCase();
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [partners, sortField, sortDirection]);

  const handleAddCustomer = (data: CustomerFormData) => {
    console.log('New customer data:', data);
    // TODO: Call API to add customer
    // After successful add, refresh the list
    fetchPartners();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">{t('partners.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('partners.totalCount', { count: partners.length })}
            </p>
          </div>
          <CustomerAddDialog
            trigger={
              <Button>
                <Users className="mr-2 h-4 w-4" />
                {t('partners.addNewPartner')}
              </Button>
            }
            onSubmit={handleAddCustomer}
          />
        </div>

        {/* Weekday Route Tabs */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">{t('partners.route')}</p>
          <Tabs value={selectedDay} onValueChange={setSelectedDay}>
            <TabsList className="bg-muted p-1 rounded-lg">
              {WEEKDAYS.map((day) => (
                <TabsTrigger
                  key={day.id}
                  value={day.id}
                  className="min-w-[48px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md px-4 py-2 text-sm font-medium transition-all"
                >
                  {day.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Sub-filter Tabs */}
        <div className="mb-6">
          <Tabs value={subFilter} onValueChange={setSubFilter}>
            <TabsList className="bg-transparent p-0 h-auto gap-2">
              {SUB_FILTERS.map((filter) => (
                <TabsTrigger
                  key={filter.id}
                  value={filter.id}
                  className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=inactive]:bg-muted/50 rounded-full px-4 py-1.5 text-sm font-medium border-0 shadow-none"
                >
                  {filter.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('partners.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Partners Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : partners.length === 0 ? (
          <div className="text-center py-20">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">{t('partners.noPartners')}</h3>
            <p className="text-muted-foreground">{t('partners.noSearchResults')}</p>
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      {t('partners.name')}
                      {sortField === 'name' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-40" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>{t('partners.phone')}</TableHead>
                  <TableHead>{t('partners.email')}</TableHead>
                  <TableHead>{t('partners.address')}</TableHead>
                  <TableHead>{t('partners.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPartners.map((partner) => (
                  <PartnerRow 
                    key={partner.id} 
                    partner={partner} 
                    onClick={() => router.push(`/partners/${partner.id}`)}
                  />
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Selected Partner Detail */}
        {selectedPartner && (
          <PartnerDetail 
            partner={selectedPartner} 
            onClose={() => selectPartner(null)} 
          />
        )}
      </div>
    </div>
  );
}
