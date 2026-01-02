'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, ShoppingCart, AlertCircle, Building2, MapPin, Phone, X, Users, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useCartStore, type CartItem } from '@/stores/cart-store';
import { QuantityKeypad } from '@/components/cart/QuantityKeypad';
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

// Selected Partner Card Component
function SelectedPartnerCard() {
  const { selectedPartner, hasPartner, clearSelectedPartner, totalItems } = useCartStore();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  if (!hasPartner || !selectedPartner) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardContent className="p-4">
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <Users className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">
              Харилцагч сонгоогүй байна
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Захиалга үүсгэхийн тулд эхлээд харилцагч сонгоно уу
            </p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link href="/dashboard/partners">
                Харилцагч сонгох
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleClearClick = () => {
    if (totalItems > 0) {
      setShowConfirmDialog(true);
    } else {
      clearSelectedPartner();
    }
  };

  const handleConfirmClear = () => {
    setShowConfirmDialog(false);
    clearSelectedPartner();
  };
  
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Захиалах харилцагч
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={handleClearClick}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <p className="font-medium">{selectedPartner.name}</p>
            {selectedPartner.routeName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {selectedPartner.routeName}
              </div>
            )}
            {selectedPartner.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {selectedPartner.phone}
              </div>
            )}
            {selectedPartner.street1 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {selectedPartner.street1}
              </div>
            )}
            {selectedPartner.balance !== null && (
              <div className="flex justify-between pt-2 border-t mt-2">
                <span className="text-sm text-muted-foreground">Үлдэгдэл:</span>
                <span className="text-sm font-medium">
                  {new Intl.NumberFormat('mn-MN').format(selectedPartner.balance)}₮
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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

// Empty Cart Component
function EmptyCart() {
  const { hasPartner, selectedPartner } = useCartStore();
  
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Show partner if selected */}
      {hasPartner && selectedPartner && (
        <div className="max-w-md mx-auto mb-8">
          <SelectedPartnerCard />
        </div>
      )}
      
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
          <ShoppingCart className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold text-center mb-2">Таны сагс хоосон байна</h2>
        <p className="text-muted-foreground text-center mb-8 max-w-md">
          {hasPartner 
            ? `${selectedPartner?.name} дээр захиалга нэмнэ үү`
            : 'Бараа бүтээгдэхүүн нэмэхийн тулд каталог руу очно уу'
          }
        </p>
        <Button asChild size="lg">
          <Link href="/dashboard/products">
            <ShoppingBag className="mr-2 h-5 w-5" />
            Бүтээгдэхүүн үзэх
          </Link>
        </Button>
      </div>
    </div>
  );
}

