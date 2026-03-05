/**
 * ХАМТ АЖИЛЛАХ АЖИЛЧИД (Coworkers Screen)
 *
 * Тухайн ажилтантай ижил машинд хуваарилагдсан
 * бусад ажилчдын жагсаалт:
 * - Нэр, утас, дүр зураг
 * - Ажлын төрөл (Жолооч / Бараа түгээгч / Туслах)
 * - Идэвхтэй төлөв
 * - Утсаар залгах боломж
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
  User,
  Users,
  Phone,
  Car,
  Shield,
  Package,
  HandMetal,
  ChevronLeft,
  Circle,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/delivery-auth-store';
import { getCoworkers, CoworkersData, CoworkerInfo } from '../../services/delivery-api';

const WORKER_TYPE_CONFIG: Record<string, { color: string; bg: string; icon: typeof Shield; label: string }> = {
  driver: { color: '#2563EB', bg: '#EFF6FF', icon: Shield, label: 'Жолооч' },
  deliverer: { color: '#16A34A', bg: '#F0FDF4', icon: Package, label: 'Бараа түгээгч' },
  helper: { color: '#D97706', bg: '#FEF3C7', icon: HandMetal, label: 'Туслах ажилтан' },
  other: { color: '#6B7280', bg: '#F3F4F6', icon: User, label: 'Бусад' },
};

function CoworkerCard({ coworker }: { coworker: CoworkerInfo }) {
  const typeConfig = WORKER_TYPE_CONFIG[coworker.worker_type || 'other'] || WORKER_TYPE_CONFIG.other;
  const TypeIcon = typeConfig.icon;

  const handleCall = () => {
    if (coworker.phone) {
      Linking.openURL(`tel:${coworker.phone}`);
    }
  };

  return (
    <View style={styles.coworkerCard}>
      <View style={styles.cardHeader}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: typeConfig.bg }]}>
          {coworker.avatar ? (
            <Image source={{ uri: coworker.avatar }} style={styles.avatarImage} />
          ) : (
            <User size={24} color={typeConfig.color} />
          )}
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.coworkerName}>{coworker.name}</Text>
          <View style={[styles.typeBadge, { backgroundColor: typeConfig.bg }]}>
            <TypeIcon size={12} color={typeConfig.color} />
            <Text style={[styles.typeText, { color: typeConfig.color }]}>
              {coworker.worker_type_label || typeConfig.label}
            </Text>
          </View>
        </View>

        {/* Availability dot */}
        <View style={styles.statusDot}>
          <Circle
            size={10}
            color={coworker.is_available ? '#16A34A' : '#D1D5DB'}
            fill={coworker.is_available ? '#16A34A' : '#D1D5DB'}
          />
        </View>
      </View>

      {/* Contact Row */}
      <View style={styles.contactRow}>
        {coworker.phone ? (
          <TouchableOpacity style={styles.phoneButton} onPress={handleCall}>
            <Phone size={16} color="#FFFFFF" />
            <Text style={styles.phoneText}>{coworker.phone}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.noPhone}>
            <Phone size={14} color="#D1D5DB" />
            <Text style={styles.noPhoneText}>Утас бүртгэгдээгүй</Text>
          </View>
        )}

        {coworker.license_number && (
          <View style={styles.licenseBadge}>
            <Shield size={12} color="#6366F1" />
            <Text style={styles.licenseText}>{coworker.license_number}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function CoworkersScreen() {
  const { deliveryInfo } = useAuthStore();
  const [data, setData] = useState<CoworkersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Build CoworkersData from stored delivery info */
  const getStoredData = useCallback((): CoworkersData | null => {
    if (!deliveryInfo) return null;
    return {
      car: deliveryInfo.car ? {
        id: deliveryInfo.car.id,
        plate: deliveryInfo.car.plate,
        brand: deliveryInfo.car.brand,
        model: deliveryInfo.car.model,
      } : null,
      coworkers: deliveryInfo.coworkers || [],
      total: deliveryInfo.coworkers?.length || 0,
    };
  }, [deliveryInfo]);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await getCoworkers();

      if (result.success && result.data) {
        setData(result.data);
      } else {
        // Fallback to stored delivery info
        const stored = getStoredData();
        if (stored) {
          setData(stored);
        } else {
          setError(result.message || 'Алдаа гарлаа');
        }
      }
    } catch {
      const stored = getStoredData();
      if (stored) {
        setData(stored);
      } else {
        setError('Сүлжээний алдаа');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getStoredData]);

  useEffect(() => {
    // Show stored data immediately while fetching
    const stored = getStoredData();
    if (stored) {
      setData(stored);
      setLoading(false);
    }
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Уншиж байна...</Text>
      </View>
    );
  }

  if (!data || (!data.car && data.coworkers.length === 0)) {
    return (
      <View style={styles.emptyContainer}>
        <Users size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>Хамтрагч олдсонгүй</Text>
        <Text style={styles.emptyDescription}>
          {error || 'Машин хуваарилагдаагүй эсвэл хамт ажиллах ажилтан байхгүй байна'}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={18} color="#2563EB" />
          <Text style={styles.backButtonText}>Буцах</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
      }
    >
      {/* Car Info Header */}
      {data.car && (
        <TouchableOpacity
          style={styles.carHeader}
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/car' as any)}
        >
          <View style={styles.carIcon}>
            <Car size={24} color="#2563EB" />
          </View>
          <View style={styles.carHeaderInfo}>
            <Text style={styles.carHeaderPlate}>{data.car.plate}</Text>
            <Text style={styles.carHeaderName}>
              {data.car.brand} {data.car.model}
            </Text>
          </View>
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>{data.total} хамтрагч</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Coworkers List */}
      {data.coworkers.length > 0 ? (
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Хамт ажиллах ажилчид</Text>
          {data.coworkers.map((coworker) => (
            <CoworkerCard key={coworker.id} coworker={coworker} />
          ))}
        </View>
      ) : (
        <View style={styles.emptyListCard}>
          <Users size={32} color="#D1D5DB" />
          <Text style={styles.emptyListText}>
            Энэ машинд бусад ажилтан хуваарилагдаагүй байна
          </Text>
        </View>
      )}
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

  // Car Header
  carHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  carIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  carHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  carHeaderPlate: {
    fontSize: 16,
    fontFamily: 'GIP-Bold',
    color: '#1F2937',
    letterSpacing: 1,
  },
  carHeaderName: {
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
    marginTop: 2,
  },
  totalBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  totalBadgeText: {
    fontSize: 12,
    fontFamily: 'GIP-SemiBold',
    color: '#2563EB',
  },

  // List
  listSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'GIP-SemiBold',
    color: '#1F2937',
    marginBottom: 12,
  },

  // Coworker Card
  coworkerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  coworkerName: {
    fontSize: 16,
    fontFamily: 'GIP-SemiBold',
    color: '#1F2937',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  typeText: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
  },
  statusDot: {
    marginLeft: 8,
  },

  // Contact Row
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    flex: 1,
  },
  phoneText: {
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#FFFFFF',
  },
  noPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  noPhoneText: {
    fontSize: 13,
    fontFamily: 'GIP-Regular',
    color: '#D1D5DB',
  },
  licenseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  licenseText: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#6366F1',
  },

  // Empty list card
  emptyListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 14,
    fontFamily: 'GIP-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
});
