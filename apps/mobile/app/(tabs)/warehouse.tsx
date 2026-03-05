/**
 * АГУУЛАХ ТУЛГАЛТ ДЭЛГЭЦ
 *
 * Тулгалт хүлээж буй багцуудын жагсаалт
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
// @ts-ignore - expo-router exports router in v6
import { router } from 'expo-router';
import { Package, Calendar, ChevronRight, Box, CheckCircle2, Clock, Warehouse, ClipboardList } from 'lucide-react-native';
import { useAuthStore } from '../../stores/delivery-auth-store';
import { getWorkerPackages, PackageListItem } from '../../services/delivery-api';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 85 : 65;

export default function WarehouseScreen() {
  const { worker } = useAuthStore();

  const [packages, setPackages] = useState<PackageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPackages = useCallback(async () => {
    try {
      console.log('Warehouse: Fetching packages, worker_id:', worker?.id);
      const result = await getWorkerPackages(worker?.id);
      console.log('Warehouse: API result:', JSON.stringify(result).substring(0, 500));

      if (result.success && result.data) {
        const warehousePackages = result.data.packages.filter(
          (pkg) => pkg.warehouse_pending > 0,
        );
        console.log('Warehouse: Filtered packages count:', warehousePackages.length);
        setPackages(warehousePackages);
      } else {
        console.log('Warehouse: API failed:', result.message, 'success:', result.success);
        Alert.alert('Алдаа', result.message || 'Багц татахад алдаа гарлаа');
      }
    } catch (error) {
      console.error('Warehouse: Fetch error:', error);
      Alert.alert('Алдаа', 'Сүлжээний алдаа гарлаа');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [worker?.id]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPackages();
  };

  // Summary stats across all packages
  const summary = useMemo(() => {
    const totalOrders = packages.reduce((s, p) => s + p.total_orders, 0);
    const totalPending = packages.reduce((s, p) => s + p.warehouse_pending, 0);
    const totalChecked = totalOrders - totalPending;
    return { totalOrders, totalPending, totalChecked };
  }, [packages]);

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('mn-MN') + '₮';
  };

  const renderPackageItem = ({ item }: { item: PackageListItem }) => {
    const today = new Date().toISOString().split('T')[0];
    const isToday = item.delivery_date === today;
    const checked = item.total_orders - item.warehouse_pending;
    const progress = item.total_orders > 0 ? checked / item.total_orders : 0;

    return (
      <TouchableOpacity
        style={[styles.card, isToday && styles.cardToday]}
        onPress={() => router.push(`/package/${item.id}` as any)}
        activeOpacity={0.7}
      >
        {/* Row 1: Title + Badge + Arrow */}
        <View style={styles.cardTop}>
          <View style={styles.cardIconWrap}>
            <Package size={18} color="#F59E0B" />
          </View>
          <View style={styles.cardTitleGroup}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              Багц #{item.id}
            </Text>
            <View style={styles.cardDateRow}>
              <Calendar size={12} color="#9CA3AF" />
              <Text style={styles.cardDate}>{item.delivery_date}</Text>
              {isToday && (
                <View style={styles.todayChip}>
                  <Text style={styles.todayChipText}>Өнөөдөр</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.pendingChip}>
            <Text style={styles.pendingChipText}>Тулгах</Text>
          </View>
          <ChevronRight size={18} color="#D1D5DB" />
        </View>

        {/* Row 2: Progress bar */}
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {checked}/{item.total_orders}
          </Text>
        </View>

        {/* Row 3: Stats */}
        <View style={styles.cardStats}>
          <View style={styles.cardStat}>
            <Box size={15} color="#3B82F6" />
            <Text style={styles.cardStatValue}>{item.total_orders}</Text>
            <Text style={styles.cardStatLabel}>Нийт</Text>
          </View>
          <View style={styles.cardStatDivider} />
          <View style={styles.cardStat}>
            <Clock size={15} color="#F59E0B" />
            <Text style={[styles.cardStatValue, { color: '#B45309' }]}>
              {item.warehouse_pending}
            </Text>
            <Text style={styles.cardStatLabel}>Хүлээж буй</Text>
          </View>
          <View style={styles.cardStatDivider} />
          <View style={styles.cardStat}>
            <CheckCircle2 size={15} color="#10B981" />
            <Text style={[styles.cardStatValue, { color: '#059669' }]}>{checked}</Text>
            <Text style={styles.cardStatLabel}>Тулгасан</Text>
          </View>
        </View>

        {/* Row 4: Amount */}
        <View style={styles.cardFooter}>
          <Text style={styles.amountLabel}>Нийт дүн</Text>
          <Text style={styles.amountValue}>{formatAmount(item.total_amount)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // --- Loading skeleton ---
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.summaryBar}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.summaryItem}>
              <View style={[styles.skeletonCircle, { backgroundColor: '#E5E7EB' }]} />
              <View style={[styles.skeletonLine, { width: 28, marginTop: 6 }]} />
              <View style={[styles.skeletonLine, { width: 40, marginTop: 4 }]} />
            </View>
          ))}
        </View>
        <View style={styles.listContent}>
          {[1, 2].map((i) => (
            <View key={i} style={[styles.card, { height: 160 }]}>
              <View style={[styles.skeletonLine, { width: '60%', height: 14 }]} />
              <View style={[styles.skeletonLine, { width: '40%', height: 10, marginTop: 10 }]} />
              <View style={[styles.skeletonLine, { width: '100%', height: 6, marginTop: 16, borderRadius: 3 }]} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
                {[1, 2, 3].map((j) => (
                  <View key={j} style={[styles.skeletonLine, { width: '28%', height: 30 }]} />
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary bar */}
      {packages.length > 0 && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryIcon, { backgroundColor: '#DBEAFE' }]}>  
              <ClipboardList size={16} color="#2563EB" />
            </View>
            <Text style={styles.summaryValue}>{packages.length}</Text>
            <Text style={styles.summaryLabel}>Багц</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <View style={[styles.summaryIcon, { backgroundColor: '#FEF3C7' }]}>  
              <Clock size={16} color="#D97706" />
            </View>
            <Text style={[styles.summaryValue, { color: '#B45309' }]}>{summary.totalPending}</Text>
            <Text style={styles.summaryLabel}>Тулгах</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <View style={[styles.summaryIcon, { backgroundColor: '#D1FAE5' }]}>  
              <CheckCircle2 size={16} color="#059669" />
            </View>
            <Text style={[styles.summaryValue, { color: '#059669' }]}>{summary.totalChecked}</Text>
            <Text style={styles.summaryLabel}>Тулгасан</Text>
          </View>
        </View>
      )}

      {/* Packages list */}
      <FlatList
        data={packages}
        renderItem={renderPackageItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: TAB_BAR_HEIGHT + 16 },
          packages.length === 0 && { flex: 1 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563EB"
            colors={['#2563EB']}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <CheckCircle2 size={48} color="#10B981" />
            </View>
            <Text style={styles.emptyTitle}>Бүх тулгалт дууссан!</Text>
            <Text style={styles.emptySubtitle}>
              Одоогоор тулгалт хүлээж буй багц байхгүй байна.{'\n'}
              Түгээлт хэсэгт шилжиж хүргэлт эхлүүлээрэй.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/delivery' as any)}
            >
              <Text style={styles.emptyButtonText}>Түгээлт руу шилжих</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

// ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  /* ── Summary bar ── */
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: 'GIP-Bold',
    color: '#1F2937',
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginTop: 1,
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E5E7EB',
  },

  /* ── List ── */
  listContent: {
    padding: 16,
  },

  /* ── Card ── */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardToday: {
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },

  /* Card top row */
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleGroup: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'GIP-Bold',
    color: '#1F2937',
  },
  cardDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  cardDate: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#9CA3AF',
  },
  todayChip: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 4,
  },
  todayChipText: {
    fontSize: 10,
    fontFamily: 'GIP-SemiBold',
    color: '#2563EB',
  },
  pendingChip: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingChipText: {
    fontSize: 11,
    fontFamily: 'GIP-SemiBold',
    color: '#B45309',
  },

  /* Progress bar */
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'GIP-SemiBold',
    color: '#6B7280',
    minWidth: 36,
    textAlign: 'right',
  },

  /* Stats row */
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cardStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  cardStatValue: {
    fontSize: 15,
    fontFamily: 'GIP-Bold',
    color: '#1F2937',
  },
  cardStatLabel: {
    fontSize: 11,
    fontFamily: 'GIP-Regular',
    color: '#9CA3AF',
  },
  cardStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#F3F4F6',
  },

  /* Card footer */
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  amountLabel: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#9CA3AF',
  },
  amountValue: {
    fontSize: 15,
    fontFamily: 'GIP-Bold',
    color: '#1F2937',
  },

  /* ── Empty state ── */
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'GIP-Bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyButtonText: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#FFFFFF',
  },

  /* ── Skeleton / loading ── */
  skeletonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
});
