/**
 * ХАЙРЦАГААР ТУЛГАХ ДЭЛГЭЦ
 * 
 * Бүх захиалгуудын бараануудыг нэгтгэж харуулах
 * - Брэндээр бүлэглэж харуулах
 * - Сери дугаартай бараанууд тусдаа эгнээнд
 * - Article, Barcode мэдээлэл харуулах
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  SectionList,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { 
  Package, 
  ArrowLeft,
  Calendar,
  Barcode,
  Hash,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Tag,
  Users,
  FileText,
  ArrowUpDown,
  SortAsc,
  SortDesc,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../../stores/delivery-auth-store';
import { getPackageProducts, toggleProductCheck, AggregatedProduct, PackageProductsData } from '../../../services/delivery-api';

// Polling interval for realtime updates (3 seconds - balanced between sync and performance)
const POLLING_INTERVAL = 3000;
// Delay after check action before polling resumes (prevents flicker)
const POST_CHECK_DELAY = 1500;

// Warehouse related statuses
const WAREHOUSE_STATUSES = 'assigned_to_driver,warehouse_checking,warehouse_checked,driver_checking';

// Sort options
type SortOption = 'brand' | 'name' | 'quantity_desc' | 'quantity_asc';

const SORT_OPTIONS: { value: SortOption; label: string; icon: string }[] = [
  { value: 'brand', label: 'Брэндээр', icon: 'tag' },
  { value: 'name', label: 'Үсгийн дараалал', icon: 'sort-asc' },
  { value: 'quantity_desc', label: 'Их → Бага', icon: 'sort-desc' },
  { value: 'quantity_asc', label: 'Бага → Их', icon: 'sort-asc' },
];

// Brand section type
interface BrandSection {
  title: string;
  brandName: string | null;
  data: AggregatedProduct[];
  isExpanded: boolean;
}

export default function PackageBoxCheckingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { worker } = useAuthStore();
  
  const [data, setData] = useState<PackageProductsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collapsedBrands, setCollapsedBrands] = useState<Set<string>>(new Set());
  const [sortOption, setSortOption] = useState<SortOption>('brand');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [checkingProducts, setCheckingProducts] = useState<Set<string>>(new Set()); // Products being checked
  const [lastCheckTime, setLastCheckTime] = useState(0); // Track last check action time

  // Department id=3 бол warehouse (нярав), бусад бол driver (түгээгч)
  const [checkerType, setCheckerType] = useState<'warehouse' | 'driver'>('driver');
  
  // Worker department өөрчлөгдөхөд checkerType шинэчлэх
  useEffect(() => {
    if (worker?.department?.id === 3) {
      setCheckerType('warehouse');
    } else {
      setCheckerType('driver');
    }
  }, [worker?.department?.id]);

  const fetchProducts = useCallback(async () => {
    if (!id) return;
    
    try {
      const result = await getPackageProducts({
        packageId: parseInt(id),
        workerId: worker?.id,
        status: WAREHOUSE_STATUSES,
      });
      
      if (result.success && result.data) {
        setData(result.data);
      } else {
        Alert.alert('Алдаа', result.message || 'Бараа татахад алдаа гарлаа');
      }
    } catch (error) {
      Alert.alert('Алдаа', 'Сүлжээний алдаа гарлаа');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, worker?.id]);

  // Silent refresh for polling (no loading state)
  const silentRefresh = useCallback(async () => {
    if (!id) return;
    
    // Skip polling if recent check action (prevents flicker)
    const timeSinceLastCheck = Date.now() - lastCheckTime;
    if (timeSinceLastCheck < POST_CHECK_DELAY) {
      return;
    }
    
    try {
      const result = await getPackageProducts({
        packageId: parseInt(id),
        workerId: worker?.id,
        status: WAREHOUSE_STATUSES,
      });
      
      if (result.success && result.data) {
        setData(result.data);
      }
    } catch (error) {
      // Silent fail for polling
    }
  }, [id, worker?.id, lastCheckTime]);

  // Initial fetch
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Realtime polling every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      silentRefresh();
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [silentRefresh]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  // Handle bulk check toggle for a product (all order_details at once)
  const handleProductBulkCheck = async (item: AggregatedProduct) => {
    const productKey = getProductKey(item);
    
    // Prevent double clicks
    if (checkingProducts.has(productKey)) return;
    
    // Instant haptic feedback - feels responsive immediately
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Determine if we should check or uncheck based on current state
    const myCheckedCount = checkerType === 'warehouse' 
      ? item.warehouse_checked_quantity 
      : item.driver_checked_quantity;
    const shouldCheck = myCheckedCount < item.total_quantity;
    
    // Optimistic UI update
    setCheckingProducts(prev => new Set(prev).add(productKey));
    
    // Update local state immediately (optimistic) - including summary
    setData(prevData => {
      if (!prevData) return prevData;
      
      // Calculate the difference for summary update
      const quantityDiff = shouldCheck ? item.total_quantity - myCheckedCount : -myCheckedCount;
      
      const newAllProducts = prevData.all_products.map(product => {
        if (getProductKey(product) === productKey) {
          const newOrderDetails = product.order_details.map(detail => ({
            ...detail,
            warehouse_checked: checkerType === 'warehouse' ? shouldCheck : detail.warehouse_checked,
            driver_checked: checkerType === 'driver' ? shouldCheck : detail.driver_checked,
            warehouse_checked_quantity: checkerType === 'warehouse' ? (shouldCheck ? detail.quantity : 0) : detail.warehouse_checked_quantity,
            driver_checked_quantity: checkerType === 'driver' ? (shouldCheck ? detail.quantity : 0) : detail.driver_checked_quantity,
          }));
          
          const newWarehouseCheckedQty = newOrderDetails.reduce((sum, d) => sum + (d.warehouse_checked ? d.quantity : 0), 0);
          const newDriverCheckedQty = newOrderDetails.reduce((sum, d) => sum + (d.driver_checked ? d.quantity : 0), 0);
          
          return {
            ...product,
            order_details: newOrderDetails,
            warehouse_checked_quantity: newWarehouseCheckedQty,
            driver_checked_quantity: newDriverCheckedQty,
            is_warehouse_fully_checked: newWarehouseCheckedQty >= product.total_quantity,
            is_driver_fully_checked: newDriverCheckedQty >= product.total_quantity,
          };
        }
        return product;
      });
      
      // Update summary immediately too
      const newSummary = {
        ...prevData.summary,
        warehouse_checked_quantity: checkerType === 'warehouse' 
          ? prevData.summary.warehouse_checked_quantity + quantityDiff 
          : prevData.summary.warehouse_checked_quantity,
        driver_checked_quantity: checkerType === 'driver' 
          ? prevData.summary.driver_checked_quantity + quantityDiff 
          : prevData.summary.driver_checked_quantity,
      };
      
      return {
        ...prevData,
        all_products: newAllProducts,
        summary: newSummary,
      };
    });
    
    // Mark last check time to prevent polling from overwriting optimistic update
    setLastCheckTime(Date.now());
    
    // Fire-and-forget API calls - polling will sync after delay
    Promise.allSettled(
      item.order_details.map(detail => 
        toggleProductCheck({
          order_uuid: detail.erp_order_uuid,
          product_id: detail.product_line_id,
          checker_type: checkerType,
          checked: shouldCheck,
          quantity: detail.quantity,
        })
      )
    ).then(results => {
      const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
      if (failures.length > 0) {
        // Some failed, refetch to get accurate state after delay
        setTimeout(() => fetchProducts(), POST_CHECK_DELAY);
      }
    });
    
    // Remove from checking immediately - UI already updated
    setCheckingProducts(prev => {
      const next = new Set(prev);
      next.delete(productKey);
      return next;
    });
  };

  // Group products by brand and sort
  const sections = useMemo((): BrandSection[] => {
    if (!data?.all_products) return [];

    // For brand grouping
    if (sortOption === 'brand') {
      // Group by brand_name
      const brandGroups = new Map<string, AggregatedProduct[]>();
      
      data.all_products.forEach(product => {
        const brandKey = product.brand_name || 'Брэндгүй';
        if (!brandGroups.has(brandKey)) {
          brandGroups.set(brandKey, []);
        }
        brandGroups.get(brandKey)!.push(product);
      });

      // Sort brands alphabetically, put "Брэндгүй" at the end
      const sortedBrands = Array.from(brandGroups.keys()).sort((a, b) => {
        if (a === 'Брэндгүй') return 1;
        if (b === 'Брэндгүй') return -1;
        return a.localeCompare(b, 'mn');
      });

      // Create sections
      return sortedBrands.map(brandName => {
        const products = brandGroups.get(brandName)!;
        // Sort products within brand by name
        products.sort((a, b) => a.name.localeCompare(b.name, 'mn'));
        
        const isExpanded = !collapsedBrands.has(brandName);
        
        return {
          title: brandName,
          brandName: brandName === 'Брэндгүй' ? null : brandName,
          data: isExpanded ? products : [],
          isExpanded,
        };
      });
    }

    // For other sort options - single section with all products
    let sortedProducts = [...data.all_products];
    
    switch (sortOption) {
      case 'name':
        sortedProducts.sort((a, b) => a.name.localeCompare(b.name, 'mn'));
        break;
      case 'quantity_desc':
        sortedProducts.sort((a, b) => b.total_quantity - a.total_quantity);
        break;
      case 'quantity_asc':
        sortedProducts.sort((a, b) => a.total_quantity - b.total_quantity);
        break;
    }

    const sectionTitle = sortOption === 'name' ? 'Үсгийн дараалал (А-Я)' 
      : sortOption === 'quantity_desc' ? 'Тоо хэмжээ (Их → Бага)'
      : 'Тоо хэмжээ (Бага → Их)';

    return [{
      title: sectionTitle,
      brandName: null,
      data: sortedProducts,
      isExpanded: true,
    }];
  }, [data?.all_products, collapsedBrands, sortOption]);

  const toggleBrandSection = (brandName: string) => {
    const newCollapsed = new Set(collapsedBrands);
    if (newCollapsed.has(brandName)) {
      newCollapsed.delete(brandName);
    } else {
      newCollapsed.add(brandName);
    }
    setCollapsedBrands(newCollapsed);
  };

  const getProductKey = (product: AggregatedProduct) => {
    return `${product.product_uuid}_${product.serial_number || 'no_serial'}`;
  };

  const renderProductItem = ({ item, index }: { item: AggregatedProduct; index: number }) => {
    const productKey = getProductKey(item);
    const isChecking = checkingProducts.has(productKey);
    
    // Check if both warehouse and driver have fully checked
    const isBothFullyChecked = item.is_warehouse_fully_checked && item.is_driver_fully_checked;
    
    // Determine my check status
    const myCheckedQty = checkerType === 'warehouse' ? item.warehouse_checked_quantity : item.driver_checked_quantity;
    const myFullyChecked = checkerType === 'warehouse' ? item.is_warehouse_fully_checked : item.is_driver_fully_checked;
    
    return (
      <View style={[
        styles.productCard,
        isBothFullyChecked && styles.productCardCompleted
      ]}>
        {/* Product Row */}
        <View style={styles.productHeader}>
          {/* Product Image */}
          <View style={styles.productImageContainer}>
            {item.image_url ? (
              <Image
                source={{ uri: item.image_url.replace('https://cloud.local.maximus.mn.test', 'https://cloud.maximus.mn') }}
                style={styles.productImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.productImagePlaceholder}>
                <Package size={20} color="#9CA3AF" />
              </View>
            )}
          </View>
          
          <View style={styles.productMainInfo}>
            <Text style={[
              styles.productName,
              isBothFullyChecked && styles.productNameCompleted
            ]} numberOfLines={2}>
              {item.name}
            </Text>
            
            {/* Product Details - Article, Barcode, Serial */}
            <View style={styles.productDetails}>
              {item.article && (
                <View style={styles.detailRow}>
                  <FileText size={11} color={isBothFullyChecked ? "#9CA3AF" : "#6B7280"} />
                  <Text style={[styles.detailLabel, isBothFullyChecked && styles.textCompleted]}>Артикул:</Text>
                  <Text style={[styles.detailValue, isBothFullyChecked && styles.textCompleted]}>{item.article}</Text>
                </View>
              )}
              
              {item.barcode && (
                <View style={styles.detailRow}>
                  <Barcode size={11} color={isBothFullyChecked ? "#9CA3AF" : "#6B7280"} />
                  <Text style={[styles.detailLabel, isBothFullyChecked && styles.textCompleted]}>Баркод:</Text>
                  <Text style={[styles.detailValue, isBothFullyChecked && styles.textCompleted]}>{item.barcode}</Text>
                </View>
              )}
              
              {/* Serial - always show, display "-" if no serial */}
              <View style={[styles.detailRow, item.serial_number ? styles.serialRow : null]}>
                <Hash size={11} color={isBothFullyChecked ? "#9CA3AF" : item.serial_number ? "#7C3AED" : "#9CA3AF"} />
                <Text style={[
                  styles.detailLabel, 
                  item.serial_number && !isBothFullyChecked && { color: '#7C3AED' },
                  isBothFullyChecked && styles.textCompleted
                ]}>Сери:</Text>
                <Text style={[
                  item.serial_number ? styles.serialValue : styles.detailValue,
                  isBothFullyChecked && styles.textCompleted
                ]}>
                  {item.serial_number || '-'}
                </Text>
              </View>
            </View>
            
            {/* Dual Check Status - Warehouse & Driver */}
            <View style={styles.dualCheckContainer}>
              <View style={[
                styles.dualCheckItem,
                styles.dualCheckItemWarehouse,
                item.is_warehouse_fully_checked && styles.dualCheckItemWarehouseComplete
              ]}>
                <Text style={[styles.dualCheckLabel, styles.dualCheckLabelWarehouse]}>Нярав</Text>
                <Text style={[
                  styles.dualCheckValue,
                  styles.dualCheckValueWarehouse,
                  item.is_warehouse_fully_checked && styles.dualCheckValueWarehouseComplete
                ]}>
                  {item.warehouse_checked_quantity}/{item.total_quantity}
                </Text>
              </View>
              <View style={[
                styles.dualCheckItem,
                styles.dualCheckItemDriver,
                item.is_driver_fully_checked && styles.dualCheckItemDriverComplete
              ]}>
                <Text style={[styles.dualCheckLabel, styles.dualCheckLabelDriver]}>Түгээгч</Text>
                <Text style={[
                  styles.dualCheckValue,
                  styles.dualCheckValueDriver,
                  item.is_driver_fully_checked && styles.dualCheckValueDriverComplete
                ]}>
                  {item.driver_checked_quantity}/{item.total_quantity}
                </Text>
              </View>
              
              {/* Orders count indicator */}
              {item.orders_count > 1 && (
                <View style={styles.ordersCountBadge}>
                  <Users size={10} color="#6B7280" />
                  <Text style={styles.ordersCountText}>{item.orders_count}</Text>
                </View>
              )}
            </View>
          </View>
          
          {/* Quantity and Check Button */}
          <View style={styles.productQuantityInfo}>
            <Text style={[styles.quantityLabel, isBothFullyChecked && styles.textCompleted]}>Тоо</Text>
            <Text style={[styles.quantityValue, isBothFullyChecked && styles.quantityValueCompleted]}>
              {item.total_quantity}
            </Text>
            
            {/* Check button for the product - instant feedback, no loading */}
            <TouchableOpacity
              style={[
                styles.productCheckButton,
                myFullyChecked && styles.productCheckButtonChecked
              ]}
              onPress={() => handleProductBulkCheck(item)}
              activeOpacity={0.6}
            >
              {myFullyChecked ? (
                <CheckCircle2 size={24} color="#FFFFFF" />
              ) : myCheckedQty > 0 ? (
                <View style={styles.partialCheckIcon}>
                  <Circle size={24} color="#F59E0B" />
                  <Text style={styles.partialCheckText}>{myCheckedQty}</Text>
                </View>
              ) : (
                <Circle size={24} color="#9CA3AF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: BrandSection }) => {
    // For brand grouping, show count and allow collapse
    if (sortOption === 'brand') {
      const productCount = data?.all_products?.filter(
        p => (p.brand_name || 'Брэндгүй') === section.title
      ).length || 0;
      
      return (
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleBrandSection(section.title)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <Tag size={16} color="#2563EB" />
            <Text style={styles.sectionHeaderText}>{section.title}</Text>
            <View style={styles.sectionCountBadge}>
              <Text style={styles.sectionCountText}>{productCount}</Text>
            </View>
          </View>
          {section.isExpanded ? (
            <ChevronUp size={18} color="#6B7280" />
          ) : (
            <ChevronDown size={18} color="#6B7280" />
          )}
        </TouchableOpacity>
      );
    }

    // For other sort options, show simple header
    return (
      <View style={styles.sectionHeaderSimple}>
        {sortOption === 'name' ? (
          <SortAsc size={16} color="#2563EB" />
        ) : sortOption === 'quantity_desc' ? (
          <SortDesc size={16} color="#2563EB" />
        ) : (
          <SortAsc size={16} color="#2563EB" />
        )}
        <Text style={styles.sectionHeaderText}>{section.title}</Text>
        <View style={styles.sectionCountBadge}>
          <Text style={styles.sectionCountText}>{section.data.length}</Text>
        </View>
      </View>
    );
  };

  // Sort selector component
  const renderSortSelector = () => (
    <View style={styles.sortContainer}>
      <TouchableOpacity
        style={styles.sortButton}
        onPress={() => setShowSortMenu(true)}
        activeOpacity={0.7}
      >
        <ArrowUpDown size={16} color="#4B5563" />
        <Text style={styles.sortButtonText}>
          {SORT_OPTIONS.find(o => o.value === sortOption)?.label}
        </Text>
        <ChevronDown size={16} color="#4B5563" />
      </TouchableOpacity>
      
      <Modal
        visible={showSortMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSortMenu(false)}
      >
        <Pressable 
          style={styles.sortModalOverlay}
          onPress={() => setShowSortMenu(false)}
        >
          <View style={styles.sortModalContent}>
            <Text style={styles.sortModalTitle}>Эрэмбэлэх</Text>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.sortMenuItem,
                  sortOption === option.value && styles.sortMenuItemActive
                ]}
                onPress={() => {
                  setSortOption(option.value);
                  setShowSortMenu(false);
                }}
              >
                {option.icon === 'tag' && <Tag size={18} color={sortOption === option.value ? "#2563EB" : "#6B7280"} />}
                {option.icon === 'sort-asc' && <SortAsc size={18} color={sortOption === option.value ? "#2563EB" : "#6B7280"} />}
                {option.icon === 'sort-desc' && <SortDesc size={18} color={sortOption === option.value ? "#2563EB" : "#6B7280"} />}
                <Text style={[
                  styles.sortMenuItemText,
                  sortOption === option.value && styles.sortMenuItemTextActive
                ]}>
                  {option.label}
                </Text>
                {sortOption === option.value && (
                  <CheckCircle2 size={18} color="#2563EB" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Уншиж байна...</Text>
      </SafeAreaView>
    );
  }

  // Calculate brand count
  const brandCount = new Set(data?.all_products?.map(p => p.brand_name || 'Брэндгүй')).size;

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Хайрцагаар тулгах',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 8 }}>
              <ArrowLeft size={24} color="#1F2937" />
            </TouchableOpacity>
          ),
        }}
      />
      
      <View style={styles.container}>
        <SectionList
          sections={sections}
          renderItem={renderProductItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => getProductKey(item)}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <>
              {/* Package Header */}
              {data?.package && (
                <View style={styles.packageHeader}>
                  <View style={styles.packageTitleRow}>
                    <Calendar size={18} color="#2563EB" />
                    <Text style={styles.packageTitle}>Багц: {data.package.name}</Text>
                  </View>
                  <View style={styles.packageInfoRow}>
                    <Text style={styles.packageDate}>{data.package.formatted_date}</Text>
                    <Text style={styles.packageOrderCount}>{data.summary.orders_count} захиалга</Text>
                  </View>
                </View>
              )}

              {/* Summary Stats */}
              {data?.summary && (
                <View style={styles.summaryContainer}>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryValue}>{brandCount}</Text>
                      <Text style={styles.summaryLabel}>Брэнд</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryValue}>{data.summary.total_products}</Text>
                      <Text style={styles.summaryLabel}>Бараа</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryValue}>{data.summary.total_quantity}</Text>
                      <Text style={styles.summaryLabel}>Нийт тоо</Text>
                    </View>
                  </View>
                  
                  {/* Dual Progress Bars - Warehouse & Driver */}
                  <View style={styles.dualProgressContainer}>
                    {/* Warehouse Progress - Clickable only for warehouse staff (department id=3) */}
                    <TouchableOpacity 
                      style={[
                        styles.dualProgressItem,
                        checkerType === 'warehouse' && styles.dualProgressItemActive,
                        worker?.department?.id !== 3 && styles.dualProgressItemDisabled
                      ]}
                      onPress={() => worker?.department?.id === 3 && setCheckerType('warehouse')}
                      activeOpacity={worker?.department?.id === 3 ? 0.7 : 1}
                      disabled={worker?.department?.id !== 3}
                    >
                      <View style={styles.dualProgressHeader}>
                        <Text style={[
                          styles.dualProgressLabel,
                          checkerType === 'warehouse' && styles.dualProgressLabelActive
                        ]}>Нярав {checkerType === 'warehouse' ? '✓' : ''}</Text>
                        <Text style={[styles.dualProgressValue, { color: '#e17100' }]}>
                          {data.summary.warehouse_checked_quantity}/{data.summary.total_quantity}
                        </Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View 
                          style={[
                            styles.progressFill,
                            styles.progressFillWarehouse,
                            { 
                              width: `${data.summary.total_quantity > 0 
                                ? (data.summary.warehouse_checked_quantity / data.summary.total_quantity) * 100 
                                : 0}%` 
                            }
                          ]} 
                        />
                      </View>
                      <Text style={[styles.dualProgressPercent, { color: '#e17100' }]}>
                        {data.summary.total_quantity > 0 
                          ? Math.round((data.summary.warehouse_checked_quantity / data.summary.total_quantity) * 100)
                          : 0}%
                      </Text>
                    </TouchableOpacity>
                    
                    {/* Driver Progress - Clickable only for non-warehouse staff */}
                    <TouchableOpacity 
                      style={[
                        styles.dualProgressItem,
                        checkerType === 'driver' && styles.dualProgressItemActive,
                        worker?.department?.id === 3 && styles.dualProgressItemDisabled
                      ]}
                      onPress={() => worker?.department?.id !== 3 && setCheckerType('driver')}
                      activeOpacity={worker?.department?.id !== 3 ? 0.7 : 1}
                      disabled={worker?.department?.id === 3}
                    >
                      <View style={styles.dualProgressHeader}>
                        <Text style={[
                          styles.dualProgressLabel,
                          checkerType === 'driver' && styles.dualProgressLabelActive
                        ]}>Түгээгч {checkerType === 'driver' ? '✓' : ''}</Text>
                        <Text style={[styles.dualProgressValue, { color: '#2563EB' }]}>
                          {data.summary.driver_checked_quantity}/{data.summary.total_quantity}
                        </Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View 
                          style={[
                            styles.progressFill,
                            styles.progressFillDriver,
                            { 
                              width: `${data.summary.total_quantity > 0 
                                ? (data.summary.driver_checked_quantity / data.summary.total_quantity) * 100 
                                : 0}%` 
                            }
                          ]} 
                        />
                      </View>
                      <Text style={[styles.dualProgressPercent, { color: '#2563EB' }]}>
                        {data.summary.total_quantity > 0 
                          ? Math.round((data.summary.driver_checked_quantity / data.summary.total_quantity) * 100)
                          : 0}%
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Sort Selector */}
              {renderSortSelector()}
            </>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2563EB']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Package size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Бараа байхгүй байна</Text>
              <Text style={styles.emptySubtext}>Дээш татаж шинэчлэнэ үү</Text>
            </View>
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
  },
  packageHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  packageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  packageTitle: {
    fontSize: 16,
    fontFamily: 'GIP-Bold',
    color: '#1F2937',
  },
  packageInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageDate: {
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
  },
  packageOrderCount: {
    fontSize: 13,
    fontFamily: 'GIP-SemiBold',
    color: '#2563EB',
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryRow: {
    flexDirection: 'row',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: 'GIP-Bold',
    color: '#1F2937',
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  // Dual progress for warehouse & driver
  dualProgressContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  dualProgressItem: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dualProgressItemActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  dualProgressItemDisabled: {
    opacity: 0.5,
  },
  dualProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dualProgressLabel: {
    fontSize: 11,
    fontFamily: 'GIP-SemiBold',
    color: '#6B7280',
  },
  dualProgressLabelActive: {
    color: '#1E40AF',
    fontFamily: 'GIP-Bold',
  },
  dualProgressValue: {
    fontSize: 11,
    fontFamily: 'GIP-Bold',
  },
  dualProgressPercent: {
    fontSize: 10,
    fontFamily: 'GIP-Bold',
    textAlign: 'right',
    marginTop: 2,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressFillWarehouse: {
    backgroundColor: '#e17100',
  },
  progressFillDriver: {
    backgroundColor: '#2563EB',
  },
  // Sort selector styles
  sortContainer: {
    marginHorizontal: 12,
    marginTop: 12,
    zIndex: 100,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  sortButtonText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#374151',
  },
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  sortModalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  sortModalTitle: {
    fontSize: 16,
    fontFamily: 'GIP-Bold',
    color: '#1F2937',
    textAlign: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 4,
  },
  sortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  sortMenuItemActive: {
    backgroundColor: '#EFF6FF',
  },
  sortMenuItemText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'GIP-Medium',
    color: '#4B5563',
  },
  sortMenuItemTextActive: {
    color: '#2563EB',
    fontFamily: 'GIP-SemiBold',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  sectionHeaderSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 8,
    gap: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#1E40AF',
  },
  sectionCountBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionCountText: {
    fontSize: 11,
    fontFamily: 'GIP-SemiBold',
    color: '#1E40AF',
  },
  listContent: {
    paddingBottom: 80,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 6,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productHeader: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'flex-start',
  },
  productImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  productIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  productIndexText: {
    fontSize: 11,
    fontFamily: 'GIP-Bold',
    color: '#FFFFFF',
  },
  productMainInfo: {
    flex: 1,
    marginRight: 8,
  },
  productName: {
    fontSize: 13,
    fontFamily: 'GIP-SemiBold',
    color: '#1F2937',
    lineHeight: 18,
  },
  productDetails: {
    marginTop: 6,
    gap: 3,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailLabel: {
    fontSize: 10,
    fontFamily: 'GIP-Medium',
    color: '#9CA3AF',
  },
  detailValue: {
    fontSize: 10,
    fontFamily: 'GIP-SemiBold',
    color: '#6B7280',
  },
  serialRow: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  serialValue: {
    fontSize: 10,
    fontFamily: 'GIP-Bold',
    color: '#7C3AED',
  },
  productQuantityInfo: {
    alignItems: 'flex-end',
    minWidth: 50,
  },
  quantityLabel: {
    fontSize: 9,
    fontFamily: 'GIP-Regular',
    color: '#9CA3AF',
  },
  quantityValue: {
    fontSize: 16,
    fontFamily: 'GIP-Bold',
    color: '#1F2937',
  },
  checkStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  checkStatusText: {
    fontSize: 10,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
  },
  expandButton: {
    marginLeft: 4,
    padding: 2,
  },
  orderDetailsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    padding: 10,
  },
  orderDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  orderDetailsHeaderText: {
    fontSize: 11,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
  },
  orderDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  orderDetailLeft: {
    flex: 1,
  },
  orderCustomerName: {
    fontSize: 12,
    fontFamily: 'GIP-SemiBold',
    color: '#374151',
  },
  orderCode: {
    fontSize: 10,
    fontFamily: 'GIP-Regular',
    color: '#9CA3AF',
    marginTop: 1,
  },
  orderDetailRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderQuantity: {
    fontSize: 12,
    fontFamily: 'GIP-SemiBold',
    color: '#1F2937',
  },
  // Completed/checked styles
  productCardCompleted: {
    backgroundColor: '#F9FAFB',
    borderColor: '#D1D5DB',
    opacity: 0.8,
  },
  productIndexBadgeCompleted: {
    backgroundColor: '#9CA3AF',
  },
  productIndexTextCompleted: {
    color: '#FFFFFF',
  },
  productNameCompleted: {
    color: '#9CA3AF',
  },
  quantityValueCompleted: {
    color: '#9CA3AF',
  },
  textCompleted: {
    color: '#9CA3AF',
  },
  completedBadge: {
    marginTop: 4,
    padding: 2,
  },
  // Dual check container (Warehouse & Driver)
  dualCheckContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  dualCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  dualCheckItemWarehouse: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  dualCheckItemDriver: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  dualCheckItemWarehouseComplete: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  dualCheckItemDriverComplete: {
    backgroundColor: '#FEF3C7',
    borderColor: '#f59e0b',
  },
  dualCheckItemComplete: {
    backgroundColor: '#FEF3C7',
  },
  dualCheckLabel: {
    fontSize: 9,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
  },
  dualCheckLabelWarehouse: {
    color: '#2563EB',
  },
  dualCheckLabelDriver: {
    color: '#e17100',
  },
  dualCheckValue: {
    fontSize: 10,
    fontFamily: 'GIP-Bold',
    color: '#374151',
  },
  dualCheckValueWarehouse: {
    color: '#1E40AF',
  },
  dualCheckValueDriver: {
    color: '#047857',
  },
  dualCheckValueWarehouseComplete: {
    color: '#1D4ED8',
  },
  dualCheckValueDriverComplete: {
    color: '#e17100',
  },
  dualCheckValueComplete: {
    color: '#e17100',
  },
  // Order detail completed
  orderDetailRowCompleted: {
    backgroundColor: '#F3F4F6',
    opacity: 0.7,
  },
  // Check indicators in order details
  orderCheckIndicators: {
    flexDirection: 'row',
    gap: 6,
    marginRight: 8,
  },
  checkIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  checkIndicatorLabel: {
    fontSize: 9,
    fontFamily: 'GIP-Bold',
    color: '#9CA3AF',
  },
  // Orders count badge
  ordersCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  ordersCountText: {
    fontSize: 9,
    fontFamily: 'GIP-Bold',
    color: '#6B7280',
  },
  // Product check button (larger, on product row)
  productCheckButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginTop: 4,
  },
  productCheckButtonChecked: {
    backgroundColor: '#e17100',
    borderColor: '#e17100',
  },
  productCheckButtonLoading: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  partialCheckIcon: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  partialCheckText: {
    position: 'absolute',
    fontSize: 9,
    fontFamily: 'GIP-Bold',
    color: '#F59E0B',
  },
  // Check button (legacy, for order details if needed)
  checkButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  checkButtonChecked: {
    backgroundColor: '#e17100',
    borderColor: '#e17100',
  },
  checkButtonLoading: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'GIP-SemiBold',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'GIP-Regular',
    color: '#9CA3AF',
    marginTop: 4,
  },
});
