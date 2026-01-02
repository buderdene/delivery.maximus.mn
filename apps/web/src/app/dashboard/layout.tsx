'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  Settings, 
  LogOut,
  Menu,
  Building2,
  X,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import AuthGuard from '@/components/auth/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import { useCartStore } from '@/stores/cart-store';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Hook for hydration-safe client-side rendering
function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

const navigation = [
  { name: 'Хяналтын самбар', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Бараа материал', href: '/dashboard/products', icon: Package },
  { name: 'Харилцагчид', href: '/dashboard/partners', icon: Users },
  { name: 'Сагс', href: '/dashboard/cart', icon: ShoppingCart },
  { name: 'Тохиргоо', href: '/dashboard/settings', icon: Settings },
];

// Selected Partner Badge Component
function SelectedPartnerBadge({ onClear }: { onClear: () => void }) {
  const { selectedPartner, hasPartner, totalItems } = useCartStore();
  const isHydrated = useHydrated();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  if (!isHydrated || !hasPartner || !selectedPartner) return null;

  const handleClearClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // If cart has items, show confirmation dialog
    if (totalItems > 0) {
      setShowConfirmDialog(true);
    } else {
      onClear();
    }
  };

  const handleConfirmClear = () => {
    setShowConfirmDialog(false);
    onClear();
  };
  
  return (
    <>
      <div className="mx-3 mb-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
        <div className="flex items-start gap-2">
          <Building2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Захиалга:</p>
            <p className="text-sm font-medium truncate">{selectedPartner.name}</p>
            {selectedPartner.routeName && (
              <p className="text-xs text-muted-foreground truncate">{selectedPartner.routeName}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={handleClearClick}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Харилцагч хасах уу?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{selectedPartner.name}</span> харилцагчийг хасахад 
              таны сагсанд байгаа <span className="font-medium text-foreground">{totalItems} бараа</span> устах болно. 
              Та үргэлжлүүлэх үү?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Үгүй, буцах</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmClear}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Тийм, хасах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { totalItems, clearSelectedPartner } = useCartStore();
  const isHydrated = useHydrated();

  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={onNavigate}>
          <div className="flex items-center">
            <Image
              src="/logos/maximus-logo.svg"
              alt="Maximus"
              width={140}
              height={40}
              priority
              className="h-10 w-auto"
            />
          </div>
        </Link>
      </div>

      {/* Selected Partner */}
      <SelectedPartnerBadge onClear={clearSelectedPartner} />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const isCart = item.href === '/dashboard/cart';
          const showBadge = isCart && isHydrated && totalItems > 0;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors relative',
                isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <div className="relative">
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {showBadge && (
                  <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {totalItems > 99 ? '99+' : totalItems}
                  </span>
                )}
              </div>
              <span className="truncate">{item.name}</span>
              {showBadge && (
                <Badge variant={isActive ? "secondary" : "destructive"} className="ml-auto text-xs">
                  {totalItems}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="border-t p-4">
        {user && (
          <div className="mb-3 px-3">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        )}
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={logout}
        >
          <LogOut className="h-5 w-5" />
          Гарах
        </Button>
      </div>
    </>
  );
}

// Desktop Sidebar
function DesktopSidebar() {
  return (
    <div className="hidden lg:flex h-screen w-64 flex-col border-r bg-card fixed left-0 top-0">
      <SidebarContent />
    </div>
  );
}

// Mobile Header with Menu
function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b bg-card px-4">
      <Link href="/dashboard" className="flex items-center">
        <Image
          src="/logos/maximus-logo.svg"
          alt="Maximus"
          width={100}
          height={28}
          priority
          className="h-7 w-auto"
        />
      </Link>
      
      <div className="flex items-center gap-2">
        {/* Cart Icon */}
        <CartIconButton />
        
        {/* Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="flex h-full flex-col">
              <SidebarContent onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

// Cart Icon Button Component
function CartIconButton() {
  const { totalItems } = useCartStore();
  const isHydrated = useHydrated();
  
  return (
    <Link href="/dashboard/cart">
      <Button variant="ghost" size="icon" className="relative">
        <ShoppingCart className="h-5 w-5" />
        {isHydrated && totalItems > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground">
            {totalItems > 99 ? '99+' : totalItems}
          </span>
        )}
      </Button>
    </Link>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50/50">
        {/* Desktop Sidebar */}
        <DesktopSidebar />
        
        {/* Mobile Header */}
        <MobileHeader />
        
        {/* Main Content */}
        <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
