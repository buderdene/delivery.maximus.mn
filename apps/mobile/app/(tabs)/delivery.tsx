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
import { 
  Truck, 
  Package, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ChevronRight,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/delivery-auth-store';
import { getWorkerPackages, getWorkerProfile, TodayStats, PackageListItem } from '../../services/delivery-api';

export default function DeliveryScreen() {
  const { worker } = useAuthStore();
  
  const [packages, setPackages] = useState<PackageListItem[]>([]);
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [packagesResult, profileResult] = await Promise.all([
        getWorkerPackages(worker?.id),
        getWorkerProfile(worker?.id),
      ]);
      
      if (packagesResult.success && packagesResult.data) {
        // Show all packages for delivery view
        // Packages with delivery_pending > 0 or delivered > 0 are relevant
        setPackages(packagesResult.data.packages);
      }
      
      if (profileResult.success && profileResult.data) {
        setStats(profileResult.data.today_stats);
      }
    } catch (error) {
      Alert.alert('Алдаа', 'Сүлжээний алдаа гарлаа');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [worker?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Navigate to package delivery detail page
  const goToPackageDelivery = (packageId: number) => {
    router.push(`/package/${packageId}/delivery` as any);
  };

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
      case 'loaded': return 'Ачигдсан';
      case 'in_progress': return 'Хүргэж байна';
      case 'delivered': return 'Хүргэгдсэн';
      case 'failed': return 'Амжилтгүй';
      case 'returned': return 'Буцаагдсан';
      default: return status;
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

  const renderPackageItem = ({ item }: { item: PackageListItem }) => {
    const totalOrders = item.total_orders || 0;
    const deliveredOrders = item.delivered || 0;
    const pendingOrders = item.delivery_pending || 0;
    const progress = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;
    const isCompleted = progress === 100 && totalOrders > 0;
    const hasPending = pendingOrders > 0;
    
    return (
      <TouchableOpacity
        style={[
          styles.packageCard,
          isCompleted && styles.packageCardCompleted,
          hasPending && styles.packageCardPending,
        ]}
        onPress={() => goToPackageDelivery(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.packageIconContainer, isCompleted && { backgroundColor: '#D1FAE5' }]}>
          <Truck size={28} color={isCompleted ? '#10B981' : '#e17100'} />
        </View>
        
        <View style={styles.packageInfo}>
          <Text style={styles.packageName}>{item.name}</Text>
          <Text style={styles.packageDate}>{item.formatted_date}</Text>
          
          <View style={styles.packageStats}>
            <View style={styles.packageStatItem}>
              <Package size={14} color="#6B7280" />
              <Text style={styles.packageStatText}>{totalOrders} падаан</Text>
            </View>
            <View style={[styles.packageStatItem, { marginLeft: 12 }]}>
              <CheckCircle2 size={14} color="#e17100" />
              <Text style={[styles.packageStatText, { color: '#e17100' }]}>{deliveredOrders}</Text>
            </View>
            {pendingOrders > 0 && (
              <View style={[styles.packageStatItem, { marginLeft: 12 }]}>
                <Clock size={14} color="#D97706" />
                <Text style={[styles.packageStatText, { color: '#D97706' }]}>{pendingOrders}</Text>
              </View>
            )}
          </View>
          
          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        </View>
        
        <ChevronRight size={24} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e17100" />
        <Text style={styles.loadingText}>Уншиж байна...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIconRow}>
          <Truck size={24} color="#e17100" />
          <Text style={styles.headerTitle}>Түгээлт</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {packages.length > 0 
            ? `${packages.length} багц хүргэлтэд бэлэн`
            : 'Хүргэлтэд бэлэн багц алга'
          }
        </Text>
      </View>

      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
              <Package size={20} color="#2563EB" />
              <Text style={[styles.statValue, { color: '#2563EB' }]}>{stats.total_orders}</Text>
              <Text style={styles.statLabel}>Нийт</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
              <CheckCircle2 size={20} color="#e17100" />
              <Text style={[styles.statValue, { color: '#e17100' }]}>{stats.delivered}</Text>
              <Text style={styles.statLabel}>Хүргэсэн</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
              <Clock size={20} color="#D97706" />
              <Text style={[styles.statValue, { color: '#D97706' }]}>{stats.pending + stats.in_progress}</Text>
              <Text style={styles.statLabel}>Үлдсэн</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
              <XCircle size={20} color="#DC2626" />
              <Text style={[styles.statValue, { color: '#DC2626' }]}>{stats.failed}</Text>
              <Text style={styles.statLabel}>Амжилтгүй</Text>
            </View>
          </View>
        </View>
      )}

      <FlatList
        data={packages}
        renderItem={renderPackageItem}
        keyExtractor={(item) => item.id.toString()}
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
            <Text style={styles.emptyText}>Хүргэлтийн багц алга</Text>
            <Text style={styles.emptySubtext}>Агуулах хэсэгт тулгалт хийнэ үү</Text>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'GIP-Bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginTop: 4,
    marginLeft: 34,
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'GIP-Bold',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
  },
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  packageCardCompleted: {
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  packageCardPending: {
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  packageIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageInfo: {
    flex: 1,
    marginLeft: 14,
  },
  packageName: {
    fontSize: 16,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
  },
  packageDate: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  packageStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  packageStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  packageStatText: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#e17100',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'GIP-SemiBold',
    color: '#e17100',
    minWidth: 36,
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
