'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  ArrowLeft, 
  Edit, 
  Building2, 
  Gift, 
  Package, 
  ClipboardList, 
  FileText,
  MapPin,
  Phone,
  Mail,
  FileX,
  Wallet,
  DollarSign,
  BarChart3,
  CreditCard,
  Clock,
  Navigation,
  Hash,
  User,
  Calendar,
  Globe,
  AlertTriangle
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// Pro Components
import { TabsWithVerticalIcon } from '@/components/shadcn-studio/tabs/tabs-05'
import { AccordionIconSubtitle } from '@/components/shadcn-studio/accordion/accordion-08'

import { usePartnerStore } from '@/stores/partner-store'
import { useCartStore } from '@/stores/cart-store'
import { getCustomerDetail, type CustomerDetail } from '@/services/api'
import { getRouteId } from '@/lib/auth'
import type { Partner } from '@/types'

// Number of characters to show for pricing policy UUID preview
const PRICING_POLICY_PREVIEW_LENGTH = 8

// Format currency
const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('mn-MN').format(value) + '₮'
}

// Detail Row Component
function DetailRow({ label, value, icon: Icon }: { label: string; value: string | number | null; icon?: React.ElementType }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value || '-'}</p>
      </div>
    </div>
  )
}

// Company Info Card Component
function CompanyInfoCard({ partner }: { partner: Partner }) {
  return (
    <Card className="border border-gray-100 shadow-sm">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Company Image */}
          <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border">
            {partner.image ? (
              <Image
                src={partner.image}
                alt={partner.name}
                width={80}
                height={80}
                className="object-cover w-full h-full"
              />
            ) : (
              <Building2 className="w-8 h-8 text-muted-foreground" />
            )}
          </div>

          {/* Company Details */}
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <h2 className="font-semibold text-base truncate">
                {partner.name}
              </h2>
              {partner.headCompanyName && (
                <p className="text-xs text-muted-foreground truncate">
                  {partner.headCompanyName}
                </p>
              )}
            </div>
            
            <div className="flex flex-wrap gap-1.5">
              {partner.companyCode && (
                <Badge variant="secondary" className="text-xs font-normal">
                  {partner.companyCode}
                </Badge>
              )}
              {partner.routeName && (
                <Badge variant="outline" className="text-xs font-normal">
                  {partner.routeName}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Category & Progress Section
function CategorySection({ partner }: { partner: Partner }) {
  const progress = 0 // TODO: Calculate from actual data
  const target = partner.salesLimit || 0
  
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Гүйцэтгэл</h3>
        <span className="text-sm font-medium">{progress}%</span>
      </div>
      
      {/* Progress */}
      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>0₮ гүйцэтгэл</span>
          <span>{formatCurrency(target)} төлөвлөгөө</span>
        </div>
      </div>
    </div>
  )
}

// Collapsible Details using AccordionIconSubtitle
function CollapsibleDetailsSection({ partner, customerDetail }: { partner: Partner; customerDetail: CustomerDetail | null }) {
  const pricingPolicy = customerDetail?.contract?.priceTypeId || null
  const isLoan = customerDetail?.contract?.isLoan || null
  const companyType = customerDetail?.companyType || null
  const registryNumber = customerDetail?.registryNumber || null

  const accordionItems = [
    {
      icon: Building2,
      title: 'Үндсэн мэдээлэл',
      subtitle: partner.name,
      content: (
        <div className="space-y-1">
          <DetailRow label="Байгууллагын нэр" value={partner.name} icon={Building2} />
          <DetailRow label="Толгой компани" value={partner.headCompanyName} icon={User} />
          <DetailRow label="Регистр" value={partner.headCompanyRegister || registryNumber} icon={Hash} />
          <DetailRow label="Компаны код" value={partner.companyCode} icon={Hash} />
          <DetailRow label="ERP UUID" value={partner.erp_uuid} icon={Globe} />
          <DetailRow label="ID" value={partner.id} icon={Hash} />
          {companyType && <DetailRow label="Компаний төрөл" value={companyType} icon={Building2} />}
        </div>
      )
    },
    {
      icon: MapPin,
      title: 'Хаяг & Холбоо барих',
      subtitle: partner.street1 || partner.phone || 'Мэдээлэл байхгүй',
      content: (
        <div className="space-y-1">
          <DetailRow label="Хаяг 1" value={partner.street1} icon={MapPin} />
          <DetailRow label="Хаяг 2" value={partner.street2} icon={MapPin} />
          <DetailRow label="Хот/Аймаг" value={partner.city} icon={MapPin} />
          <DetailRow label="Утас" value={partner.phone} icon={Phone} />
          <DetailRow label="И-мэйл" value={partner.email} icon={Mail} />
          {(partner.latitude || partner.longitude) && (
            <DetailRow 
              label="Координат" 
              value={partner.latitude && partner.longitude ? `${partner.latitude}, ${partner.longitude}` : null} 
              icon={Navigation} 
            />
          )}
        </div>
      )
    },
    {
      icon: Navigation,
      title: 'Маршрут',
      subtitle: partner.routeName || 'Тодорхойгүй',
      content: (
        <div className="space-y-1">
          <DetailRow label="Маршрут нэр" value={partner.routeName} icon={Navigation} />
          <DetailRow label="Маршрут ID" value={partner.routeId} icon={Hash} />
        </div>
      )
    },
    {
      icon: CreditCard,
      title: 'Санхүүгийн мэдээлэл',
      subtitle: pricingPolicy
        ? `${formatCurrency(partner.balance)} · Үнийн бодлого: ${pricingPolicy.length > PRICING_POLICY_PREVIEW_LENGTH ? `${pricingPolicy.slice(0, PRICING_POLICY_PREVIEW_LENGTH)}...` : pricingPolicy}`
        : formatCurrency(partner.balance),
      content: (
        <div className="space-y-1">
          <DetailRow label="Үлдэгдэл" value={formatCurrency(partner.balance)} icon={Wallet} />
          <DetailRow label="Зээлийн лимит" value={formatCurrency(partner.debtLimit)} icon={CreditCard} />
          <DetailRow label="Зээлийн хоног" value={partner.debtDays ? `${partner.debtDays} хоног` : null} icon={Clock} />
          <DetailRow label="Борлуулалтын лимит" value={formatCurrency(partner.salesLimit)} icon={BarChart3} />
          {pricingPolicy && <DetailRow label="Үнийн бодлого (priceTypeId)" value={pricingPolicy} icon={DollarSign} />}
          {isLoan && <DetailRow label="Зээлийн нөхцөл" value={isLoan} icon={CreditCard} />}
        </div>
      )
    },
    {
      icon: DollarSign,
      title: 'Өрийн мэдээлэл',
      subtitle: '0 нийт',
      content: (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <FileX className="h-10 w-10 mb-2 opacity-50" />
          <span className="text-sm">Өрийн мэдээлэл олдсонгүй</span>
        </div>
      )
    },
    {
      icon: Wallet,
      title: 'Урамшуулал',
      subtitle: '0₮ боломжит',
      content: (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Gift className="h-10 w-10 mb-2 opacity-50" />
          <span className="text-sm">Урамшуулал олдсонгүй</span>
        </div>
      )
    },
    {
      icon: Calendar,
      title: 'Огноо',
      subtitle: partner.created_at ? new Date(partner.created_at).toLocaleDateString('mn-MN') : '-',
      content: (
        <div className="space-y-1">
          <DetailRow 
            label="Үүсгэсэн огноо" 
            value={partner.created_at ? new Date(partner.created_at).toLocaleString('mn-MN') : null} 
            icon={Calendar} 
          />
          <DetailRow 
            label="Шинэчилсэн огноо" 
            value={partner.updated_at ? new Date(partner.updated_at).toLocaleString('mn-MN') : null} 
            icon={Calendar} 
          />
        </div>
      )
    }
  ]

  return (
    <div className="px-4">
      <AccordionIconSubtitle items={accordionItems} defaultValue="item-1" />
    </div>
  )
}

// Action Buttons
function ActionButtons({ 
  onVisit, 
  onCreateOrder,
  onContinueOrder,
  isAlreadySelected 
}: { 
  onVisit: () => void; 
  onCreateOrder: () => void;
  onContinueOrder: () => void;
  isAlreadySelected: boolean;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex gap-3 z-10">
      <Button 
        variant="outline" 
        className="flex-1 h-12"
        onClick={onVisit}
      >
        Зочилсон
      </Button>
      {isAlreadySelected ? (
        <Button 
          className="flex-1 h-12"
          onClick={onContinueOrder}
        >
          Захиалга үргэлжлүүлэх
        </Button>
      ) : (
        <Button 
          className="flex-1 h-12"
          onClick={onCreateOrder}
        >
          Захиалга үүсгэх
        </Button>
      )}
    </div>
  )
}

// Main Tab Content
function MainTabContent({ partner, customerDetail }: { partner: Partner; customerDetail: CustomerDetail | null }) {
  return (
    <div className="pb-32 space-y-4">
      <div className="p-4">
        <CompanyInfoCard partner={partner} />
      </div>
      <Separator />
      <CategorySection partner={partner} />
      <Separator />
      <CollapsibleDetailsSection partner={partner} customerDetail={customerDetail} />
    </div>
  )
}

// Loading Skeleton
function PartnerDetailSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-4">
        <Skeleton className="w-20 h-20 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  )
}

export default function PartnerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const partnerId = params.id as string
  
  const { partners, fetchPartners, isLoading } = usePartnerStore()
  const { setSelectedPartner, selectedPartner, totalItems, clearCart } = useCartStore()
  const [showChangeConfirm, setShowChangeConfirm] = useState(false)
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null)

  useEffect(() => {
    // If partners not loaded, fetch them
    if (partners.length === 0) {
      fetchPartners()
    }
  }, [partners.length, fetchPartners])

  useEffect(() => {
    // Fetch detailed customer info (including pricing policy/contract)
    const routeId = getRouteId()
    if (partnerId && routeId) {
      getCustomerDetail(partnerId, routeId).then((result) => {
        if (result.success && result.data) {
          setCustomerDetail(result.data)
        } else if (!result.success) {
          console.error('[PartnerDetail] Failed to fetch customer detail:', result.error)
        }
      })
    }
  }, [partnerId])

  // Find the partner from the store
  const partner = partners.find(p => p.id === partnerId) || null
  
  // Check if this partner is already selected
  const isAlreadySelected = selectedPartner?.id === partnerId
  // Check if there's a different partner with items
  const hasOtherPartnerWithItems = selectedPartner && selectedPartner.id !== partnerId && totalItems > 0

  const handleBack = () => {
    router.back()
  }

  const handleEdit = () => {
    // TODO: Open edit dialog
  }

  const handleVisit = () => {
    // TODO: Record visit
    toast.success('Зочилсон гэж бүртгэгдлээ')
  }

  const handleCreateOrder = () => {
    if (!partner) return
    
    // If there's another partner with items, show confirmation
    if (hasOtherPartnerWithItems) {
      setShowChangeConfirm(true)
      return
    }
    
    // Set selected partner for order
    setSelectedPartner(partner)
    
    // Navigate to products page
    toast.success(`${partner.name} дээр захиалга эхлүүлэх`)
    router.push('/products')
  }

  const handleConfirmChangePartner = () => {
    if (!partner) return
    
    setShowChangeConfirm(false)
    
    // Clear existing cart and set new partner
    clearCart()
    setSelectedPartner(partner)
    
    toast.success(`${partner.name} дээр захиалга эхлүүлэх`)
    router.push('/products')
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <button 
            onClick={handleBack}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="font-semibold text-base">Компани</h1>
          <button 
            onClick={handleEdit}
            className="p-2 -mr-2 hover:bg-gray-100 rounded-lg"
          >
            <Edit className="h-5 w-5 text-gray-700" />
          </button>
        </div>
      </header>

      {/* Tabs with Vertical Icons */}
      <TabsWithVerticalIcon
        tabs={[
          {
            name: 'Үндсэн',
            value: 'main',
            icon: Building2,
            content: isLoading || !partner ? (
              <PartnerDetailSkeleton />
            ) : (
              <MainTabContent partner={partner} customerDetail={customerDetail} />
            )
          },
          {
            name: 'Промошн',
            value: 'promo',
            icon: Gift,
            content: (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Gift className="h-12 w-12 mb-2 opacity-50" />
                <span className="text-sm">Промошн олдсонгүй</span>
              </div>
            )
          },
          {
            name: 'Бараа',
            value: 'products',
            icon: Package,
            content: (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mb-2 opacity-50" />
                <span className="text-sm">Бүтээгдэхүүн олдсонгүй</span>
              </div>
            )
          },
          {
            name: 'Захиалга',
            value: 'orders',
            icon: ClipboardList,
            content: (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mb-2 opacity-50" />
                <span className="text-sm">Захиалга олдсонгүй</span>
              </div>
            )
          },
          {
            name: 'Загвар',
            value: 'templates',
            icon: FileText,
            content: (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-2 opacity-50" />
                <span className="text-sm">Загвар олдсонгүй</span>
              </div>
            )
          }
        ]}
        defaultValue="main"
        className="pb-36"
      />

      {/* Action Buttons */}
      <ActionButtons 
        onVisit={handleVisit} 
        onCreateOrder={handleCreateOrder}
        onContinueOrder={() => router.push('/products')}
        isAlreadySelected={isAlreadySelected}
      />

      {/* Change Partner Confirmation Dialog */}
      <AlertDialog open={showChangeConfirm} onOpenChange={setShowChangeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Харилцагч солих уу?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Одоогоор <span className="font-medium text-foreground">{selectedPartner?.name}</span> дээр 
              <span className="font-medium text-foreground"> {totalItems} бараа</span> сонгогдсон байна.
              <br /><br />
              <span className="font-medium text-foreground">{partner?.name}</span> руу шилжихэд одоогийн сагс хоослогдох болно.
              Та үргэлжлүүлэх үү?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Үгүй, буцах</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmChangePartner}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Тийм, солих
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
