/**
 * МАШИНЫ ДЭЛГЭРЭНГҮЙ (Car Detail Screen)
 *
 * Тухайн ажилтанд хуваарилагдсан хүргэлтийн
 * машины бүрэн мэдээлэл:
 * - Улсын дугаар, брэнд, загвар, он, өнгө
 * - Багтаамж (м³), түлшний төрөл
 * - Төлөв (Идэвхтэй / Ашиглагдаж буй / Засварт)
 * - Тогтмол жолооч & хүргэгч
 * - Хуваарилагдсан бүсүүд
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
// @ts-ignore
import { router } from 'expo-router';
import {
  Car,
  Fuel,
  Palette,
  CalendarDays,
  Gauge,
  MapPin,
  User,
  Phone,
  Shield,
  ChevronLeft,
  Package,
  Truck,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react-native';
import { useAuthStore, type CarDetail as StoredCarDetail } from '../../stores/delivery-auth-store';
import { getCarDetail, CarDetail } from '../../services/delivery-api';

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  active: { bg: '#D1FAE5', text: '#059669', icon: CheckCircle2 },
  in_use: { bg: '#DBEAFE', text: '#2563EB', icon: Truck },
  maintenance: { bg: '#FEF3C7', text: '#D97706', icon: AlertTriangle },
};

/** Convert stored car detail to API CarDetail format */
function storedToCarDetail(stored: StoredCarDetail, coworkersCount: number): CarDetail {
  return {
    ...stored,
    driver: null,
    deliverer: null,
    workers_count: coworkersCount,
  };
}

