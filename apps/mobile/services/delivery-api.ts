/**
 * =====================================================
 * DELIVERY APP API SERVICE
 * =====================================================
 * 
 * REST API for delivery mobile app
 * 
 * Base URL (Local): http://cloud.local.maximus.mn/api/delivery
 * Base URL (Production): https://cloud.maximus.mn/api/delivery
 * 
 * =====================================================
 * API ENDPOINTS SUMMARY (Бүх endpoint-ууд)
 * =====================================================
 * 
 * WORKER MODULE (Ажилтан):
 * ────────────────────────
 * GET  /worker/profile              → getWorkerProfile()      Профайл + өнөөдрийн статистик
 * GET  /worker/packages             → getWorkerPackages()     Багцуудын жагсаалт
 * GET  /worker/packages/:id/orders  → getPackageOrders()      Багцын захиалгууд
 * GET  /worker/packages/:id/products→ getPackageProducts()    Багцын бараанууд (хайрцаг тулгалт)
 * POST /worker/packages/:id/complete-checking → completePackageChecking() Тулгалт дуусгах
 * POST /worker/packages/:id/optimize-route → optimizeRoute()  Маршрут оновчлох
 * POST /worker/orders/update-sort-order → updateOrderSortOrder() Дараалал солих
 * GET  /worker/orders               → getWorkerOrders()       Захиалгуудын жагсаалт
 * GET  /worker/delivery-summary     → getDeliverySummary()    Хураангуй статистик
 * POST /worker/location             → updateWorkerLocation()  GPS байршил шинэчлэх
 * 
 * ORDERS MODULE (Захиалга):
 * ─────────────────────────
 * GET  /orders/:uuid                → getOrderDetail()        Захиалгын дэлгэрэнгүй
 * GET  /orders/:uuid/products       → getOrderProducts()      Захиалгын бараанууд
 * POST /orders/:uuid/status         → updateOrderStatus()     Төлөв шинэчлэх
 * POST /orders/:uuid/start          → startDelivery()         Хүргэлт эхлэх (in_progress)
 * POST /orders/:uuid/complete       → completeDelivery()      Хүргэлт дуусгах (delivered)
 * POST /orders/:uuid/fail           → failDelivery()          Амжилтгүй (failed)
 * 
 * WAREHOUSE MODULE (Агуулах тулгалт):
 * ───────────────────────────────────
 * POST /warehouse/toggle-check      → toggleProductCheck()    Нэг бараа тулгах
 * POST /warehouse/bulk-check        → bulkToggleCheck()       Олон бараа тулгах
 * 
 * SHOP MODULE (Дэлгүүр дээрх хүргэлт):
 * ────────────────────────────────────
 * GET  /shop/return-reasons         → getReturnReasons()      Буцаалтын шалтгаанууд
 * POST /shop/update-product         → updateProductDelivery() Бараа хүлээлгэх
 * POST /shop/bulk-deliver           → bulkDeliverProducts()   Бүгдийг хүлээлгэх
 * POST /shop/save-payment           → savePayment()           Төлбөр хадгалах
 * POST /shop/ebarimt                → createEbarimt()         И-Баримт үүсгэх
 * POST /shop/start-delivery/:uuid   → startDelivery()         Хүргэлт эхлэх (цаг бүртгэх)
 * POST /shop/complete-order/:uuid   → completeOrderDelivery() Хүргэлт дуусгах (GPS+signature)
 * 
 * REFERENCE DATA (Лавлах):
 * ────────────────────────
 * GET  /statuses                    → getDeliveryStatuses()   Боломжит төлвүүд
 * 
 * =====================================================
 * DATABASE FIELDS (Хадгалагдах талбарууд)
 * =====================================================
 * 
 * ErpOrder table:
 * - delivery_started_at      : Хүргэлт эхэлсэн цаг (startDelivery)
 * - delivered_at             : Хүргэлт дууссан цаг (completeOrderDelivery)
 * - delivery_duration_minutes: Зарцуулсан хугацаа = delivered_at - started_at
 * - delivery_latitude        : GPS өргөрөг (completeOrderDelivery)
 * - delivery_longitude       : GPS уртраг (completeOrderDelivery)
 * - signature_path           : Гарын үсгийн зураг
 * - delivery_photo_path      : Хүргэлтийн зураг
 * - payment_type/method/amount : Төлбөрийн мэдээлэл
 * - ebarimt_type/phone/registry : И-Баримтын мэдээлэл
 * 
 * ErpOrderProduct table:
 * - warehouse_checked        : Нярав тулгасан эсэх
 * - warehouse_checked_quantity : Нярав тулгасан тоо
 * - driver_checked           : Жолооч тулгасан эсэх  
 * - driver_checked_quantity  : Жолооч тулгасан тоо
 * - delivered_quantity       : Хүлээлгэсэн тоо
 * - returned_quantity        : Буцаасан тоо
 * - return_reason_id         : Буцаалтын шалтгаан
 * 
 * @package delivery.maximus.mn
 * @author MAXIMUS Development Team
 * @version 2.0
 */

