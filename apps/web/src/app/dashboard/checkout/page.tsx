'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  CreditCard, 
  Wallet, 
  Building2, 
  Truck, 
  MapPin,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Phone,
  Users,
  QrCode,
  X,
  RefreshCw,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCartStore } from '@/stores/cart-store';
import { toast } from 'sonner';
import type { QPayUrl, CreateInvoiceResponse, CheckPaymentResponse } from '@/types/payment';

// Payment method type
type PaymentMethod = 'cash' | 'qpay' | 'card' | 'transfer';

// Delivery method type  
type DeliveryMethod = 'pickup' | 'delivery';

// Payment method options
const paymentMethods = [
  {
    id: 'qpay' as PaymentMethod,
    name: 'QPay',
    description: 'QR кодоор төлөх',
    icon: QrCode,
  },
  {
    id: 'cash' as PaymentMethod,
    name: 'Бэлэн мөнгө',
    description: 'Хүлээн авах үед төлөх',
    icon: Wallet,
  },
  {
    id: 'card' as PaymentMethod,
    name: 'Карт',
    description: 'Дебит/Кредит карт',
    icon: CreditCard,
  },
  {
    id: 'transfer' as PaymentMethod,
    name: 'Банкны шилжүүлэг',
    description: 'Дансаар шилжүүлэх',
    icon: Building2,
  },
];

// Delivery options
const deliveryMethods = [
  {
    id: 'pickup' as DeliveryMethod,
    name: 'Салбараас авах',
    description: 'Өөрөө очиж авах',
    icon: MapPin,
    price: 0,
  },
  {
    id: 'delivery' as DeliveryMethod,
    name: 'Хүргэлтээр',
    description: 'Хаягт хүргүүлэх',
    icon: Truck,
    price: 0,
  },
];

