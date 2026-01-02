'use client';

import { useEffect, useState } from 'react';
import { Users, Search, Phone, Mail, MapPin, Loader2, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePartnerStore } from '@/stores/partner-store';
import type { Partner } from '@/types';
import { getToken } from '@/lib/auth';

// Partner Row Component
function PartnerRow({ partner, onSelect }: { partner: Partner; onSelect: (p: Partner) => void }) {
  return (
    <TableRow 
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onSelect(partner)}
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
        <Badge variant="secondary">Идэвхтэй</Badge>
      </TableCell>
    </TableRow>
  );
}

// Partner Detail Modal/Sheet content
function PartnerDetail({ partner, onClose }: { partner: Partner; onClose: () => void }) {
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
              <p className="text-sm text-muted-foreground">Харилцагч</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="space-y-4">
          {partner.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Утас</p>
                <p className="font-medium">{partner.phone}</p>
              </div>
            </div>
          )}
          
          {partner.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">И-мэйл</p>
                <p className="font-medium">{partner.email}</p>
              </div>
            </div>
          )}
          
          {(partner.city || partner.street1 || partner.street2) && (
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Хаяг</p>
                <p className="font-medium">
                  {[partner.street1, partner.street2, partner.city].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          <Button className="flex-1">Захиалга үүсгэх</Button>
          <Button variant="outline" className="flex-1">Дэлгэрэнгүй</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PartnersPage() {
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

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Харилцагчид</h1>
            <p className="text-muted-foreground mt-1">
              Нийт {partners.length} харилцагч
            </p>
          </div>
          <Button>
            <Users className="mr-2 h-4 w-4" />
            Шинэ харилцагч
          </Button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Харилцагч хайх..."
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
            <h3 className="text-lg font-medium">Харилцагч олдсонгүй</h3>
            <p className="text-muted-foreground">Хайлтын үр дүн олдсонгүй</p>
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Нэр</TableHead>
                  <TableHead>Утас</TableHead>
                  <TableHead>И-мэйл</TableHead>
                  <TableHead>Хаяг</TableHead>
                  <TableHead>Төлөв</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.map((partner) => (
                  <PartnerRow 
                    key={partner.id} 
                    partner={partner} 
                    onSelect={selectPartner}
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