import { useAuthStore } from '../stores/delivery-auth-store';

const API_BASE_URL = 'http://cloud.local.maximus.mn/api/delivery';

// ==========================================================================
// TYPES - Өгөгдлийн төрлүүд
// ==========================================================================

export interface Customer {
  uuid: string | null;
  name: string;
  phone: string | null;
  address: string | null;
  business_region: string | null;
  latitude: number | null;
  longitude: number | null;
  what3words: string | null;
}

export interface Warehouse {
  uuid: string | null;
  name: string;
}

export interface OrderCheckSummary {
  total_products: number;
  total_quantity: number;
  warehouse_checked_quantity: number;
  driver_checked_quantity: number;
  is_warehouse_fully_checked: boolean;
  is_driver_fully_checked: boolean;
}

export interface DeliveryOrder {
  uuid: string;
  sort_order: number | null;
  order_code: string;
  date: string;
  distance_km: number | null;
  customer: Customer;
  total_amount: string;
  total_amount_formatted: string;
  warehouse: Warehouse;
  delivery_status: string;
  delivery_status_label: string;
  delivery_status_color: string;
  assigned_at: string | null;
  delivered_at: string | null;
  delivery_started_at: string | null;
  delivery_duration_minutes: number | null;
  registry_number?: string;
  payment_check?: boolean;
  total_discount_point?: boolean;
  total_discount_point_amount?: string;
  total_promo_amount?: string;
  delivery_notes?: string | null;
  check_summary?: OrderCheckSummary;
  corporate_id?: string | null;  // Гүйлгээний утга
  // eBarimt info
  ebarimt_status?: string | null;  // SUCCESS, ERROR, SKIPPED, null
  ebarimt_bill_id?: string | null;
  ebarimt_qr_data?: string | null;
  ebarimt_lottery?: string | null;
}

export interface OrderProduct {
  id: number;
  product_uuid: string;
  name: string;
  barcode: string | null;
  quantity: number;
  price: string;
  auto_sale: string;
  manual_sale: string;
  auto_discount_percent: string;
  auto_discount_description: string;
  manual_discount_percent: string;
  manual_discount_description: string;
  total_amount: string;
  canceled: boolean;
  promotions: any[];
  warehouse_checked: boolean;
  warehouse_checked_at: string | null;
  warehouse_checked_quantity: number;
  driver_checked: boolean;
  driver_checked_at: string | null;
  driver_checked_quantity: number;
  delivered_quantity: number;
  returned_quantity: number;
  delivery_notes: string | null;
}

export interface OrderSummary {
  total_items: number;
  total_amount: string;
  products_count: number;
}

export interface DeliveryStatus {
  value: string;
  label: string;
  color: string;
  icon: string;
}

export interface TodayStats {
  total_orders: number;
  pending: number;
  in_progress: number;
  delivered: number;
  failed: number;
  total_amount: number;
  delivered_amount: number;
}

/**
 * Today Report Data - Өнөөдрийн тайлан
 */
export interface TodayReportData {
  total_orders: number;
  pending: number;
  in_progress: number;
  delivered: number;
  failed: number;
  total_amount: number;
  delivered_amount: number;
  cash_amount: number;
  card_amount: number;
  avg_delivery_minutes?: number;
}

export interface WorkerProfile {
  worker: {
    id: number;
    name: string;
    phone: string | null;
    avatar: string | null;
    worker_type: string;
    worker_type_label: string;
    is_available: boolean;
  };
  car: {
    id: number;
    plate: string;
    brand: string;
    model: string;
  } | null;
  today_stats: TodayStats;
}

// New types for delivery summary with package info
export interface DeliveryPackage {
  id?: number;
  name: string;
  delivery_date: string;
  formatted_date?: string;
  status?: string;
  status_label?: string;
}

export interface WarehouseSummary {
  total: number;
  pending: number;
  warehouse_checking: number;
  warehouse_checked: number;
  driver_checking: number;
}