export default function CarDetailScreen() {
  const { deliveryInfo } = useAuthStore();
  const [car, setCar] = useState<CarDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await getCarDetail();

      if (result.success && result.data) {
        setCar(result.data);
      } else if (deliveryInfo?.car) {
        // Fallback: use stored delivery info from login
        setCar(storedToCarDetail(deliveryInfo.car, deliveryInfo.coworkers?.length || 0));
      } else {
        setError(result.message || 'Алдаа гарлаа');
      }
    } catch {
      // On network error, try stored data
      if (deliveryInfo?.car) {
        setCar(storedToCarDetail(deliveryInfo.car, deliveryInfo.coworkers?.length || 0));
      } else {
        setError('Сүлжээний алдаа');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [deliveryInfo]);

  useEffect(() => {
    // If we have stored data, show immediately while fetching
    if (deliveryInfo?.car) {
      setCar(storedToCarDetail(deliveryInfo.car, deliveryInfo.coworkers?.length || 0));
      setLoading(false);
    }
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCall = (phone: string | null) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Уншиж байна...</Text>
      </View>
    );
  }

  if (!car) {
    return (
      <View style={styles.emptyContainer}>
        <Car size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>Машин хуваарилагдаагүй</Text>
        <Text style={styles.emptyDescription}>
          {error || 'Танд одоогоор хүргэлтийн машин хуваарилагдаагүй байна'}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={18} color="#2563EB" />
          <Text style={styles.backButtonText}>Буцах</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusStyle = STATUS_STYLES[car.status] || STATUS_STYLES.active;
  const StatusIcon = statusStyle.icon;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
      }
    >
      {/* Car Hero Section */}
      <View style={styles.heroCard}>
        {car.image_url ? (
          <Image source={{ uri: car.image_url }} style={styles.carImage} resizeMode="cover" />
        ) : (
          <View style={styles.carImagePlaceholder}>
            <Car size={56} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.heroInfo}>
          <Text style={styles.carPlate}>{car.plate}</Text>
          <Text style={styles.carName}>{car.brand} {car.model}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <StatusIcon size={14} color={statusStyle.text} />
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {car.status_label}
            </Text>
          </View>
        </View>
      </View>

      {/* Specifications */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Техникийн мэдээлэл</Text>

        <View style={styles.specGrid}>
          <View style={styles.specItem}>
            <View style={[styles.specIcon, { backgroundColor: '#EFF6FF' }]}>
              <Car size={20} color="#2563EB" />
            </View>
            <Text style={styles.specLabel}>Брэнд</Text>
            <Text style={styles.specValue}>{car.brand}</Text>
          </View>

          <View style={styles.specItem}>
            <View style={[styles.specIcon, { backgroundColor: '#F0FDF4' }]}>
              <Package size={20} color="#16A34A" />
            </View>
            <Text style={styles.specLabel}>Загвар</Text>
            <Text style={styles.specValue}>{car.model}</Text>
          </View>

          {car.year && (
            <View style={styles.specItem}>
              <View style={[styles.specIcon, { backgroundColor: '#FEF3C7' }]}>
                <CalendarDays size={20} color="#D97706" />
              </View>
              <Text style={styles.specLabel}>Он</Text>
              <Text style={styles.specValue}>{car.year}</Text>
            </View>
          )}

          {car.color && (
            <View style={styles.specItem}>
              <View style={[styles.specIcon, { backgroundColor: '#FAE8FF' }]}>
                <Palette size={20} color="#A855F7" />
              </View>
              <Text style={styles.specLabel}>Өнгө</Text>
              <Text style={styles.specValue}>{car.color}</Text>
            </View>
          )}

          <View style={styles.specItem}>
            <View style={[styles.specIcon, { backgroundColor: '#FFF7ED' }]}>
              <Gauge size={20} color="#EA580C" />
            </View>
            <Text style={styles.specLabel}>Багтаамж</Text>
            <Text style={styles.specValue}>{car.max_cbm} м³</Text>
          </View>

          {car.fuel_type && (
            <View style={styles.specItem}>
              <View style={[styles.specIcon, { backgroundColor: '#FEE2E2' }]}>
                <Fuel size={20} color="#DC2626" />
              </View>
              <Text style={styles.specLabel}>Түлш</Text>
              <Text style={styles.specValue}>{car.fuel_type}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Assigned Workers */}
      {(car.driver || car.deliverer) && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Тогтмол ажилтнууд</Text>

          {car.driver && (
            <View style={styles.workerRow}>
              <View style={styles.workerAvatar}>
                {car.driver.avatar ? (
                  <Image source={{ uri: car.driver.avatar }} style={styles.workerAvatarImage} />
                ) : (
                  <User size={20} color="#2563EB" />
                )}
              </View>
              <View style={styles.workerDetails}>
                <Text style={styles.workerName}>{car.driver.name}</Text>
                <View style={styles.workerRoleBadge}>
                  <Shield size={12} color="#2563EB" />
                  <Text style={styles.workerRole}>Жолооч</Text>
                </View>
              </View>
              {car.driver.phone && (
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => handleCall(car.driver?.phone ?? null)}
                >
                  <Phone size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {car.deliverer && (
            <View style={[styles.workerRow, car.driver ? styles.workerRowBorder : undefined]}>
              <View style={[styles.workerAvatar, { backgroundColor: '#F0FDF4' }]}>
                {car.deliverer.avatar ? (
                  <Image source={{ uri: car.deliverer.avatar }} style={styles.workerAvatarImage} />
                ) : (
                  <User size={20} color="#16A34A" />
                )}
              </View>
              <View style={styles.workerDetails}>
                <Text style={styles.workerName}>{car.deliverer.name}</Text>
                <View style={[styles.workerRoleBadge, { backgroundColor: '#F0FDF4' }]}>
                  <Package size={12} color="#16A34A" />
                  <Text style={[styles.workerRole, { color: '#16A34A' }]}>Бараа түгээгч</Text>
                </View>
              </View>
              {car.deliverer.phone && (
                <TouchableOpacity
                  style={[styles.callButton, { backgroundColor: '#16A34A' }]}
                  onPress={() => handleCall(car.deliverer?.phone ?? null)}
                >
                  <Phone size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {/* Delivery Zones */}
      {car.zones && car.zones.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Хуваарилагдсан бүсүүд</Text>
          <View style={styles.zoneList}>
            {car.zones.map((zone) => (
              <View key={zone.id} style={styles.zoneChip}>
                <MapPin size={14} color="#6366F1" />
                <Text style={styles.zoneText}>{zone.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/coworkers' as any)}
        >
          <User size={20} color="#2563EB" />
          <Text style={styles.actionText}>Хамтрагчид ({car.workers_count})</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'GIP-Bold',
    color: '#374151',
    marginTop: 20,
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    gap: 6,
  },
  backButtonText: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#2563EB',
  },

  // Hero Card
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  carImage: {
    width: '100%',
    height: 200,
  },
  carImagePlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInfo: {
    padding: 16,
  },
  carPlate: {
    fontSize: 24,
    fontFamily: 'GIP-Bold',
    color: '#1F2937',
    letterSpacing: 2,
  },
  carName: {
    fontSize: 16,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 10,
  },
  statusText: {
    fontSize: 13,
    fontFamily: 'GIP-SemiBold',
  },

  // Section Card
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'GIP-SemiBold',
    color: '#1F2937',
    marginBottom: 16,
  },

  // Spec Grid
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  specItem: {
    width: '47%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  specIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  specLabel: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#9CA3AF',
    marginBottom: 2,
  },
  specValue: {
    fontSize: 15,
    fontFamily: 'GIP-SemiBold',
    color: '#1F2937',
  },

  // Workers
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  workerRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  workerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  workerAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  workerDetails: {
    flex: 1,
    marginLeft: 12,
  },
  workerName: {
    fontSize: 15,
    fontFamily: 'GIP-SemiBold',
    color: '#1F2937',
  },
  workerRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  workerRole: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#2563EB',
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Zones
  zoneList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  zoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  zoneText: {
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#4F46E5',
  },

  // Actions
  actionsRow: {
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionText: {
    fontSize: 15,
    fontFamily: 'GIP-SemiBold',
    color: '#2563EB',
  },
});