// Format price helper
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('mn-MN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price) + '₮';
};

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalAmount, formattedTotal, totalItems, clearCart, validateCart, selectedPartner, hasPartner, clearSelectedPartner } = useCartStore();
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qpay');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pickup');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // QPay state
  const [qpayModalOpen, setQpayModalOpen] = useState(false);
  const [qpayInvoiceId, setQpayInvoiceId] = useState<string | null>(null);
  const [qpayQrImage, setQpayQrImage] = useState<string | null>(null);
  const [qpayUrls, setQpayUrls] = useState<QPayUrl[]>([]);
  const [qpayLoading, setQpayLoading] = useState(false);
  const [qpayChecking, setQpayChecking] = useState(false);
  const [qpayPaid, setQpayPaid] = useState(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Redirect if cart is empty or no partner selected
  useEffect(() => {
    if (mounted && (items.length === 0 || !hasPartner)) {
      router.replace('/dashboard/cart');
    }
  }, [mounted, items.length, hasPartner, router]);
  
  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);
  
  const validation = validateCart();
  
  // Generate unique order code
  const generateOrderCode = useCallback(() => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }, []);
  
  // Create QPay invoice
  const createQPayInvoice = useCallback(async () => {
    if (!selectedPartner) return;
    
    setQpayLoading(true);
    
    try {
      const orderCode = generateOrderCode();
      
      const response = await fetch('/api/payment/qpay/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderCode,
          amount: totalAmount,
          description: `${selectedPartner.name} - Захиалга`,
          partnerName: selectedPartner.name,
        }),
      });
      
      const data: CreateInvoiceResponse = await response.json();
      
      if (data.success && data.invoiceId && data.qrImage) {
        setQpayInvoiceId(data.invoiceId);
        setQpayQrImage(data.qrImage);
        setQpayUrls(data.urls || []);
        setQpayModalOpen(true);
        
        // Start checking payment status
        startPaymentCheck(data.invoiceId);
      } else {
        toast.error(data.error || 'QPay нэхэмжлэл үүсгэхэд алдаа гарлаа');
      }
    } catch (error) {
      console.error('QPay invoice error:', error);
      toast.error('QPay үйлчилгээтэй холбогдоход алдаа гарлаа');
    } finally {
      setQpayLoading(false);
    }
  }, [selectedPartner, totalAmount, generateOrderCode]);
  
  // Check payment status
  const checkPaymentStatus = useCallback(async (invoiceId: string) => {
    try {
      setQpayChecking(true);
      
      const response = await fetch('/api/payment/qpay/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
      });
      
      const data: CheckPaymentResponse = await response.json();
      
      if (data.success && data.paid) {
        setQpayPaid(true);
        
        // Stop checking
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
        }
        
        toast.success('Төлбөр амжилттай хийгдлээ!');
        
        // Complete order after short delay
        setTimeout(() => {
          completeOrder();
        }, 2000);
      }
    } catch (error) {
      console.error('Payment check error:', error);
    } finally {
      setQpayChecking(false);
    }
  }, []);
  
  // Start payment checking interval
  const startPaymentCheck = useCallback((invoiceId: string) => {
    // Check every 3 seconds
    checkIntervalRef.current = setInterval(() => {
      checkPaymentStatus(invoiceId);
    }, 3000);
    
    // Also check immediately
    checkPaymentStatus(invoiceId);
  }, [checkPaymentStatus]);
  
  // Cancel QPay and close modal
  const cancelQPay = useCallback(async () => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }
    
    if (qpayInvoiceId) {
      try {
        await fetch('/api/payment/qpay/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoiceId: qpayInvoiceId }),
        });
      } catch (error) {
        console.error('Cancel invoice error:', error);
      }
    }
    
    setQpayModalOpen(false);
    setQpayInvoiceId(null);
    setQpayQrImage(null);
    setQpayUrls([]);
    setQpayPaid(false);
  }, [qpayInvoiceId]);
  
  // Complete order (called after successful payment or for non-QPay methods)
  const completeOrder = useCallback(async () => {
    if (!selectedPartner) return;
    
    // Clear cart and partner
    clearCart();
    clearSelectedPartner();
    
    toast.success('Захиалга амжилттай илгээгдлээ!', {
      description: `${selectedPartner.name} дээр захиалга хүлээн авагдлаа`,
      duration: 5000,
    });
    
    // Close modal and redirect
    setQpayModalOpen(false);
    router.push('/dashboard/products');
  }, [selectedPartner, clearCart, clearSelectedPartner, router]);
  
  const handleSubmitOrder = async () => {
    if (!validation.isValid) {
      toast.error('Захиалга алдаатай байна');
      return;
    }
    
    if (!selectedPartner) {
      toast.error('Харилцагч сонгоогүй байна');
      return;
    }
    
    // If QPay selected, create invoice and show QR
    if (paymentMethod === 'qpay') {
      await createQPayInvoice();
      return;
    }
    
    // For other payment methods, submit order directly
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // Create order object with partner info
      const order = {
        partnerId: selectedPartner.id,
        partnerName: selectedPartner.name,
        items: items.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        totalAmount,
        paymentMethod,
        deliveryMethod,
        notes,
        createdAt: new Date().toISOString(),
      };
      
      console.log('Order submitted:', order);
      
      // Clear cart and partner after successful order
      clearCart();
      clearSelectedPartner();
      
      toast.success('Захиалга амжилттай илгээгдлээ!', {
        description: `${selectedPartner.name} дээр захиалга хүлээн авагдлаа`,
        duration: 5000,
      });
      
      // Redirect to products page
      router.push('/dashboard/products');
      
    } catch (error) {
      console.error('Order submission failed:', error);
      toast.error('Захиалга илгээхэд алдаа гарлаа');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Loading state
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/cart">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold">Захиалга баталгаажуулах</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Options */}
        <div className="lg:col-span-2 space-y-6">
          {/* Selected Partner */}
          {selectedPartner && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Захиалах харилцагч
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{selectedPartner.name}</p>
                    {selectedPartner.routeName && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {selectedPartner.routeName}
                      </div>
                    )}
                    {selectedPartner.phone && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        {selectedPartner.phone}
                      </div>
                    )}
                    {selectedPartner.street1 && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {selectedPartner.street1}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Delivery Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Хүргэлтийн хэлбэр
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={deliveryMethod}
                onValueChange={(v) => setDeliveryMethod(v as DeliveryMethod)}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {deliveryMethods.map((method) => (
                  <Label
                    key={method.id}
                    htmlFor={method.id}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      deliveryMethod === method.id
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value={method.id} id={method.id} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <method.icon className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{method.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {method.description}
                      </p>
                      {method.price > 0 && (
                        <Badge variant="secondary" className="mt-2">
                          +{formatPrice(method.price)}
                        </Badge>
                      )}
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
          
          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Төлбөрийн хэлбэр
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
              >
                {paymentMethods.map((method) => (
                  <Label
                    key={method.id}
                    htmlFor={`payment-${method.id}`}
                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${
                      paymentMethod === method.id
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value={method.id} id={`payment-${method.id}`} className="sr-only" />
                    <method.icon className={`h-8 w-8 ${
                      paymentMethod === method.id ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                    <div>
                      <span className="font-medium block">{method.name}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {method.description}
                      </p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
          
          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Нэмэлт тэмдэглэл</CardTitle>
              <CardDescription>
                Захиалгын талаар нэмэлт мэдээлэл оруулах боломжтой
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Жишээ нь: Хүргэлтийн хаяг, утасны дугаар, хүлээн авах цаг..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column - Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Захиалгын дүн</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate mr-2">
                      {item.name} x{item.quantity}
                    </span>
                    <span className="flex-shrink-0">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              
              <Separator />
              
              {/* Subtotal */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Нийт барааны тоо</span>
                <span>{totalItems} ширхэг</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Дүн</span>
                <span>{formattedTotal}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Хүргэлт</span>
                <span className="text-green-600">Үнэгүй</span>
              </div>
              
              <Separator />
              
              {/* Total */}
              <div className="flex justify-between items-center">
                <span className="font-semibold text-lg">Нийт төлөх</span>
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
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                disabled={!validation.isValid || isSubmitting || qpayLoading}
                onClick={handleSubmitOrder}
              >
                {isSubmitting || qpayLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {qpayLoading ? 'QPay үүсгэж байна...' : 'Илгээж байна...'}
                  </>
                ) : paymentMethod === 'qpay' ? (
                  <>
                    <QrCode className="mr-2 h-4 w-4" />
                    QPay-р төлөх
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Захиалга илгээх
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      
      {/* QPay QR Modal */}
      <Dialog open={qpayModalOpen} onOpenChange={(open) => !open && cancelQPay()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QPay төлбөр
            </DialogTitle>
            <DialogDescription>
              QR кодыг уншуулж төлбөрөө төлнө үү
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center py-4">
            {/* Payment status */}
            {qpayPaid ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
                <p className="text-lg font-semibold text-green-600">Төлбөр амжилттай!</p>
                <p className="text-sm text-muted-foreground">Захиалга баталгаажиж байна...</p>
              </div>
            ) : (
              <>
                {/* Amount */}
                <div className="text-center mb-4">
                  <p className="text-sm text-muted-foreground">Төлөх дүн</p>
                  <p className="text-3xl font-bold text-primary">{formattedTotal}</p>
                </div>
                
                {/* QR Code */}
                {qpayQrImage && (
                  <div className="bg-white p-4 rounded-lg border">
                    <Image
                      src={qpayQrImage}
                      alt="QPay QR Code"
                      width={240}
                      height={240}
                      className="mx-auto"
                    />
                  </div>
                )}
                
                {/* Checking status indicator */}
                <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                  {qpayChecking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span>Төлбөр хүлээж байна...</span>
                </div>
                
                {/* Bank app links */}
                {qpayUrls.length > 0 && (
                  <div className="mt-6 w-full">
                    <p className="text-sm text-muted-foreground text-center mb-3">
                      <Smartphone className="h-4 w-4 inline mr-1" />
                      Эсвэл банкны апп-аар нээх
                    </p>
                    <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                      {qpayUrls.slice(0, 8).map((url) => (
                        <a
                          key={url.name}
                          href={url.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                          <Image
                            src={url.logo}
                            alt={url.name}
                            width={32}
                            height={32}
                            className="rounded"
                          />
                          <span className="text-xs text-center truncate w-full">
                            {url.description || url.name}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          <DialogFooter>
            {!qpayPaid && (
              <Button variant="outline" onClick={cancelQPay} className="w-full">
                <X className="mr-2 h-4 w-4" />
                Цуцлах
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