export interface DeliveryProgressSummary {
  total: number;
  loaded: number;
  in_progress: number;
  delivered: number;
  failed: number;
  total_amount: number;
  delivered_amount: number;
}

export interface DeliverySummaryData {
  package: DeliveryPackage;
  worker: {
    id: number;
    name: string;
    worker_type: string;
    worker_type_label: string;
  };
  warehouse_summary: WarehouseSummary;
  delivery_summary: DeliveryProgressSummary;
  overall: {
    total_orders: number;
    total_amount: number;
  };
}

// Extended orders response with package info and status counts
export interface OrdersResponseData {
  date: string;
  package: DeliveryPackage | null;
  total_count: number;
  status_counts: {
    pending: number;
    assigned_to_driver: number;
    warehouse_checking: number;
    warehouse_checked: number;
    driver_checking: number;
    loaded: number;
    in_progress: number;
    delivered: number;
    failed: number;
  };
  orders: DeliveryOrder[];
}

// ==========================================================================
// API HELPERS
// ==========================================================================

async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string }> {
  const token = useAuthStore.getState().token;
  
  const headers: HeadersInit = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { 
        success: false, 
        message: data.message || `HTTP Error: ${response.status}` 
      };
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    return { 
      success: false, 
      message: 'Сүлжээний алдаа. Интернэт холболтоо шалгана уу.' 
    };
  }
}

// ==========================================================================
// WORKER MODULE - Ажилтны модуль
// ==========================================================================

/**
 * GET /worker/profile
 * 
 * Ажилтны профайл болон өнөөдрийн статистик авах
 * 
 * БУЦААХ МЭДЭЭЛЭЛ:
 * - worker: { id, name, phone, avatar, worker_type }
 * - car: { id, plate, brand, model } | null
 * - today_stats: { total_orders, pending, delivered, failed, ... }
 * 
 * @param workerId - Ажилтны ID (optional, JWT token-оос авна)
 */
export async function getWorkerProfile(workerId?: number): Promise<{ success: boolean; data?: WorkerProfile; message?: string }> {
  const params = workerId ? `?worker_id=${workerId}` : '';
  return apiRequest<WorkerProfile>(`/worker/profile${params}`);
}

// Package list item type
export interface PackageListItem {
  id: number;
  name: string;
  delivery_date: string;
  formatted_date: string;
  status: string | null;
  status_label: string | null;
  total_orders: number;
  warehouse_pending: number;
  delivery_pending: number;
  delivered: number;
  total_amount: number;
  orders?: DeliveryOrder[];
}

export interface PackagesListData {
  total_count: number;
  packages: PackageListItem[];
}

export interface PackageOrdersData {
  package: DeliveryPackage;
  total_count: number;
  status_counts: {
    assigned_to_driver: number;
    warehouse_checking: number;
    warehouse_checked: number;
    driver_checking: number;
    loaded: number;
    in_progress: number;
    delivered: number;
    failed: number;
  };
  orders: DeliveryOrder[];
}

// Package products types (Box checking method)
export interface ProductOrderDetail {
  erp_order_uuid: string;
  order_code: string;
  customer_name: string | null;
  quantity: number;
  product_line_id: number;
  warehouse_checked: boolean;
  warehouse_checked_quantity: number;
  driver_checked: boolean;
  driver_checked_quantity: number;
}

export interface AggregatedProduct {
  product_uuid: string;
  name: string;
  barcode: string | null;
  article: string | null;
  brand: string | null;
  brand_name: string | null;
  serial_number: string | null;
  has_serial: boolean;
  unit_price: string;
  total_quantity: number;
  warehouse_checked_quantity: number;
  driver_checked_quantity: number;
  is_warehouse_fully_checked: boolean;
  is_driver_fully_checked: boolean;
  orders_count: number;
  order_details: ProductOrderDetail[];
}

export interface PackageProductsSummary {
  total_products: number;
  products_with_serial: number;
  products_without_serial: number;
  total_quantity: number;
  warehouse_checked_quantity: number;
  driver_checked_quantity: number;
  orders_count: number;
}

export interface PackageProductsData {
  package: DeliveryPackage;
  summary: PackageProductsSummary;
  products_with_serial: AggregatedProduct[];
  products_without_serial: AggregatedProduct[];
  all_products: AggregatedProduct[];
}

/**
 * GET /worker/packages
 * 
 * Ажилтанд хувиарлагдсан багцуудын жагсаалт
 * 
 * БУЦААХ МЭДЭЭЛЭЛ:
 * - packages[]: { id, name, delivery_date, total_orders, warehouse_pending, delivery_pending, delivered }
 * 
 * ХЭРЭГЛЭЭ:
 * - Warehouse tab: warehouse_pending > 0 байвал агуулах тулгалт хийгдээгүй
 * - Delivery tab: delivery_pending > 0 байвал хүргэлт хийгдээгүй
 * 
 * @param workerId - Ажилтны ID
 */
