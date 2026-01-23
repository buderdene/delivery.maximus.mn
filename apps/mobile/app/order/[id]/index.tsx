/**
 * ЗАХИАЛГЫН ДЭЛГЭРЭНГҮЙ ДЭЛГЭЦ
 * 
 * API: POST /hs/od/OrderDetail
 * Body: { username, uuid }
 * 
 * ХЭСГҮҮД:
 * 1. Харилцагчийн мэдээлэл (companyName, registryNumber)
 * 2. Захиалгын мэдээлэл (orderCode, date, totalAmount, status)
 * 3. Урамшууллын оноо (discountPoint)
 * 4. Промо жагсаалт (promotionPoint)
 * 5. Бүтээгдэхүүний жагсаалт (products)
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  View, 
  ActivityIndicator, 
  RefreshControl,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { 
  ChevronLeft,
  ChevronRight,
  Building2, 
  Calendar,
  Tag,
  Gift,
  ShoppingBag,
  Grid3X3,
  List,
  Package,
  Info,
  Warehouse as WarehouseIcon,
  Banknote,
  Boxes,
  CheckCircle2,
  Circle,
  Truck,
  Store,
} from 'lucide-react-native';
import { Box, VStack, HStack, Text, Heading } from '../../../components/ui';
import { getOrderDetail, getPackageOrders, DeliveryOrder, OrderProduct, OrderSummary, toggleProductCheck } from '../../../services/delivery-api';
import { useAuthStore } from '../../../stores/delivery-auth-store';

// Warehouse related statuses for navigation
const WAREHOUSE_STATUSES = 'assigned_to_driver,warehouse_checking,warehouse_checked,driver_checking';

// Warehouse statuses array - тулгалт хийх боломжтой статусууд
const WAREHOUSE_STATUSES_ARRAY = ['assigned_to_driver', 'warehouse_checking', 'warehouse_checked', 'driver_checking', 'loaded'];

// Delivery pending status - can deliver to shop
const DELIVERY_PENDING_STATUS = 'delivery_pending';

export default function OrderDetailScreen() {
  const { id, packageId } = useLocalSearchParams<{ id: string; packageId?: string }>();
  const { worker } = useAuthStore();
  
  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [products, setProducts] = useState<OrderProduct[]>([]);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [checkingProducts, setCheckingProducts] = useState<Set<number>>(new Set());
  const [checkerType, setCheckerType] = useState<'warehouse' | 'driver'>('driver');
  
  // Navigation state for prev/next
  const [packageOrders, setPackageOrders] = useState<DeliveryOrder[]>([]);
  const [currentOrderIndex, setCurrentOrderIndex] = useState<number>(-1);

  // Fetch package orders for navigation
  const fetchPackageOrders = useCallback(async () => {
    if (!packageId) return;
    
    try {
      const result = await getPackageOrders({
        packageId: parseInt(packageId),
        workerId: worker?.id,
        status: WAREHOUSE_STATUSES,
        sortBy: 'sort_order',
        sortOrder: 'asc',
      });
      
      if (result.success && result.data) {
        const orders = result.data.orders || [];
        setPackageOrders(orders);
        // Find current order index
        const idx = orders.findIndex(o => o.uuid === id);
        setCurrentOrderIndex(idx);
      }
    } catch (error) {
      console.log('Failed to fetch package orders for navigation');
    }
  }, [packageId, worker?.id, id]);

  const fetchOrderDetail = useCallback(async () => {
    if (!id) {
      setError('Захиалгын мэдээлэл олдсонгүй');
      setIsLoading(false);
      return;
    }

    try {
      const result = await getOrderDetail(id);
      
      if (result.success && result.data) {
        setOrder(result.data.order);
        setProducts(result.data.products || []);
        setSummary(result.data.summary || null);
        setError(null);
      } else {
        setError(result.message || 'Захиалга олдсонгүй');
      }
    } catch (err) {
      setError('Сүлжээний алдаа');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrderDetail();
    fetchPackageOrders();
  }, [fetchOrderDetail, fetchPackageOrders]);

  // Auto-redirect to shop screen for delivery_pending orders
  useEffect(() => {
    if (order && order.delivery_status === DELIVERY_PENDING_STATUS) {
      // Navigate to shop delivery screen
      router.replace(`/order/${id}/shop` as any);
    }
  }, [order, id]);

  // Navigation helpers
  const hasPrevOrder = currentOrderIndex > 0;
  const hasNextOrder = currentOrderIndex >= 0 && currentOrderIndex < packageOrders.length - 1;
  
  const goToPrevOrder = () => {
    if (hasPrevOrder) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const prevOrder = packageOrders[currentOrderIndex - 1];
      router.replace(`/order/${prevOrder.uuid}?packageId=${packageId}` as any);
    }
  };
  
  const goToNextOrder = () => {
    if (hasNextOrder) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const nextOrder = packageOrders[currentOrderIndex + 1];
      router.replace(`/order/${nextOrder.uuid}?packageId=${packageId}` as any);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrderDetail();
    setRefreshing(false);
  }, [fetchOrderDetail]);

  // Handle product check toggle
  const handleProductCheck = async (product: OrderProduct) => {
    if (!order || checkingProducts.has(product.id)) return;
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const isCurrentlyChecked = checkerType === 'warehouse' 
      ? product.warehouse_checked 
      : product.driver_checked;
    const shouldCheck = !isCurrentlyChecked;
    
    // Optimistic update
    setCheckingProducts(prev => new Set(prev).add(product.id));
    setProducts(prev => prev.map(p => {
      if (p.id === product.id) {
        return {
          ...p,
          warehouse_checked: checkerType === 'warehouse' ? shouldCheck : p.warehouse_checked,
          driver_checked: checkerType === 'driver' ? shouldCheck : p.driver_checked,
          warehouse_checked_quantity: checkerType === 'warehouse' ? (shouldCheck ? p.quantity : 0) : p.warehouse_checked_quantity,
          driver_checked_quantity: checkerType === 'driver' ? (shouldCheck ? p.quantity : 0) : p.driver_checked_quantity,
        };
      }
      return p;
    }));
    
    // Fire and forget API call
    toggleProductCheck({
      orderUuid: order.uuid,
      productId: product.id,
      checkerType,
      checked: shouldCheck,
      quantity: product.quantity,
    }).catch(() => {
      // Revert on error
      fetchOrderDetail();
    }).finally(() => {
      setCheckingProducts(prev => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    });
  };

  const formatDate = (dateStr: string) => {
    return dateStr.replace(' ', ' | ');
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString() + '₮';
  };

  // Calculate total discount from products
  const calculateTotalDiscount = () => {
    // Delivery API doesn't have discountPoint structure
    return 0;
  };

  // Get discount items with details
  const getDiscountItems = () => {
    // Delivery API doesn't have discountPoint structure
    return [];
  };

  // Calculate product total
  const calculateProductTotal = (product: OrderProduct) => {
    const price = parseFloat(product.price) || 0;
    return price * product.quantity;
  };

  // Group products by brand - Delivery API doesn't have brand info, so we just return all products in one group
  const groupProductsByBrand = (prods: OrderProduct[]) => {
    return [['all', { brandName: 'Бүтээгдэхүүн', products: prods }]] as [string, { brandName: string; products: OrderProduct[] }][];
  };

  const groupedProducts = products.length > 0 ? groupProductsByBrand(products) : [];

  // Тулгалт харуулах эсэх - зөвхөн warehouse статусуудад
  const showCheckingUI = order ? WAREHOUSE_STATUSES_ARRAY.includes(order.delivery_status) : false;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Box className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text className="mt-4 text-typography-500">Ачаалж байна...</Text>
        </Box>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <Box className="flex-1 justify-center items-center px-4">
          <Info size={48} color="#DC2626" />
          <Text className="mt-4 text-typography-500 text-center">{error || 'Захиалга олдсонгүй'}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchOrderDetail}
          >
            <Text style={styles.retryButtonText}>Дахин оролдох</Text>
          </TouchableOpacity>
        </Box>
      </SafeAreaView>
    );
  }

  const discountItems = getDiscountItems();
  const totalDiscount = calculateTotalDiscount();
  const hasPromotions = false; // Delivery API doesn't have promotionPoint

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Захиалгын дэлгэрэнгүй</Text>
          {packageId && currentOrderIndex >= 0 && (
            <Text style={styles.headerSubtitle}>
              #{order.sort_order || currentOrderIndex + 1} / {packageOrders.length} падаан
            </Text>
          )}
        </View>
        <View style={{ width: 28 }} />
      </View>
      
      {/* Prev/Next Navigation Bar */}
      {packageId && packageOrders.length > 1 && (
        <View style={styles.navigationBar}>
          <TouchableOpacity
            style={[styles.navButton, !hasPrevOrder && styles.navButtonDisabled]}
            onPress={goToPrevOrder}
            disabled={!hasPrevOrder}
            activeOpacity={0.7}
          >
            <ChevronLeft size={20} color={hasPrevOrder ? "#2563EB" : "#D1D5DB"} />
            <Text style={[styles.navButtonText, !hasPrevOrder && styles.navButtonTextDisabled]}>
              Өмнөх
            </Text>
          </TouchableOpacity>
          
          <View style={styles.navProgress}>
            <Text style={styles.navProgressText}>
              {currentOrderIndex + 1} / {packageOrders.length}
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonNext, !hasNextOrder && styles.navButtonDisabled]}
            onPress={goToNextOrder}
            disabled={!hasNextOrder}
            activeOpacity={0.7}
          >
            <Text style={[styles.navButtonText, styles.navButtonTextNext, !hasNextOrder && styles.navButtonTextDisabled]}>
              Дараах
            </Text>
            <ChevronRight size={20} color={hasNextOrder ? "#e17100" : "#D1D5DB"} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Company Info Card */}
        <View style={styles.card}>
          <HStack style={{ alignItems: 'flex-start', gap: 12 }}>
            <View style={styles.cardIcon}>
              <Building2 size={24} color="#6B7280" />
            </View>
            <VStack style={{ flex: 1 }}>
              <Text style={styles.companyName}>{order.customer.name}</Text>
              <Text style={styles.registryNumber}>Регистр: {order.registry_number || '-'}</Text>
            </VStack>
          </HStack>
          
          {/* Order Info */}
          <View style={styles.orderInfoRow}>
            <HStack style={{ alignItems: 'center', gap: 8 }}>
              <View style={[styles.iconBadge, { backgroundColor: '#DBEAFE' }]}>
                <Calendar size={14} color="#2563EB" />
              </View>
              <View style={[styles.iconBadge, { backgroundColor: '#FEF3C7' }]}>
                <WarehouseIcon size={14} color="#F59E0B" />
              </View>
              <Text style={styles.orderInfoLabel}>Агуулах: {order.warehouse?.name || '-'}</Text>
            </HStack>
            <Text style={styles.orderInfoValue}>Огноо: {order.date}</Text>
          </View>
          
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderCode}>Дугаар: {order.order_code}</Text>
            <Text style={styles.totalAmount}>Дүн: {order.total_amount_formatted}</Text>
          </View>
        </View>

        {/* Discount Points Card */}
        <View style={styles.card}>
          <HStack style={{ alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <View style={[styles.cardIconSmall, { backgroundColor: '#FEF3C7' }]}>
              <Tag size={20} color="#F59E0B" />
            </View>
            <VStack>
              <Text style={styles.sectionTitle}>УРАМШУУЛЛЫН ОНОО</Text>
              <Text style={styles.sectionSubtitle}>Нийт: {discountItems.length} ширхэг</Text>
            </VStack>
          </HStack>
          
          {/* Discount info - not available in delivery API */}
          <View style={styles.emptyInfo}>
            <Info size={16} color="#9CA3AF" />
            <Text style={styles.emptyText}>Энэ захиалгад урамшуулал байхгүй байна</Text>
          </View>
        </View>

        {/* Promo Points Card */}
        <View style={styles.card}>
          <HStack style={{ alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <View style={[styles.cardIconSmall, { backgroundColor: '#F3E8FF' }]}>
              <Gift size={20} color="#8B5CF6" />
            </View>
            <VStack>
              <Text style={styles.sectionTitle}>НӨХЦӨЛ БИЕЛСЭН ПРОМО ЖАГСААЛТ</Text>
              <Text style={styles.sectionSubtitle}>Промо мэдээлэл байхгүй</Text>
            </VStack>
          </HStack>
          
          <View style={styles.emptyInfo}>
            <Info size={16} color="#9CA3AF" />
            <Text style={styles.emptyText}>Энэ захиалгад промо мэдээлэл байхгүй байна</Text>
          </View>
        </View>

        {/* Checker Type Selector - Нярав/Түгээгч сонголт - зөвхөн warehouse статусуудад */}
        {showCheckingUI && (
        <View style={styles.checkerSelectorCard}>
          <Text style={styles.checkerSelectorTitle}>Тулгалт хийх горим:</Text>
          <View style={styles.checkerButtonsRow}>
            <TouchableOpacity
              style={[
                styles.checkerButton,
                checkerType === 'warehouse' && styles.checkerButtonActiveWarehouse
              ]}
              onPress={() => setCheckerType('warehouse')}
              activeOpacity={0.7}
            >
              <WarehouseIcon size={18} color={checkerType === 'warehouse' ? '#FFFFFF' : '#2563EB'} />
              <Text style={[
                styles.checkerButtonText,
                checkerType === 'warehouse' && styles.checkerButtonTextActive
              ]}>Нярав</Text>
              {checkerType === 'warehouse' && <CheckCircle2 size={16} color="#FFFFFF" />}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.checkerButton,
                checkerType === 'driver' && styles.checkerButtonActiveDriver
              ]}
              onPress={() => setCheckerType('driver')}
              activeOpacity={0.7}
            >
              <Truck size={18} color={checkerType === 'driver' ? '#FFFFFF' : '#e17100'} />
              <Text style={[
                styles.checkerButtonText,
                checkerType === 'driver' && styles.checkerButtonTextActive
              ]}>Түгээгч</Text>
              {checkerType === 'driver' && <CheckCircle2 size={16} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
          
          {/* Check Progress Summary */}
          {products.length > 0 && (
            <View style={styles.checkProgressSummary}>
              <View style={styles.checkProgressRow}>
                <WarehouseIcon size={14} color="#2563EB" />
                <Text style={styles.checkProgressLabel}>Нярав:</Text>
                <View style={styles.checkProgressBarSmall}>
                  <View 
                    style={[
                      styles.checkProgressFillSmall,
                      styles.checkProgressFillWarehouse,
                      { width: `${products.reduce((sum, p) => sum + (p.warehouse_checked ? p.quantity : 0), 0) / Math.max(1, products.reduce((sum, p) => sum + p.quantity, 0)) * 100}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.checkProgressCount}>
                  {products.reduce((sum, p) => sum + (p.warehouse_checked ? p.quantity : 0), 0)}/
                  {products.reduce((sum, p) => sum + p.quantity, 0)}
                </Text>
              </View>
              <View style={styles.checkProgressRow}>
                <Truck size={14} color="#e17100" />
                <Text style={styles.checkProgressLabel}>Түгээгч:</Text>
                <View style={styles.checkProgressBarSmall}>
                  <View 
                    style={[
                      styles.checkProgressFillSmall,
                      styles.checkProgressFillDriver,
                      { width: `${products.reduce((sum, p) => sum + (p.driver_checked ? p.quantity : 0), 0) / Math.max(1, products.reduce((sum, p) => sum + p.quantity, 0)) * 100}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.checkProgressCount}>
                  {products.reduce((sum, p) => sum + (p.driver_checked ? p.quantity : 0), 0)}/
                  {products.reduce((sum, p) => sum + p.quantity, 0)}
                </Text>
              </View>
            </View>
          )}
        </View>
        )}

        {/* Products List Card */}
        <View style={styles.productsHeader}>
          <HStack style={{ alignItems: 'center', gap: 8 }}>
            <ShoppingBag size={20} color="#111827" />
            <Text style={styles.productsTitle}>Худалдан авсан барааны жагсаалт ({products.length})</Text>
          </HStack>
          <HStack style={{ gap: 4 }}>
            <TouchableOpacity 
              style={[styles.viewModeButton, viewMode === 'grid' && styles.viewModeButtonActive]}
              onPress={() => setViewMode('grid')}
            >
              <Grid3X3 size={18} color={viewMode === 'grid' ? '#FFFFFF' : '#6B7280'} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeButtonActive]}
              onPress={() => setViewMode('list')}
            >
              <List size={18} color={viewMode === 'list' ? '#FFFFFF' : '#6B7280'} />
            </TouchableOpacity>
          </HStack>
        </View>

        {/* Products */}
        {viewMode === 'grid' ? (
          // Grid View - Card style grouped by brand
          <View style={styles.productsCardList}>
            {groupedProducts.map(([brandId, group]) => (
              <View key={brandId} style={styles.brandGroup}>
                {/* Brand Header */}
                <View style={styles.brandHeader}>
                  <View style={styles.brandHeaderIcon}>
                    <Package size={14} color="#7C3AED" />
                  </View>
                  <Text style={styles.brandHeaderText}>{group.brandName}</Text>
                  <View style={styles.brandCountBadge}>
                    <Text style={styles.brandCountText}>{group.products.length}</Text>
                  </View>
                </View>
                
                {/* Products in this brand */}
                {group.products.map((product, index) => {
                  const isWarehouseChecked = product.warehouse_checked;
                  const isDriverChecked = product.driver_checked;
                  const myChecked = checkerType === 'warehouse' ? isWarehouseChecked : isDriverChecked;
                  const isBothChecked = isWarehouseChecked && isDriverChecked;
                  
                  return (
                    <View key={product.product_uuid || product.id} style={[
                      styles.productCard,
                      showCheckingUI && isBothChecked && styles.productCardCompleted
                    ]}>
                      <HStack style={{ gap: 12 }}>
                        {/* Check Button - зөвхөн warehouse статусуудад */}
                        {showCheckingUI ? (
                        <TouchableOpacity
                          style={[
                            styles.productCheckBtnLarge,
                            myChecked && styles.productCheckBtnLargeChecked
                          ]}
                          onPress={() => handleProductCheck(product)}
                          activeOpacity={0.6}
                        >
                          {myChecked ? (
                            <CheckCircle2 size={28} color="#FFFFFF" />
                          ) : (
                            <Circle size={28} color="#9CA3AF" />
                          )}
                        </TouchableOpacity>
                        ) : (
                          <View style={styles.productIndexBadge}>
                            <Text style={styles.productIndexText}>{index + 1}</Text>
                          </View>
                        )}
                        
                        {/* Product Info */}
                        <VStack style={{ flex: 1 }}>
                          <Text style={[styles.productName, showCheckingUI && isBothChecked && styles.textCompleted]} numberOfLines={2}>
                            {showCheckingUI ? `${index + 1}. ` : ''}{product.name}
                          </Text>
                          
                          {/* Check Status Row - зөвхөн warehouse статусуудад */}
                          {showCheckingUI && (
                          <HStack style={{ marginTop: 4, gap: 12 }}>
                            <View style={styles.checkStatusItem}>
                              <WarehouseIcon size={11} color={isWarehouseChecked ? "#e17100" : "#9CA3AF"} />
                              <Text style={[styles.checkStatusTextSmall, isWarehouseChecked && styles.checkStatusChecked]}>
                                {isWarehouseChecked ? '✓' : '-'}
                              </Text>
                            </View>
                            <View style={styles.checkStatusItem}>
                              <Truck size={11} color={isDriverChecked ? "#e17100" : "#9CA3AF"} />
                              <Text style={[styles.checkStatusTextSmall, isDriverChecked && styles.checkStatusChecked]}>
                                {isDriverChecked ? '✓' : '-'}
                              </Text>
                            </View>
                          </HStack>
                          )}
                          
                          {/* Qty, Price, Total - all in one row */}
                          <HStack style={{ marginTop: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                            <HStack style={{ gap: 12 }}>
                              <HStack style={{ alignItems: 'center', gap: 4 }}>
                                <Boxes size={12} color="#6B7280" />
                                <Text style={styles.priceText}>
                                  {product.quantity}ш
                                </Text>
                              </HStack>
                              <HStack style={{ alignItems: 'center', gap: 4 }}>
                                <Banknote size={12} color="#6B7280" />
                                <Text style={styles.priceText}>{product.price}₮</Text>
                              </HStack>
                            </HStack>
                            <Text style={styles.productTotalText}>Нийт: {formatAmount(calculateProductTotal(product))}</Text>
                          </HStack>
                        </VStack>
                      </HStack>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        ) : (
          // List View - Products grouped by brand
          <View style={styles.productListContainer}>
            {groupedProducts.map(([brandId, group], groupIndex) => (
              <View key={brandId} style={styles.brandGroup}>
                {/* Brand Header */}
                <View style={styles.brandHeader}>
                  <View style={styles.brandHeaderIcon}>
                    <Package size={12} color="#6B7280" />
                  </View>
                  <Text style={styles.brandHeaderText}>{group.brandName}</Text>
                  <View style={styles.brandCountBadge}>
                    <Text style={styles.brandCountText}>{group.products.length}</Text>
                  </View>
                </View>
                
                {/* Products in this brand */}
                {group.products.map((product, index) => {
                  const isWarehouseChecked = product.warehouse_checked;
                  const isDriverChecked = product.driver_checked;
                  const myChecked = checkerType === 'warehouse' ? isWarehouseChecked : isDriverChecked;
                  const isBothChecked = isWarehouseChecked && isDriverChecked;
                  
                  return (
                    <View key={product.product_uuid || product.id} style={[
                      styles.productListItem,
                      showCheckingUI && isBothChecked && styles.productListItemCompleted
                    ]}>
                      {/* Row 1: Number, Product Name, Check Button */}
                      <View style={styles.productListNameRow}>
                        <Text style={[styles.productListIndex, showCheckingUI && isBothChecked && styles.textCompleted]}>{index + 1}.</Text>
                        <Text style={[styles.productListName, showCheckingUI && isBothChecked && styles.textCompleted]}>
                          {product.name}
                        </Text>
                        
                        {/* Check Button - зөвхөн warehouse статусуудад */}
                        {showCheckingUI && (
                        <TouchableOpacity
                          style={[
                            styles.productCheckBtn,
                            myChecked && styles.productCheckBtnChecked
                          ]}
                          onPress={() => handleProductCheck(product)}
                          activeOpacity={0.6}
                        >
                          {myChecked ? (
                            <CheckCircle2 size={22} color="#FFFFFF" />
                          ) : (
                            <Circle size={22} color="#9CA3AF" />
                          )}
                        </TouchableOpacity>
                        )}
                      </View>
                      
                      {/* Row 2: Price, Qty, Total */}
                      <View style={styles.productListPriceRow}>
                        <HStack style={{ gap: 12 }}>
                          <Text style={styles.productListPriceLabel}>Үнэ: <Text style={styles.productListPriceValue}>{product.price}₮</Text></Text>
                          <Text style={styles.productListPriceLabel}>Тоо: <Text style={styles.productListPriceValue}>{product.quantity}</Text></Text>
                        </HStack>
                        <Text style={styles.productListTotalValue}>{formatAmount(calculateProductTotal(product))}</Text>
                      </View>
                      
                      {/* Row 3: Check Status - зөвхөн warehouse статусуудад */}
                      {showCheckingUI && (
                      <View style={styles.productCheckStatusRow}>
                        <View style={styles.checkStatusItem}>
                          <WarehouseIcon size={12} color={isWarehouseChecked ? "#e17100" : "#9CA3AF"} />
                          <Text style={[styles.checkStatusText, isWarehouseChecked && styles.checkStatusChecked]}>
                            Нярав {isWarehouseChecked ? '✓' : '-'}
                          </Text>
                        </View>
                        <View style={styles.checkStatusItem}>
                          <Truck size={12} color={isDriverChecked ? "#e17100" : "#9CA3AF"} />
                          <Text style={[styles.checkStatusText, isDriverChecked && styles.checkStatusChecked]}>
                            Түгээгч {isDriverChecked ? '✓' : '-'}
                          </Text>
                        </View>
                      </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {/* Bottom Notice */}
        {(discountItems.length > 0 || hasPromotions) && (
          <View style={styles.bottomNotice}>
            <Info size={18} color="#F59E0B" />
            <Text style={styles.bottomNoticeText}>
              Тухайн захиалгад Промо болон урамшууллын дүн тооцоологдсон байна
            </Text>
          </View>
        )}

        <View style={{ height: order?.delivery_status === DELIVERY_PENDING_STATUS ? 100 : 40 }} />
      </ScrollView>
      
      {/* Bottom Action Bar - Дэлгүүрт хүлээлгэх товч */}
      {order?.delivery_status === DELIVERY_PENDING_STATUS && (
        <View style={styles.bottomActionBar}>
          <TouchableOpacity
            style={styles.shopDeliveryButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push(`/order/${id}/shop` as any);
            }}
            activeOpacity={0.8}
          >
            <Store size={22} color="#FFFFFF" />
            <Text style={styles.shopDeliveryButtonText}>Дэлгүүрт хүлээлгэх</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
    marginTop: 2,
  },
  // Navigation Bar
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    gap: 4,
  },
  navButtonNext: {
    backgroundColor: '#ECFDF5',
  },
  navButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  navButtonText: {
    fontSize: 13,
    fontFamily: 'GIP-SemiBold',
    color: '#2563EB',
  },
  navButtonTextNext: {
    color: '#e17100',
  },
  navButtonTextDisabled: {
    color: '#9CA3AF',
  },
  navProgress: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  navProgressText: {
    fontSize: 12,
    fontFamily: 'GIP-Bold',
    color: '#374151',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconSmall: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyName: {
    fontSize: 16,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
  },
  registryNumber: {
    fontSize: 13,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderInfoLabel: {
    fontSize: 13,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  orderInfoValue: {
    fontSize: 13,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  orderCode: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
  },
  totalAmount: {
    fontSize: 16,
    fontFamily: 'GIP-Bold',
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'GIP-Bold',
    color: '#111827',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#f59e0b',
    marginTop: 2,
  },
  discountTable: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    overflow: 'hidden',
  },
  discountTableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  discountHeaderText: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  discountBadge: {
    backgroundColor: '#F97316',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadgeText: {
    fontSize: 11,
    fontFamily: 'GIP-Bold',
    color: '#FFFFFF',
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  discountName: {
    fontSize: 13,
    fontFamily: 'GIP-Regular',
    color: '#374151',
  },
  discountAmount: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#F97316',
  },
  totalDiscountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
  },
  totalDiscountLabel: {
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#DC2626',
  },
  totalDiscountAmount: {
    fontSize: 16,
    fontFamily: 'GIP-Bold',
    color: '#DC2626',
  },
  emptyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  promoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  promoName: {
    fontSize: 13,
    fontFamily: 'GIP-Regular',
    color: '#374151',
  },
  promoAmount: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#8B5CF6',
  },
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  productsTitle: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
  },
  viewModeButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  viewModeButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  bottomNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  bottomNoticeText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#B45309',
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#FFFFFF',
  },
  // Card List View Styles (Grid button)
  productsCardList: {
    paddingHorizontal: 16,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  productName: {
    fontSize: 13,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
    lineHeight: 18,
  },
  priceIcon: {
    fontSize: 11,
  },
  priceText: {
    fontSize: 12,
    fontFamily: 'GIP-SemiBold',
    color: '#374151',
  },
  productTotalText: {
    fontSize: 12,
    fontFamily: 'GIP-Bold',
    color: '#f59e0b',
  },
  quantitySummary: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    alignSelf: 'flex-start' as const,
  },
  quantityValue: {
    fontSize: 11,
    fontFamily: 'GIP-Bold',
    color: '#2563EB',
  },
  // Expanded List View Styles (List button)
  productListContainer: {
    marginHorizontal: 16,
  },
  brandGroup: {
    marginBottom: 10,
  },
  brandHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 4,
  },
  brandHeaderIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  brandHeaderText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'GIP-SemiBold',
    color: '#374151',
  },
  brandCountBadge: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  brandCountText: {
    fontSize: 10,
    fontFamily: 'GIP-Bold',
    color: '#FFFFFF',
  },
  productListItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 2,
    borderLeftColor: '#D1D5DB',
  },
  productListNameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  productListIndex: {
    fontSize: 11,
    fontFamily: 'GIP-SemiBold',
    color: '#2563EB',
    minWidth: 20,
  },
  productListName: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#111827',
    lineHeight: 16,
  },
  productBadgesRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginTop: 8,
    marginLeft: 24,
  },
  categoryBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontFamily: 'GIP-Medium',
    color: '#1D4ED8',
  },
  brandBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  brandBadgeText: {
    fontSize: 10,
    fontFamily: 'GIP-Medium',
    color: '#7C3AED',
  },
  productListPriceRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginTop: 4,
    marginLeft: 20,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  productListPriceLabel: {
    fontSize: 10,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  productListPriceValue: {
    fontFamily: 'GIP-SemiBold',
    color: '#374151',
  },
  productListTotalValue: {
    fontSize: 12,
    fontFamily: 'GIP-Bold',
    color: '#f59e0b',
  },
  // Check button styles
  productCheckBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  productCheckBtnChecked: {
    backgroundColor: '#e17100',
  },
  productCheckBtnLarge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productCheckBtnLargeChecked: {
    backgroundColor: '#e17100',
  },
  productIndexBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productIndexText: {
    fontSize: 16,
    fontFamily: 'GIP-Bold',
    color: '#FFFFFF',
  },
  productListItemCompleted: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  productCardCompleted: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  textCompleted: {
    color: '#e17100',
  },
  productCheckStatusRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    marginLeft: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  checkStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkStatusText: {
    fontSize: 11,
    fontFamily: 'GIP-Medium',
    color: '#9CA3AF',
  },
  checkStatusTextSmall: {
    fontSize: 10,
    fontFamily: 'GIP-Medium',
    color: '#9CA3AF',
  },
  checkStatusChecked: {
    color: '#e17100',
  },
  // Checker Selector Styles
  checkerSelectorCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  checkerSelectorTitle: {
    fontSize: 13,
    fontFamily: 'GIP-SemiBold',
    color: '#6B7280',
    marginBottom: 12,
  },
  checkerButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  checkerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  checkerButtonActiveWarehouse: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkerButtonActiveDriver: {
    backgroundColor: '#e17100',
    borderColor: '#e17100',
  },
  checkerButtonText: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#374151',
  },
  checkerButtonTextActive: {
    color: '#FFFFFF',
  },
  checkProgressSummary: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  checkProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkProgressLabel: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
    width: 55,
  },
  checkProgressBarSmall: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  checkProgressFillSmall: {
    height: '100%',
    borderRadius: 4,
  },
  checkProgressFillWarehouse: {
    backgroundColor: '#2563EB',
  },
  checkProgressFillDriver: {
    backgroundColor: '#e17100',
  },
  checkProgressCount: {
    fontSize: 12,
    fontFamily: 'GIP-SemiBold',
    color: '#374151',
    minWidth: 50,
    textAlign: 'right',
  },
  // Bottom Action Bar Styles
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 10,
  },
  shopDeliveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e17100',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  shopDeliveryButtonText: {
    fontSize: 16,
    fontFamily: 'GIP-Bold',
    color: '#FFFFFF',
  },
});
