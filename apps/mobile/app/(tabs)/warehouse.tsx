/**
 * АГУУЛАХ ТУЛГАЛТ ДЭЛГЭЦ
 * 
 * Тулгалт хүлээж буй багцуудын жагсаалт
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
} from 'react-native';
// @ts-ignore - expo-router exports router in v6
import { router } from 'expo-router';
import { Package, Calendar, ChevronRight, Box, CheckCircle2, Clock, Truck, Warehouse } from 'lucide-react-native';
import { useAuthStore } from '../../stores/delivery-auth-store';
import { getWorkerPackages, PackageListItem } from '../../services/delivery-api';

export default function WarehouseScreen() {
  const { worker } = useAuthStore();
  
  const [packages, setPackages] = useState<PackageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPackages = useCallback(async () => {
    try {
      const result = await getWorkerPackages(worker?.id);
      
      if (result.success && result.data) {
        // Show all packages (no filter) - let user see full list
        // Packages with warehouse_pending > 0 need checking
        setPackages(result.data.packages);
      } else {
        Alert.alert('Алдаа', result.message || 'Багц татахад алдаа гарлаа');
      }
    } catch (error) {
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

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('mn-MN') + '₮';
  };

  const renderPackageItem = ({ item }: { item: PackageListItem }) => {
    const today = new Date().toISOString().split('T')[0];
    const isToday = item.delivery_date === today;
    const needsChecking = item.warehouse_pending > 0;
    const isCompleted = item.warehouse_pending === 0 && item.total_orders > 0;
    
    return (
      <TouchableOpacity
        style={[
          styles.packageCard, 
          isToday && styles.packageCardToday,
          needsChecking && styles.packageCardPending,
          isCompleted && styles.packageCardCompleted,
        ]}
        onPress={() => router.push(`/package/${item.id}` as any)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.packageHeader}>
          <View style={styles.packageTitleRow}>
            <Package size={20} color={needsChecking ? '#F59E0B' : isCompleted ? '#10B981' : '#6B7280'} />
            <Text style={[styles.packageName, needsChecking && styles.packageNamePending]}>
              {item.name}
            </Text>
            {needsChecking && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>Тулгах</Text>
              </View>
            )}
            {isCompleted && (
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>Дууссан</Text>
              </View>
            )}
          </View>
          <ChevronRight size={20} color="#9CA3AF" />
        </View>

        {/* Date */}
        <View style={styles.dateRow}>
          <Calendar size={14} color="#6B7280" />
          <Text style={styles.dateText}>{item.formatted_date}</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Box size={18} color="#3B82F6" />
            <Text style={styles.statValue}>{item.total_orders}</Text>
            <Text style={styles.statLabel}>Нийт</Text>
          </View>

          <View style={styles.statBox}>
            <Clock size={18} color="#F59E0B" />
            <Text style={styles.statValue}>{item.warehouse_pending}</Text>
            <Text style={styles.statLabel}>Тулгах</Text>
          </View>

          <View style={styles.statBox}>
            <Truck size={18} color="#8B5CF6" />
            <Text style={styles.statValue}>{item.delivery_pending}</Text>
            <Text style={styles.statLabel}>Хүргэлт</Text>
          </View>

          <View style={styles.statBox}>
            <CheckCircle2 size={18} color="#10B981" />
            <Text style={styles.statValue}>{item.delivered}</Text>
            <Text style={styles.statLabel}>Хүргэсэн</Text>
          </View>
        </View>

        {/* Footer - Total Amount */}
        <View style={styles.packageFooter}>
          <Text style={styles.amountLabel}>Нийт дүн:</Text>
          <Text style={styles.amountValue}>{formatAmount(item.total_amount)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Уншиж байна...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconRow}>
          <Warehouse size={24} color="#2563EB" />
          <Text style={styles.headerTitle}>Агуулах тулгалт</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {packages.length > 0 
            ? `${packages.length} багц тулгалт хүлээж байна`
            : 'Тулгалт хүлээж буй багц алга'
          }
        </Text>
      </View>

      {/* Packages List */}
      <FlatList
        data={packages}
        renderItem={renderPackageItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563EB']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <CheckCircle2 size={64} color="#10B981" />
            <Text style={styles.emptyText}>Бүх тулгалт дууссан!</Text>
            <Text style={styles.emptySubtext}>Түгээлт хэсэгт шилжээрэй</Text>
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
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'GIP-Bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  packageCardToday: {
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  packageCardPending: {
    borderWidth: 2,
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  packageCardCompleted: {
    borderWidth: 2,
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  packageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  packageName: {
    fontSize: 17,
    fontFamily: 'GIP-Bold',
    color: '#1F2937',
  },
  packageNameToday: {
    color: '#2563EB',
  },
  packageNamePending: {
    color: '#B45309',
  },
  todayBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  todayBadgeText: {
    fontSize: 11,
    fontFamily: 'GIP-SemiBold',
    color: '#2563EB',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontFamily: 'GIP-SemiBold',
    color: '#B45309',
  },
  completedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  completedBadgeText: {
    fontSize: 11,
    fontFamily: 'GIP-SemiBold',
    color: '#059669',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'GIP-Bold',
    color: '#1F2937',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  packageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  amountLabel: {
    fontSize: 13,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  amountValue: {
    fontSize: 16,
    fontFamily: 'GIP-Bold',
    color: '#1F2937',
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
    color: '#1F2937',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
});