// Cart Item Row Component
function CartItemRow({ item, onQuantityClick }: { item: CartItem; onQuantityClick: (item: CartItem) => void }) {
  const { removeItem, incrementQuantity, decrementQuantity } = useCartStore();
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  
  const canIncrement = item.quantity < item.maxQuantity;
  const canDecrement = item.quantity > 1;
  const isLowStock = item.maxQuantity <= 5;

  const handleRemove = () => {
    setShowRemoveConfirm(true);
  };

  const confirmRemove = () => {
    setShowRemoveConfirm(false);
    removeItem(item.productId);
  };
  
  return (
    <>
      <div className="flex items-start gap-4 py-4 border-b last:border-b-0">
        {/* Image */}
        <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-lg bg-muted overflow-hidden flex-shrink-0">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              sizes="(max-width: 768px) 80px, 96px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium line-clamp-2">{item.name}</h3>
              {item.article && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Код: {item.article}
                </p>
              )}
              {item.category && (
                <Badge variant="secondary" className="mt-1">
                  {item.category}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive flex-shrink-0"
              onClick={handleRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Price and Quantity */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => decrementQuantity(item.productId)}
                disabled={!canDecrement}
              >
                <Minus className="h-3 w-3" />
              </Button>
              {/* Clickable quantity - opens keypad */}
              <button
                onClick={() => onQuantityClick(item)}
                className="w-14 h-8 text-center font-medium bg-gray-100 hover:bg-amber-50 hover:text-amber-600 rounded-lg transition-colors border border-gray-200 hover:border-amber-300 cursor-pointer"
              >
                {item.quantity}
              </button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => incrementQuantity(item.productId)}
                disabled={!canIncrement}
              >
                <Plus className="h-3 w-3" />
              </Button>
              {isLowStock && (
                <span className="text-xs text-orange-500 ml-2">
                  Үлдэгдэл: {item.maxQuantity}
                </span>
              )}
            </div>
            
            <div className="text-right">
              <p className="font-semibold">{item.formattedPrice}</p>
              {item.quantity > 1 && (
                <p className="text-sm text-muted-foreground">
                  {item.quantity} x {item.formattedPrice}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Remove Item Confirmation */}
      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Бараа хасах уу?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{item.name}</span> ({item.quantity} ширхэг) барааг сагснаас хасах уу?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Үгүй, буцах</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRemove}
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

// Cart Summary Component
function CartSummary() {
  const { items, formattedTotal, totalItems, validateCart, clearCart, selectedPartner } = useCartStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const validation = validateCart();
  
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('mn-MN', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price) + '₮';
  };
  
  // Calculate line total for each item
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleClearCart = () => {
    setShowClearConfirm(true);
  };

  const confirmClearCart = () => {
    setShowClearConfirm(false);
    clearCart();
  };
  
  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Захиалгын дүн</span>
          <Badge variant="secondary">{totalItems} бараа</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items breakdown */}
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground truncate mr-2">
                {item.name} x{item.quantity}
              </span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        
        <Separator />
        
        {/* Subtotal */}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Дүн</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        
        {/* Shipping */}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Хүргэлт</span>
          <span className="text-green-600">Үнэгүй</span>
        </div>
        
        <Separator />
        
        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="font-semibold text-lg">Нийт</span>
          <span className="font-bold text-2xl text-primary">{formattedTotal}</span>
        </div>
        
        {/* Validation errors */}
        {!validation.isValid && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {validation.errors.map((error, index) => (
                <p key={index}>{error}</p>
              ))}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Warnings */}
        {validation.warnings.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {validation.warnings.map((warning, index) => (
                <p key={index} className="text-sm">{warning}</p>
              ))}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button 
          className="w-full" 
          size="lg"
          disabled={!validation.isValid}
          asChild
        >
          <Link href="/dashboard/checkout">
            Захиалга баталгаажуулах
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={handleClearCart}
        >
          Сагс хоослох
        </Button>
      </CardFooter>

      {/* Clear Cart Confirmation */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Сагс хоослох уу?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Таны сагсанд байгаа <span className="font-medium text-foreground">{totalItems} бараа</span> устах болно.
              {selectedPartner && (
                <span> Мөн <span className="font-medium text-foreground">{selectedPartner.name}</span> харилцагч хасагдах болно.</span>
              )}
              {' '}Та үргэлжлүүлэх үү?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Үгүй, буцах</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmClearCart}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Тийм, хоослох
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// Main Cart Page
export default function CartPage() {
  const { items, isEmpty, updateQuantity } = useCartStore();
  const [selectedItem, setSelectedItem] = useState<CartItem | null>(null);
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [keypadKey, setKeypadKey] = useState(0);
  
  const handleQuantityClick = (item: CartItem) => {
    setSelectedItem(item);
    setKeypadKey(prev => prev + 1); // Increment to reset keypad
    setIsKeypadOpen(true);
  };
  
  const handleQuantityConfirm = (quantity: number) => {
    if (selectedItem) {
      updateQuantity(selectedItem.productId, quantity);
    }
  };
  
  if (isEmpty) {
    return <EmptyCart />;
  }
  
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <ShoppingCart className="h-7 w-7" />
          Миний сагс
        </h1>
        <Button variant="outline" asChild>
          <Link href="/dashboard/products">
            Үргэлжлүүлэн худалдаа хийх
          </Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Selected Partner */}
          <SelectedPartnerCard />
          
          {/* Cart Items Card */}
          <Card>
            <CardContent className="p-4 md:p-6">
              {items.map((item) => (
                <CartItemRow 
                  key={item.id} 
                  item={item} 
                  onQuantityClick={handleQuantityClick}
                />
              ))}
            </CardContent>
          </Card>
        </div>
        
        {/* Order Summary */}
        <div className="lg:col-span-1">
          <CartSummary />
        </div>
      </div>
      
      {/* Quantity Keypad Dialog */}
      <QuantityKeypad
        isOpen={isKeypadOpen}
        onClose={() => setIsKeypadOpen(false)}
        onConfirm={handleQuantityConfirm}
        maxQuantity={selectedItem?.maxQuantity || 999}
        productName={selectedItem?.name}
        resetKey={keypadKey}
      />
    </div>
  );
}
