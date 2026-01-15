'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser, getClient } from '@/lib/auth';
import { useTranslation } from '@/hooks/useTranslation';
import {
    ArrowLeft,
    Package,
    Building2,
    Calendar,
    FileText,
    CheckCircle2,
    Clock,
    XCircle,
    Gift,
    Percent,
    RefreshCw,
    Printer,
    Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

// Types - matches ERP response
interface ProductDiscountPoint {
    discountPointID: string;
    discountPointName: string;
    discountPointAmount: number;
}

interface ProductStock {
    typeId: string;
    count: number;
}

interface StockType {
    uuid: string;
    name: string;
    pcs: number;
}

interface OrderDetailProduct {
    uuid: string;
    name: string;
    price: number;
    productCode?: string;
    imgUrl?: string;
    unit?: string;
    stock: ProductStock[];
    stockTypes: StockType[];
    discountPoint: ProductDiscountPoint[];
    brand: { uuid: string; name: string };
    category: { uuid: string; name: string };
    moq: number;
    autoSale: number;
    manualSale: number;
    isUnderStock: boolean;
    promotions: Array<{ uuid: string; name: string }>;
}

interface PromotionPointItem {
    promotionPointID: number;
    promotionPointName: string;
    promotionPointAmount: number;
}

interface OrderDetail {
    uuid: string;
    date: string;
    orderCode: string;
    status: string;
    companyId: string;
    companyName: string;
    companyCode: string;
    warehouseId: string;
    totalAmount: number;
    loan: boolean;
    loanDescription: string;
    isPaid: boolean;
    delivery: string;
    registryNumber: string;
    description?: string;
    products: OrderDetailProduct[];
    promotionPoint: PromotionPointItem[];
    saleDocuments: unknown[];
}

// Status badge helper - now uses string status
function getStatusBadge(status: string, t: (key: string) => string) {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('үүссэн') || statusLower.includes('pending')) {
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />{status}</Badge>;
    } else if (statusLower.includes('баталгаажсан') || statusLower.includes('confirmed')) {
        return <Badge variant="default" className="gap-1 bg-blue-500"><Package className="h-3 w-3" />{status}</Badge>;
    } else if (statusLower.includes('хүргэгдсэн') || statusLower.includes('delivered')) {
        return <Badge variant="default" className="gap-1 bg-green-500"><CheckCircle2 className="h-3 w-3" />{status}</Badge>;
    } else if (statusLower.includes('цуцлагдсан') || statusLower.includes('cancelled')) {
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{status}</Badge>;
    }
    return <Badge variant="outline">{status || t('orders.detail.unknown')}</Badge>;
}

// Format currency
function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('mn-MN', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount) + '₮';
}

// Format date
function formatDate(dateString: string): string {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('mn-MN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return dateString;
    }
}

