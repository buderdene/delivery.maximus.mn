/**
 * ТҮГЭЭЛТИЙН ЗАХИАЛГУУД ДЭЛГЭЦ
 * 
 * Багцын хүргэх захиалгуудыг харуулах
 * - Зай (км) болон What3Words харуулна
 * - Маршрут оновчлох
 * - Захиалга дээр дарахад delivery detail руу шилжнэ
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';

// Status counts interface
interface StatusCounts {
  loaded?: number;
  in_progress?: number;
  delivered?: number;
  failed?: number;
  [key: string]: number | undefined;
}
import { 
  Truck, 
  Package, 
  ChevronRight, 
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  MapPin,
  Phone,
  Navigation,
  Grid3X3,
  Route,
  Map,
  Timer,
  Lock,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { useAuthStore } from '../../../stores/delivery-auth-store';
import { getPackageOrders, DeliveryOrder, PackageOrdersData, optimizeRoute } from '../../../services/delivery-api';

type FilterStatus = 'all' | 'loaded' | 'in_progress' | 'delivered' | 'failed';

export default function PackageDeliveryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { worker } = useAuthStore();
  
  const [data, setData] = useState<PackageOrdersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [optimizing, setOptimizing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Get user's current location
  const getCurrentLocation = useCallback(async (): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission not granted');
        Alert.alert('Байршил', 'Байршлын зөвшөөрөл өгөөгүй байна. Тохиргооноос зөвшөөрнө үү.');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 10,
      });
      
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      console.log('Location obtained:', coords.latitude, coords.longitude);
      setUserLocation(coords);
      return coords;
    } catch (error) {
      console.log('Error getting location:', error);
      // Fallback to last known location
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) {
          const coords = {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          };
          console.log('Using last known location:', coords.latitude, coords.longitude);
          setUserLocation(coords);
          return coords;
        }
      } catch (e) {
        console.log('No last known location');
      }
      return null;
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!id) return;
    
    try {
      // Get current location for distance calculation
      const location = await getCurrentLocation();
      
      const result = await getPackageOrders({
        packageId: parseInt(id),
        workerId: worker?.id,
        startLatitude: location?.latitude,
        startLongitude: location?.longitude,
      });
      
      if (result.success && result.data) {
        setData(result.data);
      } else {
        Alert.alert('Алдаа', result.message || 'Захиалга татахад алдаа гарлаа');
      }
    } catch (error) {
      Alert.alert('Алдаа', 'Сүлжээний алдаа гарлаа');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, worker?.id, getCurrentLocation]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  // Optimize route based on coordinates from current location
  const handleOptimizeRoute = async () => {
    if (!id) return;
    
    Alert.alert(
      'Маршрут оновчлох',
      'Таны одоогийн байршлаас захиалгуудын дарааллыг оновчлох уу?',
      [
        { text: 'Үгүй', style: 'cancel' },
        {
          text: 'Тийм',
          onPress: async () => {
            setOptimizing(true);
            try {
              // Get current location for starting point
              const location = await getCurrentLocation();
              
              const result = await optimizeRoute({
                packageId: parseInt(id),
                startLatitude: location?.latitude,
                startLongitude: location?.longitude,
              });
              
              if (result.success && result.data) {
                Alert.alert(
                  'Амжилттай',
                  `${result.data.total_orders} захиалга оновчлогдлоо.\n` +
                  `Координаттай: ${result.data.orders_with_coords}\n` +
                  `Координатгүй: ${result.data.orders_without_coords}`,
                  [{ text: 'OK', onPress: fetchOrders }]
                );
              } else {
                Alert.alert('Алдаа', result.message || 'Маршрут оновчлоход алдаа гарлаа');
              }
            } catch (error) {
              Alert.alert('Алдаа', 'Сүлжээний алдаа гарлаа');
            } finally {
              setOptimizing(false);
            }
          },
        },
      ]
    );
  };

  // Open in maps app
  const openInMaps = (order: DeliveryOrder) => {
    const lat = order.customer?.latitude;
    const lng = order.customer?.longitude;
    
    if (!lat || !lng) {
      Alert.alert('Байршил', 'Энэ захиалгын координат байхгүй байна.');
      return;
    }
    
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    Linking.openURL(url);
  };

  const filteredOrders = data?.orders?.filter((order) => {
    if (!order) return false;
    if (filterStatus === 'all') return true;
    return order.delivery_status === filterStatus;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'loaded': return '#8B5CF6';
      case 'in_progress': return '#3B82F6';
      case 'delivered': return '#f59e0b';
      case 'failed': return '#EF4444';
      case 'returned': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'assigned_to_driver': return 'Оноогдсон';
      case 'driver_checking': return 'Тулгаж байна';
      case 'loaded': return 'Ачигдсан';
      case 'in_progress': return 'Хүргэж байна';
      case 'delivered': return 'Хүргэгдсэн';
      case 'failed': return 'Амжилтгүй';
      case 'returned': return 'Буцаагдсан';
      default: return status || 'Хүлээгдэж буй';
    }
  };

  const getStatusIcon = (status: string) => {
    const color = getStatusColor(status);
    switch (status) {
      case 'loaded': return <Package size={16} color={color} />;
      case 'in_progress': return <Truck size={16} color={color} />;
      case 'delivered': return <CheckCircle2 size={16} color={color} />;
      case 'failed': return <XCircle size={16} color={color} />;
      default: return <Clock size={16} color={color} />;
    }
  };

  const renderOrderItem = ({ item: order, index }: { item: DeliveryOrder; index: number }) => {
    // Safety check for null/undefined order
    if (!order) {
      return null;
    }
    
    // Check if order is locked (delivered with confirmed eBarimt)
    const isLocked = order.delivery_status === 'delivered' && order.ebarimt_status === 'SUCCESS';
    
    const handlePress = () => {
      if (isLocked) {
        Alert.alert(
          'Баталгаажсан',
          'И-Баримт баталгаажсан захиалгыг засах боломжгүй.',
          [{ text: 'OK' }]
        );
        return;
      }
      router.push(`/order/${order.uuid}/shop` as any);
    };
    
    return (
      <TouchableOpacity
        style={[styles.orderCard, isLocked && styles.orderCardLocked]}
        onPress={handlePress}
        activeOpacity={isLocked ? 1 : 0.7}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderCodeContainer}>
            <View style={styles.sortBadge}>
              <Text style={styles.sortText}>#{order.sort_order || index + 1}</Text>
            </View>
            <Text style={styles.orderCode}>{order.order_code}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(order.delivery_status)}15` }]}>
            {getStatusIcon(order.delivery_status)}
            <Text style={[styles.statusText, { color: getStatusColor(order.delivery_status) }]}>
              {getStatusLabel(order.delivery_status)}
            </Text>
          </View>
        </View>

        <View style={styles.customerSection}>
          <Text style={styles.customerName} numberOfLines={1}>
            {order.customer?.name || 'Хэрэглэгч'}
          </Text>
          
          {order.customer?.address && (
            <View style={styles.infoRow}>
              <MapPin size={14} color="#6B7280" />
              <Text style={styles.infoText} numberOfLines={2}>
                {order.customer.address}
              </Text>
            </View>
          )}
          
          {order.customer?.phone && (
            <View style={styles.infoRow}>
              <Phone size={14} color="#6B7280" />
              <Text style={styles.infoText}>{order.customer.phone}</Text>
            </View>
          )}
          
          {/* Distance and What3Words */}
          <View style={styles.locationInfoRow}>
            {order.distance_km !== null && order.distance_km !== undefined && (
              <TouchableOpacity 
                style={styles.distanceBadge}
                onPress={() => openInMaps(order)}
                activeOpacity={0.7}
              >
                <Navigation size={12} color="#2563EB" />
                <Text style={styles.distanceText}>{order.distance_km.toFixed(1)} км</Text>
              </TouchableOpacity>
            )}
            {order.customer?.what3words && (
              <View style={styles.w3wBadge}>
                <Grid3X3 size={12} color="#E11D48" />
                <Text style={styles.w3wText}>{order.customer.what3words}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.orderFooter}>
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Нийт:</Text>
            <Text style={styles.amountValue}>{order.total_amount_formatted || '0₮'}</Text>
          </View>
          
          {/* Delivery duration for delivered orders */}
          {order.delivery_status === 'delivered' && order.delivery_duration_minutes && (
            <View style={styles.durationBadge}>
              <Timer size={12} color="#e17100" />
              <Text style={styles.durationText}>
                {order.delivery_duration_minutes < 60 
                  ? `${order.delivery_duration_minutes} мин`
                  : `${Math.floor(order.delivery_duration_minutes / 60)}ц ${order.delivery_duration_minutes % 60}м`
                }
              </Text>
            </View>
          )}
          
          {isLocked ? (
            <Lock size={20} color="#f59e0b" />
          ) : (
            <ChevronRight size={20} color="#9CA3AF" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const FilterButton = ({ status, label, count }: { status: FilterStatus; label: string; count?: number }) => (
    <TouchableOpacity
      style={[styles.filterButton, filterStatus === status && styles.filterButtonActive]}
      onPress={() => setFilterStatus(status)}
    >
      <Text style={[styles.filterButtonText, filterStatus === status && styles.filterButtonTextActive]}>
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <View style={[styles.filterBadge, filterStatus === status && styles.filterBadgeActive]}>
          <Text style={[styles.filterBadgeText, filterStatus === status && styles.filterBadgeTextActive]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e17100" />
        <Text style={styles.loadingText}>Захиалгууд уншиж байна...</Text>
      </View>
    );
  }

  const statusCounts: StatusCounts = data?.status_counts || {};

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: data?.package?.name || 'Түгээлт',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#111827" />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Package Summary Header */}
      <View style={styles.summaryHeader}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Package size={20} color="#e17100" />
            <Text style={styles.summaryValue}>{data?.total_count || 0}</Text>
            <Text style={styles.summaryLabel}>Нийт</Text>
          </View>
          <View style={styles.summaryItem}>
            <CheckCircle2 size={20} color="#f59e0b" />
            <Text style={styles.summaryValue}>{statusCounts.delivered || 0}</Text>
            <Text style={styles.summaryLabel}>Хүргэсэн</Text>
          </View>
          <View style={styles.summaryItem}>
            <Clock size={20} color="#F59E0B" />
            <Text style={styles.summaryValue}>{(data?.total_count || 0) - (statusCounts.delivered || 0) - (statusCounts.failed || 0)}</Text>
            <Text style={styles.summaryLabel}>Үлдсэн</Text>
          </View>
          <View style={styles.summaryItem}>
            <XCircle size={20} color="#EF4444" />
            <Text style={styles.summaryValue}>{statusCounts.failed || 0}</Text>
            <Text style={styles.summaryLabel}>Амжилтгүй</Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { status: 'all' as FilterStatus, label: 'Бүгд', count: data?.total_count },
            { status: 'loaded' as FilterStatus, label: 'Ачигдсан', count: statusCounts.loaded },
            { status: 'in_progress' as FilterStatus, label: 'Хүргэж буй', count: statusCounts.in_progress },
            { status: 'delivered' as FilterStatus, label: 'Хүргэсэн', count: statusCounts.delivered },
            { status: 'failed' as FilterStatus, label: 'Амжилтгүй', count: statusCounts.failed },
          ]}
          renderItem={({ item }) => (
            <FilterButton status={item.status} label={item.label} count={item.count} />
          )}
          keyExtractor={(item) => item.status}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.uuid}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#e17100']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <CheckCircle2 size={64} color="#f59e0b" />
            <Text style={styles.emptyText}>Захиалга байхгүй</Text>
            <Text style={styles.emptySubtext}>Энэ шүүлтүүрээр захиалга олдсонгүй</Text>
          </View>
        }
      />
    </View>
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
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  summaryHeader: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: 'GIP-Bold',
    color: '#111827',
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  optimizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e17100',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  optimizeButtonText: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#FFFFFF',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#e17100',
  },
  filterButtonText: {
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  filterBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterBadgeText: {
    fontSize: 11,
    fontFamily: 'GIP-SemiBold',
    color: '#6B7280',
  },
  filterBadgeTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  orderCardLocked: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    opacity: 0.9,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortBadge: {
    backgroundColor: '#e17100',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sortText: {
    fontSize: 12,
    fontFamily: 'GIP-Bold',
    color: '#FFFFFF',
  },
  orderCode: {
    fontSize: 15,
    fontFamily: 'GIP-SemiBold',
    color: '#1F2937',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'GIP-SemiBold',
  },
  customerSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  customerName: {
    fontSize: 15,
    fontFamily: 'GIP-SemiBold',
    color: '#1F2937',
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    lineHeight: 18,
  },
  locationInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    fontFamily: 'GIP-SemiBold',
    color: '#2563EB',
  },
  w3wBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  w3wText: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#E11D48',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  amountLabel: {
    fontSize: 13,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  amountValue: {
    fontSize: 15,
    fontFamily: 'GIP-Bold',
    color: '#1F2937',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  durationText: {
    fontSize: 11,
    fontFamily: 'GIP-SemiBold',
    color: '#e17100',
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