export async function getWorkerPackages(workerId?: number): Promise<{ success: boolean; data?: PackagesListData; message?: string }> {
  const params = workerId ? `?worker_id=${workerId}` : '';
  return apiRequest<PackagesListData>(`/worker/packages${params}`);
}

/**
 * GET /worker/packages/:id/orders
 * 
 * Тухайн багцын захиалгуудын жагсаалт
 * 
 * ПАРАМЕТРҮҮД:
 * - packageId: Багцын ID
 * - status: Төлөв шүүлт (comma-separated: "loaded,in_progress")
 * - startLatitude/startLongitude: Хэрэглэгчийн байршил (зай тооцоолоход)
 * 
 * БУЦААХ МЭДЭЭЛЭЛ:
 * - package: { id, name, delivery_date }
 * - status_counts: { loaded, in_progress, delivered, failed, ... }
 * - orders[]: Захиалгуудын жагсаалт distance_km-тэй
 * 
 * @param params.startLatitude - GPS өргөрөг (зай тооцоолоход)
 * @param params.startLongitude - GPS уртраг
 */
export async function getPackageOrders(params: {
  packageId: number;
  workerId?: number;
  status?: string;
  startLatitude?: number;
  startLongitude?: number;
}): Promise<{ success: boolean; data?: PackageOrdersData; message?: string }> {
  const queryParams = new URLSearchParams();
  if (params.workerId) queryParams.append('worker_id', params.workerId.toString());
  if (params.status) queryParams.append('status', params.status);
  if (params.startLatitude) queryParams.append('start_latitude', params.startLatitude.toString());
  if (params.startLongitude) queryParams.append('start_longitude', params.startLongitude.toString());
  
  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return apiRequest<PackageOrdersData>(`/worker/packages/${params.packageId}/orders${query}`);
}

/**
 * GET /worker/packages/:id/products
 * 
 * Багцын бүх бараануудыг нэгтгэж буцаах (Хайрцаг тулгалт)
 * Ижил бараануудыг нэгтгэж, захиалга бүрийн тоог харуулна
 * 
 * БУЦААХ МЭДЭЭЛЭЛ:
 * - summary: { total_products, total_quantity, warehouse_checked_quantity, driver_checked_quantity }
 * - products_with_serial[]: Серийн дугаартай бараанууд
 * - products_without_serial[]: Серийн дугааргүй бараанууд
 * - all_products[]: Бүх бараанууд (нэгтгэсэн)
 * 
 * ХЭРЭГЛЭЭ:
 * - box.tsx: Хайрцагаар тулгалт хийх дэлгэц
 * - Нэг бараа олон захиалгад байвал нэг мөрөнд харуулна
 */
export async function getPackageProducts(params: {
  packageId: number;
  workerId?: number;
  status?: string;
}): Promise<{ success: boolean; data?: PackageProductsData; message?: string }> {
  const queryParams = new URLSearchParams();
  if (params.workerId) queryParams.append('worker_id', params.workerId.toString());
  if (params.status) queryParams.append('status', params.status);
  
  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return apiRequest<PackageProductsData>(`/worker/packages/${params.packageId}/products${query}`);
}

// Route optimization response types
export interface OptimizedOrder {
  uuid: string;
  order_code: string;
  customer_name: string | null;
  sort_order: number;
  distance_km: number | null;
  no_coordinates?: boolean;
}

export interface OptimizeRouteResponse {
  package_id: number;
  total_orders: number;
  orders_with_coords: number;
  orders_without_coords: number;
  start_point: {
    latitude: number;
    longitude: number;
  };
  optimized_orders: OptimizedOrder[];
}

// Complete checking response types
export interface CompleteCheckingResponse {
  package_id: number;
  package_name: string;
  updated_orders_count: number;
  new_status: string;
  new_status_label: string;
}

export interface UncheckedOrder {
  order_code: string;
  customer_name: string;
  total_quantity: number;
  checked_quantity: number;
}