export default function OrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const uuid = params.uuid as string;
    const { t } = useTranslation();

    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrderDetail = useCallback(async () => {
        if (!uuid) return;

        setLoading(true);
        setError(null);

        try {
            // Get username from auth
            const user = getUser();
            const client = getClient();
            const username = user?.email || client?.corporate_id || '9915513';

            const response = await fetch('/api/orders/detail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uuid, username }),
            });

            if (!response.ok) {
                throw new Error(t('orders.fetchError'));
            }

            const data = await response.json();
            setOrder(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Алдаа гарлаа';
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }, [uuid]);

    // Print handler - opens print template in new window
    const handlePrint = useCallback(() => {
        if (!order) return;

        const user = getUser();
        const client = getClient();
        const username = user?.email || client?.corporate_id || '9915513';

        const printUrl = `/api/order/print?uuid=${order.uuid}&username=${username}&format=full&lang=mn`;
        const printWindow = window.open(printUrl, '_blank', 'width=900,height=700');

        // Auto print when loaded
        if (printWindow) {
            printWindow.onload = () => {
                printWindow.print();
            };
        }
    }, [order]);

    // Receipt print handler - thermal printer format
    const handlePrintReceipt = useCallback(() => {
        if (!order) return;

        const user = getUser();
        const client = getClient();
        const username = user?.email || client?.corporate_id || '9915513';

        const printUrl = `/api/order/print?uuid=${order.uuid}&username=${username}&format=receipt&lang=mn`;
        const printWindow = window.open(printUrl, '_blank', 'width=350,height=600');

        if (printWindow) {
            printWindow.onload = () => {
                printWindow.print();
            };
        }
    }, [order]);

    // Share handler
    const handleShare = useCallback(async () => {
        if (!order) return;

        const shareData = {
            title: `${t('orders.title')} ${order.orderCode}`,
            text: `${order.companyName} - ${order.totalAmount}₮`,
            url: window.location.href,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                // User cancelled or error
                console.log('Share cancelled or failed:', err);
            }
        } else {
            // Fallback: copy link to clipboard
            try {
                await navigator.clipboard.writeText(window.location.href);
                toast.success(t('orders.detail.linkCopied'));
            } catch {
                toast.error(t('orders.detail.linkCopyError'));
            }
        }
    }, [order, t]);

    useEffect(() => {
        fetchOrderDetail();
    }, [fetchOrderDetail]);

    // Loading state
    if (loading) {
        return (
            <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <Skeleton className="h-8 w-64" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Skeleton className="h-[200px] rounded-lg" />
                        <Skeleton className="h-[400px] rounded-lg" />
                    </div>
                    <div className="space-y-6">
                        <Skeleton className="h-[300px] rounded-lg" />
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !order) {
        return (
            <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/orders">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold">{t('orders.detail.title')}</h1>
                </div>
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <XCircle className="h-12 w-12 text-destructive mb-4" />
                        <p className="text-lg font-medium mb-2">{t('orders.detail.notFound')}</p>
                        <p className="text-muted-foreground mb-4">{error}</p>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => router.push('/orders')}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                {t('orders.detail.backToOrders')}
                            </Button>
                            <Button onClick={fetchOrderDetail}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                {t('orders.detail.retry')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Calculate totals from products
    const totalQuantity = order.products.reduce(
        (sum, p) => sum + (p.stock?.[0]?.count || 0), 0
    );

    const totalDiscountAmount = order.products.reduce(
        (sum, p) => sum + (p.discountPoint?.[0]?.discountPointAmount || 0), 0
    );

    const totalAutoSale = order.products.reduce(
        (sum, p) => sum + (p.autoSale || 0), 0
    );

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/orders">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{order.orderCode || 'Захиалга'}</h1>
                        <p className="text-sm text-muted-foreground">{formatDate(order.date)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {getStatusBadge(order.status, t)}
                    <Button variant="outline" size="sm" onClick={fetchOrderDetail}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {t('orders.detail.refresh')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="h-4 w-4 mr-2" />
                        {t('orders.detail.print')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrintReceipt}>
                        <Printer className="h-4 w-4 mr-2" />
                        {t('orders.detail.receipt')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Order Info & Products */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Order Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                {t('orders.detail.orderInfo')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-start gap-3">
                                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('orders.partner')}</p>
                                        <p className="font-medium">{order.companyName || '-'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('orders.date')}</p>
                                        <p className="font-medium">{formatDate(order.date)}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('orders.orderNumber')}</p>
                                        <p className="font-medium">{order.orderCode || '-'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('orders.status')}</p>
                                        <p className="font-medium">{order.status || '-'}</p>
                                    </div>
                                </div>
                                {order.description && (
                                    <div className="flex items-start gap-3 sm:col-span-2">
                                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t('orders.detail.note')}</p>
                                            <p className="font-medium">{order.description}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Products */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                {t('orders.detail.products')}
                            </CardTitle>
                            <CardDescription>{t('orders.detail.productCount', { count: order.products?.length || 0 })}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">#</TableHead>
                                            <TableHead>{t('orders.detail.product')}</TableHead>
                                            <TableHead className="text-right">{t('orders.detail.quantity')}</TableHead>
                                            <TableHead className="text-right">{t('orders.detail.unitPrice')}</TableHead>
                                            <TableHead className="text-right">{t('orders.detail.discount')}</TableHead>
                                            <TableHead className="text-right">{t('orders.detail.total')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {order.products?.map((product, idx) => {
                                            const quantity = product.stock?.[0]?.count || 0;
                                            const discountAmount = product.discountPoint?.[0]?.discountPointAmount || 0;
                                            const totalPrice = (product.price * quantity) - discountAmount;

                                            return (
                                                <TableRow key={product.uuid || idx}>
                                                    <TableCell className="font-medium">{idx + 1}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            {product.imgUrl ? (
                                                                <img
                                                                    src={product.imgUrl}
                                                                    alt={product.name}
                                                                    className="h-10 w-10 rounded object-cover"
                                                                />
                                                            ) : (
                                                                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                                                    <Package className="h-5 w-5 text-muted-foreground" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="font-medium line-clamp-1">{product.name}</p>
                                                                <p className="text-xs text-muted-foreground">{product.productCode}</p>
                                                                {product.discountPoint?.length > 0 && (
                                                                    <p className="text-xs text-orange-600">
                                                                        {product.discountPoint[0].discountPointName}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {quantity} {product.unit || 'ш'}
                                                    </TableCell>
                                                    <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                                                    <TableCell className="text-right text-orange-600">
                                                        {discountAmount > 0 ? `-${formatCurrency(discountAmount)}` : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">{formatCurrency(totalPrice)}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Discounts per product */}
                    {order.products.some(p => p.discountPoint?.length > 0) && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Percent className="h-5 w-5 text-orange-500" />
                                    {t('orders.detail.discountTitle')}
                                </CardTitle>
                                <CardDescription>{t('orders.detail.totalDiscount')}: {formatCurrency(totalDiscountAmount)}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {order.products
                                        .filter(p => p.discountPoint?.length > 0)
                                        .map((product, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                                                <div>
                                                    <p className="font-medium">{product.name}</p>
                                                    <p className="text-sm text-muted-foreground">{product.discountPoint![0].discountPointName}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-orange-600">-{formatCurrency(product.discountPoint![0].discountPointAmount)}</p>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Promotions from order header */}
                    {order.promotionPoint?.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Gift className="h-5 w-5 text-green-500" />
                                    {t('orders.detail.promotions')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {order.promotionPoint.map((promo, idx) => (
                                        <div key={idx} className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">{promo.promotionPointName}</p>
                                                    <p className="text-sm text-muted-foreground">ID: {promo.promotionPointID}</p>
                                                </div>
                                                <p className="font-bold text-green-600">+{promo.promotionPointAmount} {t('orders.detail.points')}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column - Summary */}
                <div className="space-y-6">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle>{t('orders.detail.paymentInfo')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{t('orders.detail.totalItems')}</span>
                                <span>{totalQuantity} {t('orders.detail.pcs')}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{t('orders.detail.subtotal')}</span>
                                <span>{formatCurrency(order.totalAmount + totalDiscountAmount)}</span>
                            </div>
                            {totalDiscountAmount > 0 && (
                                <div className="flex justify-between text-sm text-orange-600">
                                    <span className="flex items-center gap-1">
                                        <Percent className="h-3 w-3" />
                                        {t('orders.detail.discount')}
                                    </span>
                                    <span>-{formatCurrency(totalDiscountAmount)}</span>
                                </div>
                            )}
                            {order.promotionPoint?.length > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span className="flex items-center gap-1">
                                        <Gift className="h-3 w-3" />
                                        {t('orders.detail.promotions')}
                                    </span>
                                    <span>+{order.promotionPoint.reduce((sum, p) => sum + p.promotionPointAmount, 0)} {t('orders.detail.points')}</span>
                                </div>
                            )}
                            {totalAutoSale > 0 && (
                                <div className="flex justify-between text-sm text-blue-600">
                                    <span>{t('orders.detail.autoDiscount')}</span>
                                    <span>-{formatCurrency(totalAutoSale)}</span>
                                </div>
                            )}
                            <Separator />
                            <div className="flex justify-between text-lg font-bold">
                                <span>{t('orders.detail.totalPayable')}</span>
                                <span className="text-primary">{formatCurrency(order.totalAmount)}</span>
                            </div>

                            <Separator />

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">UUID</span>
                                    <span className="font-mono text-xs">{order.uuid?.slice(0, 8)}...</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
