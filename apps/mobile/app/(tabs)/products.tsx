/**
 * БАРАА ТАБ
 * 
 * Footer menu-н Бараа таб
 * - Барааны нэгтгэл мэдээлэл
 * - Агуулах тус бүрийн үлдэгдэл
 * - Хурдан үйлдлүүд
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Package, 
  Boxes, 
  Warehouse as WarehouseIcon,
  ChevronRight,
  Search,
  TrendingUp,
  AlertCircle,
} from 'lucide-react-native';
import { Box, VStack, HStack, Text, Heading } from '../../components/ui';
import { useAuthStore } from '../../stores/auth-store';
import { useWarehouseStore, type Warehouse } from '../../stores/warehouse-store';
import { getProducts, type Product } from '../../services/api';

// Stat Card Component
function StatCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon, 
  color,
  onPress,
}: { 
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  color: string;
  onPress?: () => void;
}) {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container style={styles.statCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.statIconBox, { backgroundColor: color + '15' }]}>
        <Icon size={22} color={color} />
      </View>
      <VStack style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statValue}>{value}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </VStack>
      {onPress && <ChevronRight size={18} color="#D1D5DB" />}
    </Container>
  );
}

// Warehouse Summary Card
function WarehouseSummaryCard({ 
  warehouseName,
  productCount,
  lowStockCount,
  isSelected,
  onPress,
}: {
  warehouseName: string;
  productCount: number;
  lowStockCount: number;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity 
      style={[styles.warehouseCard, isSelected && styles.warehouseCardSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.warehouseIconBox}>
        <WarehouseIcon size={20} color={isSelected ? '#2563EB' : '#6B7280'} />
      </View>
      <VStack style={{ flex: 1, marginLeft: 10 }}>
        <Text style={[styles.warehouseName, isSelected && styles.warehouseNameSelected]} numberOfLines={1}>
          {warehouseName}
        </Text>
        <HStack style={{ gap: 8 }}>
          <Text style={styles.warehouseInfo}>{productCount} бараа</Text>
          {lowStockCount > 0 && (
            <View style={styles.lowStockBadge}>
              <Text style={styles.lowStockText}>{lowStockCount} бага</Text>
            </View>
          )}
        </HStack>
      </VStack>
      {isSelected && (
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedText}>Сонгосон</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ProductsTabScreen() {
  const router = useRouter();
  const { erpDetails } = useAuthStore();
  const { selectedWarehouse, warehouses } = useWarehouseStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Product stats
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    totalCategories: 0,
  });
  
  // Recent products
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);

  // Get required params from erpDetails
  const erpDetail = erpDetails?.[0];
  const defaultWarehouse = erpDetail?.warehouses?.[0];
  const warehouseUuid = selectedWarehouse?.uuid || defaultWarehouse?.uuid;
  const priceTypeId = selectedWarehouse?.priceTypeId || defaultWarehouse?.priceTypeId;
  const routeId = erpDetail?.routeId;

  const fetchProductData = useCallback(async () => {
    if (!warehouseUuid || !routeId || !priceTypeId) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch products
      const result = await getProducts({
        warehouseId: warehouseUuid,
        routeId,
        priceTypeId,
        page: 1,
        pageSize: 50,
      });

      if (result.success && result.data) {
        const products = result.data;
        
        // Calculate stats
        const lowStock = products.filter(p => {
          const stock = p.stock || 0;
          return stock < 10 && stock > 0;
        }).length;
        
        // Unique categories
        const categories = new Set(products.map(p => p.category?.name).filter(Boolean));

        setStats({
          totalProducts: result.totalRecords || products.length,
          lowStockCount: lowStock,
          totalCategories: categories.size,
        });

        // Set recent products (latest 5)
        setRecentProducts(products.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoading(false);
    }
  }, [warehouseUuid, routeId, priceTypeId]);

  useEffect(() => {
    fetchProductData();
  }, [fetchProductData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProductData();
    setRefreshing(false);
  }, [fetchProductData]);

  const formatStock = (product: Product): string => {
    const totalStock = product.stock || 0;
    if (totalStock >= 5000) return '5000+';
    return totalStock.toLocaleString();
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with Search */}
      <View style={styles.headerSection}>
        <TouchableOpacity 
          style={styles.searchBar}
          onPress={() => router.push('/products')}
          activeOpacity={0.8}
        >
          <Search size={20} color="#9CA3AF" />
          <Text style={styles.searchPlaceholder}>Бараа хайх...</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <View style={styles.section}>
        <HStack style={{ alignItems: 'center', marginBottom: 12 }}>
          <Boxes size={20} color="#2563EB" />
          <Text style={styles.sectionTitle}>Барааны мэдээлэл</Text>
        </HStack>
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#2563EB" />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <StatCard
              title="Нийт бараа"
              value={stats.totalProducts}
              icon={Package}
              color="#2563EB"
              onPress={() => router.push('/products')}
            />
            <StatCard
              title="Ангилал"
              value={stats.totalCategories}
              subtitle="Давхцаагүй"
              icon={Boxes}
              color="#8B5CF6"
            />
            <StatCard
              title="Бага үлдэгдэл"
              value={stats.lowStockCount}
              subtitle="10-аас бага"
              icon={AlertCircle}
              color="#F59E0B"
            />
          </View>
        )}
      </View>

      {/* Warehouse Selection */}
      {warehouses.length > 0 && (
        <View style={styles.section}>
          <HStack style={{ alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <HStack style={{ alignItems: 'center' }}>
              <WarehouseIcon size={20} color="#7C3AED" />
              <Text style={styles.sectionTitle}>Агуулах</Text>
            </HStack>
            <TouchableOpacity 
              onPress={() => router.push('/warehouse')}
              style={styles.changeButton}
            >
              <Text style={styles.changeButtonText}>Солих</Text>
            </TouchableOpacity>
          </HStack>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.warehouseScroll}
          >
            {warehouses.slice(0, 3).map((warehouse) => (
              <WarehouseSummaryCard
                key={warehouse.uuid}
                warehouseName={warehouse.name}
                productCount={stats.totalProducts}
                lowStockCount={stats.lowStockCount}
                isSelected={selectedWarehouse?.uuid === warehouse.uuid}
                onPress={() => router.push('/warehouse')}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recent Products */}
      <View style={styles.section}>
        <HStack style={{ alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <HStack style={{ alignItems: 'center' }}>
            <TrendingUp size={20} color="#f59e0b" />
            <Text style={styles.sectionTitle}>Сүүлийн бараа</Text>
          </HStack>
          <TouchableOpacity 
            onPress={() => router.push('/products')}
            style={styles.viewAllButton}
          >
            <Text style={styles.viewAllText}>Бүгдийг харах</Text>
            <ChevronRight size={16} color="#2563EB" />
          </TouchableOpacity>
        </HStack>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#2563EB" />
          </View>
        ) : recentProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Package size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>Бараа олдсонгүй</Text>
          </View>
        ) : (
          <VStack style={{ gap: 8 }}>
            {recentProducts.map((product, index) => (
              <TouchableOpacity 
                key={product.uuid || index} 
                style={styles.productItem}
                onPress={() => router.push('/products')}
                activeOpacity={0.7}
              >
                <View style={styles.productImage}>
                  {product.image ? (
                    <View style={styles.productImagePlaceholder}>
                      <Package size={20} color="#9CA3AF" />
                    </View>
                  ) : (
                    <View style={styles.productImagePlaceholder}>
                      <Package size={20} color="#9CA3AF" />
                    </View>
                  )}
                </View>
                <VStack style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.productName} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <HStack style={{ alignItems: 'center', gap: 8 }}>
                    <Text style={styles.productPrice}>
                      ₮{product.price?.toLocaleString() || 0}
                    </Text>
                    <View style={styles.stockBadge}>
                      <Text style={styles.stockText}>
                        Үлдэгдэл: {formatStock(product)}
                      </Text>
                    </View>
                  </HStack>
                </VStack>
                <ChevronRight size={18} color="#D1D5DB" />
              </TouchableOpacity>
            ))}
          </VStack>
        )}
      </View>

      {/* Browse Products Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity 
          style={styles.browseButton}
          onPress={() => router.push('/products')}
          activeOpacity={0.8}
        >
          <Boxes size={22} color="#FFFFFF" />
          <Text style={styles.browseButtonText}>Бараа үзэх</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  // Header
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  searchPlaceholder: {
    fontSize: 15,
    fontFamily: 'GIP-Regular',
    color: '#9CA3AF',
  },
  // Section
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
    marginLeft: 8,
  },
  // Stats
  statsGrid: {
    gap: 10,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTitle: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'GIP-Bold',
    color: '#111827',
  },
  statSubtitle: {
    fontSize: 11,
    fontFamily: 'GIP-Regular',
    color: '#9CA3AF',
  },
  // Warehouse
  warehouseScroll: {
    gap: 10,
  },
  warehouseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 200,
  },
  warehouseCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  warehouseIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warehouseName: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
  },
  warehouseNameSelected: {
    color: '#2563EB',
  },
  warehouseInfo: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  lowStockBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lowStockText: {
    fontSize: 10,
    fontFamily: 'GIP-Medium',
    color: '#92400E',
  },
  selectedBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  selectedText: {
    fontSize: 11,
    fontFamily: 'GIP-Medium',
    color: '#2563EB',
  },
  changeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EDE9FE',
    borderRadius: 8,
  },
  changeButtonText: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#7C3AED',
  },
  // Products List
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#2563EB',
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
  },
  productImagePlaceholder: {
    width: 48,
    height: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 13,
    fontFamily: 'GIP-Bold',
    color: '#e17100',
  },
  stockBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 11,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
  },
  // Empty & Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'GIP-Regular',
    color: '#9CA3AF',
    marginTop: 8,
  },
  // Bottom
  bottomSection: {
    padding: 16,
    paddingBottom: 32,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 10,
  },
  browseButtonText: {
    fontSize: 16,
    fontFamily: 'GIP-SemiBold',
    color: '#FFFFFF',
  },
});