/**
 * POST /worker/packages/:id/optimize-route
 * 
 * Хүргэлтийн маршрутыг GPS координатад тулгуурлан оновчлох
 * Nearest Neighbor алгоритм ашиглана
 * 
 * ЛОГИК:
 * 1. Эхлэх цэг = Түгээгчийн одоогийн байршил
 * 2. Хамгийн ойр захиалгыг олж 1-р дараалалд
 * 3. Тэр захиалгаас дараагийн хамгийн ойрыг олно
 * 4. delivery_sort_order талбарыг шинэчлэнэ
 * 
 * @param params.startLatitude - Эхлэх цэгийн өргөрөг
 * @param params.startLongitude - Эхлэх цэгийн уртраг
 */
export async function optimizeRoute(params: {
  packageId: number;
  startLatitude?: number;
  startLongitude?: number;
}): Promise<{ success: boolean; data?: OptimizeRouteResponse; message?: string }> {
  const body: Record<string, number> = {};
  if (params.startLatitude) body.start_latitude = params.startLatitude;
  if (params.startLongitude) body.start_longitude = params.startLongitude;
  
  return apiRequest<OptimizeRouteResponse>(`/worker/packages/${params.packageId}/optimize-route`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * POST /worker/orders/update-sort-order
 * 
 * Гараар захиалгын дарааллыг солих
 * 
 * ХЭРЭГЛЭЭ:
 * - Түгээгч өөрөө дарааллыг засах үед
 * - Drag & drop үйлдлээр
 */
export async function updateOrderSortOrder(params: {
  orderUuid: string;
  newSortOrder: number;
}): Promise<{ success: boolean; data?: { order_uuid: string; old_sort_order: number; new_sort_order: number }; message?: string }> {
  return apiRequest('/worker/orders/update-sort-order', {
    method: 'POST',
    body: JSON.stringify({
      order_uuid: params.orderUuid,
      new_sort_order: params.newSortOrder,
    }),
  });
}

/**
 * POST /worker/packages/:id/complete-checking
 * 
 * Багцын тулгалтыг дуусгаж бүх захиалгыг "loaded" төлөвт шилжүүлэх
 * 
 * ЛОГИК:
 * 1. Бүх бараа тулгагдсан эсэхийг шалгана
 * 2. Тулгагдаагүй байвал unchecked_orders буцаана
 * 3. force=true бол тулгагдаагүй ч дуусгана
 * 4. Амжилттай бол delivery_status = "loaded" болно
 * 
 * @param params.force - Тулгагдаагүй ч дуусгах эсэх
 */
export async function completePackageChecking(params: {
  packageId: number;
  workerId?: number;
  force?: boolean;
}): Promise<{ success: boolean; data?: CompleteCheckingResponse; message?: string; unchecked_orders?: UncheckedOrder[] }> {
  const queryParams = new URLSearchParams();
  if (params.workerId) queryParams.append('worker_id', params.workerId.toString());
  
  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  return apiRequest(`/worker/packages/${params.packageId}/complete-checking${query}`, {
    method: 'POST',
    body: JSON.stringify({
      force: params.force || false,
    }),
  });
}

/**
 * Get worker's delivery orders with package info and status counts
 */
export async function getWorkerOrders(params?: {
  workerId?: number;
  date?: string;
  status?: string;
}): Promise<{ success: boolean; data?: OrdersResponseData; message?: string }> {
  const queryParams = new URLSearchParams();
  if (params?.workerId) queryParams.append('worker_id', params.workerId.toString());
  if (params?.date) queryParams.append('date', params.date);
  if (params?.status) queryParams.append('status', params.status);
  
  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return apiRequest(`/worker/orders${query}`);
}

/**
 * Get delivery summary with package info (Багцын толгой мэдээлэл + статистик)
 */
export async function getDeliverySummary(params?: {
  workerId?: number;
  date?: string;
}): Promise<{ success: boolean; data?: DeliverySummaryData; message?: string }> {
  const queryParams = new URLSearchParams();
  if (params?.workerId) queryParams.append('worker_id', params.workerId.toString());
  if (params?.date) queryParams.append('date', params.date);
  
  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return apiRequest(`/worker/delivery-summary${query}`);
}

/**
 * Update worker GPS location
 */
export async function updateWorkerLocation(data: {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}): Promise<{ success: boolean; message?: string }> {
  return apiRequest('/worker/location', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ==========================================================================
// ORDERS MODULE
// ==========================================================================

/**
 * Get order detail with products
 */
export async function getOrderDetail(orderUuid: string): Promise<{ 
  success: boolean; 
  data?: { 
    order: DeliveryOrder; 
    products: OrderProduct[]; 
    summary: OrderSummary 
  }; 
  message?: string 
}> {
  return apiRequest(`/orders/${orderUuid}`);
}

/**
 * Get order products only
 */
export async function getOrderProducts(orderUuid: string): Promise<{ 
  success: boolean; 
  data?: { products: OrderProduct[]; summary: OrderSummary }; 
  message?: string 
}> {
  return apiRequest(`/orders/${orderUuid}/products`);
}

/**
 * POST /orders/:uuid/status
 * 
 * Захиалгын төлөв шинэчлэх (ерөнхий)
 */
export async function updateOrderStatus(orderUuid: string, status: string, notes?: string): Promise<{ success: boolean; message?: string }> {
  return apiRequest(`/orders/${orderUuid}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, notes }),
  });
}

/**
 * POST /orders/:uuid/start
 * 
 * Хүргэлт эхлэх (in_progress төлөвт шилжүүлэх)
 * ТЭМДЭГЛЭЛ: shop/start-delivery/:uuid ашиглахыг зөвлөж байна
 */
export async function startDeliveryStatus(orderUuid: string): Promise<{ success: boolean; message?: string }> {
  return apiRequest(`/orders/${orderUuid}/start`, { method: 'POST' });
}

/**
 * POST /orders/:uuid/complete
 * 
 * Хүргэлт дуусгах (delivered төлөвт шилжүүлэх)
 * ТЭМДЭГЛЭЛ: shop/complete-order/:uuid ашиглахыг зөвлөж байна
 */
export async function completeDeliveryStatus(orderUuid: string): Promise<{ success: boolean; message?: string }> {
  return apiRequest(`/orders/${orderUuid}/complete`, { method: 'POST' });
}

/**
 * POST /orders/:uuid/fail
 * 
 * Хүргэлт амжилтгүй (failed төлөвт шилжүүлэх)
 */
export async function failDelivery(orderUuid: string, reason: string): Promise<{ success: boolean; message?: string }> {
  return apiRequest(`/orders/${orderUuid}/fail`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// ==========================================================================
// WAREHOUSE MODULE - Агуулах тулгалт (Нярав/Жолооч)
// ==========================================================================

/**
 * POST /warehouse/toggle-check
 * 
 * Нэг барааны тулгалт хийх (Нярав эсвэл Жолооч)
 * 
 * ТУЛГАЛТЫН ТӨРӨЛ (checker_type):
 * - warehouse: Няравын тулгалт → warehouse_checked = true
 * - driver: Жолоочийн тулгалт → driver_checked = true
 * 
 * ХАДГАЛАГДАХ ТАЛБАРУУД:
 * - warehouse_checked / driver_checked : boolean
 * - warehouse_checked_at / driver_checked_at : datetime
 * - warehouse_checked_quantity / driver_checked_quantity : number
 * 
 * @param data.checker_type - "warehouse" | "driver"
 * @param data.quantity - Тулгасан тоо (default: бараа бүрэн тоо)
 */
export async function toggleProductCheck(data: {
  order_uuid: string;
  product_id: number;
  checker_type: 'warehouse' | 'driver';
  checked: boolean;
  quantity?: number;
}): Promise<{ 
  success: boolean; 
  data?: { 
    product_id: number; 
    warehouse_checked: boolean; 
    driver_checked: boolean; 
    status: 'pending' | 'checking' | 'loaded' 
  }; 
  message?: string 
}> {
  return apiRequest('/warehouse/toggle-check', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * POST /warehouse/bulk-check
 * 
 * Олон барааг нэг дор тулгах
 * 
 * ХЭРЭГЛЭЭ:
 * - "Бүгдийг тулгах" товч дарахад
 * - Хайрцаг бүтнээр тулгахад
 */
export async function bulkToggleCheck(data: {
  order_uuid: string;
  product_ids: number[];
  checker_type: 'warehouse' | 'driver';
  checked: boolean;
}): Promise<{ success: boolean; data?: { updated_count: number }; message?: string }> {
  return apiRequest('/warehouse/bulk-check', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ==========================================================================
// SHOP MODULE - Дэлгүүр дээрх хүргэлт
// ==========================================================================
//
// Түгээгч дэлгүүрт очоод хийх үйлдлүүд:
// 1. startDelivery() - Дэлгэц нээгдэхэд эхлэх цаг бүртгэх
// 2. updateProductDelivery() - Бараа хүлээлгэх (delivered/returned qty)
// 3. savePayment() - Төлбөр хадгалах
// 4. createEbarimt() - И-Баримт үүсгэх
// 5. completeOrderDelivery() - Хүргэлт дуусгах (GPS, signature, photo)
// ==========================================================================

// Return reasons list
export interface ReturnReason {
  id: number;
  name: string;
  description?: string;
}

/**
 * GET /shop/return-reasons
 * 
 * Буцаалтын шалтгаануудын жагсаалт
 * 
 * ЖИШЭЭ ШАЛТГААНУУД:
 * - Бараа гэмтсэн
 * - Буруу бараа
 * - Хүсээгүй
 * - Хугацаа хэтэрсэн
 */
export async function getReturnReasons(): Promise<{ success: boolean; data?: ReturnReason[]; message?: string }> {
  return apiRequest('/shop/return-reasons');
}

/**
 * POST /shop/update-product
 * 
 * Барааны хүргэлтийн мэдээлэл бүртгэх
 * 
 * ХАДГАЛАГДАХ ТАЛБАРУУД:
 * - delivered_quantity : Хүлээлгэсэн тоо
 * - returned_quantity  : Буцаасан тоо
 * - return_reason_id   : Буцаалтын шалтгаан
 * - delivery_notes     : Тэмдэглэл
 * 
 * ТООЦООЛОЛ:
 * - Захиалсан тоо = delivered_quantity + returned_quantity
 * - Жишээ: 10ш = 8ш хүлээлгэсэн + 2ш буцаасан
 */
export async function updateProductDelivery(data: {
  order_uuid: string;
  product_id: number;
  delivered_quantity: number;
  returned_quantity?: number;
  return_reason_id?: number;
  delivery_notes?: string;
}): Promise<{ success: boolean; message?: string }> {
  return apiRequest('/shop/update-product', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * POST /shop/bulk-deliver
 * 
 * Бүх барааг бүрэн хүлээлгэх
 * 
 * ЛОГИК:
 * - deliver_all = true үед бүх барааны delivered_quantity = quantity
 * - returned_quantity = 0 болно
 */
export async function bulkDeliverProducts(data: {
  order_uuid: string;
  deliver_all: boolean;
}): Promise<{ success: boolean; data?: { updated_count: number }; message?: string }> {
  return apiRequest('/shop/bulk-deliver', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * POST /shop/save-payment
 * 
 * Төлбөрийн мэдээлэл хадгалах
 * 
 * ТӨЛБӨРИЙН ТӨРӨЛ (payment_type):
 * - full    : Бүрэн төлсөн
 * - partial : Хэсэгчлэн төлсөн
 * - unpaid  : Төлөөгүй
 * - credit  : Зээлээр
 * 
 * ТӨЛБӨРИЙН АРГА (payment_method):
 * - cash     : Бэлэн мөнгө
 * - card     : Карт (POS)
 * - qpay     : QPay
 * - transfer : Шилжүүлэг
 * - mixed    : Холимог (cash + card)
 */
export interface PaymentData {
  order_uuid: string;
  payment_type: 'full' | 'partial' | 'unpaid' | 'credit';
  payment_method: 'cash' | 'card' | 'qpay' | 'transfer' | 'mixed';
  payment_amount: number;
  cash_amount?: number;
  card_amount?: number;
  qpay_amount?: number;
  transfer_amount?: number;
  receipt_number?: string;
  notes?: string;
}

export async function savePayment(data: PaymentData): Promise<{ success: boolean; message?: string }> {
  return apiRequest('/shop/save-payment', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ==========================================================================
// E-BARIMT MODULE - И-Баримт
// ==========================================================================

export type EbarimtType = 'person' | 'organization' | 'none';

export interface EbarimtData {
  order_uuid: string;
  ebarimt_type: EbarimtType;
  phone_number?: string;       // For person (8 digit) - DDan руу илгээх
  registry_number?: string;    // For organization - Байгууллагын регистр
  payment_code?: 'CASH' | 'PAYMENT_CARD'; // Төлбөрийн хэлбэр
}

export interface EbarimtResponse {
  success: boolean;
  data?: {
    bill_id?: string;          // Баримтын ID (037900846788001095130002210005702)
    qr_data?: string;          // QR код дата
    lottery?: string;          // Сугалааны дугаар (XA 96268009)
    date?: string;             // Огноо
    total_amount?: number;     // Нийт дүн
    total_vat?: number;        // НӨАТ дүн
    skipped?: boolean;         // Баримт үүсгэхгүй сонгосон эсэх
    // Буцаалтын баримт (хэрэв буцаалттай бол)
    return_bill_id?: string;
    return_qr_data?: string;
    return_lottery?: string;
    return_amount?: number;
  };
  message?: string;
}

/**
 * POST /shop/ebarimt
 * 
 * И-Баримт үүсгэх
 * 
 * ТӨРЛҮҮД (ebarimt_type):
 * - person       : Хувь хүн (8 оронтой утасны дугаар)
 * - organization : Байгууллага (7 оронтой регистр)
 * - none         : И-Баримтгүй
 */
export async function createEbarimt(data: EbarimtData): Promise<EbarimtResponse> {
  return apiRequest('/shop/ebarimt', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ==========================================================================
// DELIVERY COMPLETION - Хүргэлт дуусгах
// ==========================================================================

export interface CompleteDeliveryData {
  delivery_notes?: string;
  signature_image?: string;    // base64 encoded image
  delivery_photo?: string;     // base64 encoded image
  ebarimt_type?: EbarimtType;
  ebarimt_phone?: string;
  ebarimt_registry?: string;
  payment_type?: string;
  payment_method?: string;
  payment_amount?: number;
  latitude?: number;           // GPS өргөрөг (device location)
  longitude?: number;          // GPS уртраг (device location)
}

/**
 * POST /shop/start-delivery/:uuid
 * 
 * Хүргэлт эхэлсэн хугацаа бүртгэх
 * 
 * ДУУДАГДАХ ҮЕ:
 * - shop.tsx дэлгэц нээгдэхэд автоматаар дуудагдана
 * - Зөвхөн 1 удаа бүртгэгдэнэ (дахин дуудахад солигдохгүй)
 * 
 * ХАДГАЛАГДАХ ТАЛБАР:
 * - delivery_started_at : datetime
 * 
 * ХЭРЭГЛЭЭ:
 * - Хүргэлтийн хугацааг тооцоолоход (delivery_duration_minutes)
 */
export async function startDelivery(orderUuid: string): Promise<{ 
  success: boolean; 
  data?: {
    order_uuid: string;
    delivery_started_at: string;
  };
  message?: string 
}> {
  return apiRequest(`/shop/start-delivery/${orderUuid}`, {
    method: 'POST',
  });
}

/**
 * POST /shop/complete-order/:uuid
 * 
 * Хүргэлт бүрэн дуусгах (Гарын үсэг, Зураг, GPS)
 * 
 * ХАДГАЛАГДАХ ТАЛБАРУУД:
 * - delivery_status = "delivered"
 * - delivered_at : Дууссан datetime
 * - delivery_duration_minutes = delivered_at - delivery_started_at
 * - delivery_latitude/longitude : GPS координат
 * - signature_path : Гарын үсгийн зураг
 * - delivery_photo_path : Хүргэлтийн зураг
 * 
 * GPS КООРДИНАТ:
 * - Хүргэлт зөв газарт хийгдсэн эсэхийг баталгаажуулна
 * - Маргаантай тохиолдолд нотлох баримт болно
 * 
 * ХУГАЦААНЫ ТООЦООЛОЛ:
 * - delivery_duration_minutes = diffInMinutes(delivery_started_at, delivered_at)
 * - Жишээ: 14:30 эхэлсэн → 15:00 дууссан = 30 минут
 */
export async function completeOrderDelivery(orderUuid: string, data: CompleteDeliveryData): Promise<{ 
  success: boolean; 
  data?: {
    order_uuid: string;
    status: string;
    delivered_at: string;
    delivery_duration_minutes?: number;
    delivery_latitude?: number;
    delivery_longitude?: number;
    ebarimt?: {
      lottery_number?: string;
      qr_data?: string;
    };
  };
  message?: string 
}> {
  return apiRequest(`/shop/complete-order/${orderUuid}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ==========================================================================
// REFERENCE DATA - Лавлах мэдээлэл
// ==========================================================================

/**
 * GET /statuses
 * 
 * Бүх боломжит хүргэлтийн төлвүүдийн жагсаалт
 * 
 * ТӨЛВҮҮД:
 * - pending, assigned_to_driver, warehouse_checking, warehouse_checked
 * - driver_checking, loaded, in_progress, delivery_pending
 * - delivered, failed, cancelled
 */
export async function getDeliveryStatuses(): Promise<{ success: boolean; data?: DeliveryStatus[]; message?: string }> {
  return apiRequest('/statuses');
}

/**
 * GET /worker/today-report
 * 
 * Өнөөдрийн хүргэлтийн тайлан
 * - Хүргэлтийн статистик
 * - Дүнгийн мэдээлэл
 * - Төлбөрийн мэдээлэл
 * - Дундаж хүргэлтийн хугацаа
 */
export async function getTodayReport(): Promise<{ success: boolean; data?: TodayReportData; message?: string }> {
  return apiRequest('/worker/today-report');
}
