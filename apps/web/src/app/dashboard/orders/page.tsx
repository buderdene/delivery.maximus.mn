'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Package2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck, 
  ShoppingBag,
  FileText,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Order status type
type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled';

// Mock order data - replace with actual data later
interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  itemCount: number;
  totalAmount: number;
  paymentMethod: string;
}

// Status config
const statusConfig: Record<OrderStatus, { 
  label: string; 
  color: string; 
  icon: typeof Clock;
  bgColor: string;
}> = {
  pending: {
    label: 'Хүлээгдэж буй',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50 border-yellow-200',
    icon: Clock,
  },
  confirmed: {
    label: 'Баталгаажсан',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: CheckCircle,
  },
  shipping: {
    label: 'Хүргэлтэнд',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200',
    icon: Truck,
  },
  delivered: {
    label: 'Хүргэгдсэн',
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Цуцлагдсан',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
    icon: XCircle,
  },
};

// Format price helper
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('mn-MN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price) + '₮';
};

// Format date helper
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('mn-MN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// Empty State Component
function EmptyOrders() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
        <FileText className="h-12 w-12 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-semibold text-center mb-2">Захиалга байхгүй байна</h2>
      <p className="text-muted-foreground text-center mb-8 max-w-md">
        Та одоогоор захиалга хийгээгүй байна. Бараа бүтээгдэхүүнээс сонгон захиалга хийнэ үү.
      </p>
      <Button asChild size="lg">
        <Link href="/dashboard/products">
          <ShoppingBag className="mr-2 h-5 w-5" />
          Бүтээгдэхүүн үзэх
        </Link>
      </Button>
    </div>
  );
}

// Order Card Component
function OrderCard({ order }: { order: Order }) {
  const status = statusConfig[order.status];
  const StatusIcon = status.icon;
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Order Info */}
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${status.bgColor} border`}>
              <StatusIcon className={`h-6 w-6 ${status.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-lg">#{order.orderNumber}</h3>
                <Badge variant="outline" className={`${status.bgColor} ${status.color} border`}>
                  {status.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Calendar className="h-4 w-4" />
                {formatDate(order.createdAt)}
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="flex items-center gap-1">
                  <Package2 className="h-4 w-4 text-muted-foreground" />
                  {order.itemCount} бараа
                </span>
                <span className="text-muted-foreground">{order.paymentMethod}</span>
              </div>
            </div>
          </div>
          
          {/* Amount & Actions */}
          <div className="flex items-center justify-between sm:justify-end gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Нийт дүн</p>
              <p className="text-xl font-bold">{formatPrice(order.totalAmount)}</p>
            </div>
            <Button variant="outline" size="sm">
              Дэлгэрэнгүй
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OrdersPage() {
  // Mock orders - replace with actual data from store/API
  const [orders] = useState<Order[]>([
    // Uncomment to test with mock data:
    // {
    //   id: '1',
    //   orderNumber: 'ORD-2024-001',
    //   createdAt: '2024-01-15T10:30:00Z',
    //   status: 'delivered',
    //   itemCount: 5,
    //   totalAmount: 250000,
    //   paymentMethod: 'Бэлэн мөнгө',
    // },
    // {
    //   id: '2',
    //   orderNumber: 'ORD-2024-002',
    //   createdAt: '2024-01-18T14:45:00Z',
    //   status: 'shipping',
    //   itemCount: 3,
    //   totalAmount: 180000,
    //   paymentMethod: 'Карт',
    // },
    // {
    //   id: '3',
    //   orderNumber: 'ORD-2024-003',
    //   createdAt: '2024-01-20T09:15:00Z',
    //   status: 'pending',
    //   itemCount: 8,
    //   totalAmount: 420000,
    //   paymentMethod: 'Банкны шилжүүлэг',
    // },
  ]);
  
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'shipping');
  const completedOrders = orders.filter(o => o.status === 'delivered');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');
  
  if (orders.length === 0) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-3">
          <FileText className="h-7 w-7" />
          Миний захиалгууд
        </h1>
        <EmptyOrders />
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <FileText className="h-7 w-7" />
          Миний захиалгууд
        </h1>
        <Button asChild>
          <Link href="/dashboard/products">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Шинэ захиалга
          </Link>
        </Button>
      </div>
      
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="all">
            Бүгд ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Идэвхтэй ({pendingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Дууссан ({completedOrders.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Цуцлагдсан ({cancelledOrders.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </TabsContent>
        
        <TabsContent value="pending" className="space-y-4">
          {pendingOrders.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Идэвхтэй захиалга байхгүй байна
              </CardContent>
            </Card>
          ) : (
            pendingOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))
          )}
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-4">
          {completedOrders.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Дууссан захиалга байхгүй байна
              </CardContent>
            </Card>
          ) : (
            completedOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))
          )}
        </TabsContent>
        
        <TabsContent value="cancelled" className="space-y-4">
          {cancelledOrders.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Цуцлагдсан захиалга байхгүй байна
              </CardContent>
            </Card>
          ) : (
            cancelledOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
