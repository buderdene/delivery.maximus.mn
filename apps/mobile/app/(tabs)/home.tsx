/**
 * НҮҮР ДЭЛГЭЦ (Dashboard)
 * 
 * Өнөөдрийн хүргэлтийн тойм:
 * - Ажилтны мэдээлэл
 * - Статистик (Нийт, Хүргэсэн, Үлдсэн)
 * - Түргэн үйлдлүүд
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
// @ts-ignore - expo-router exports router in v6
import { router } from 'expo-router';
import { 
  Package, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Warehouse,
  User,
  Car,
  MapPin,
  TrendingUp,
  BarChart3,
  Banknote,
  XCircle,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/delivery-auth-store';
import { 
  getWorkerPackages, 
  getWorkerProfile, 
  getTodayReport,
  PackageListItem, 
  TodayReportData,
  WorkerProfile 
} from '../../services/delivery-api';

export default function HomeScreen() {
  const { worker } = useAuthStore();
  
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [report, setReport] = useState<TodayReportData | null>(null);
  const [warehousePending, setWarehousePending] = useState(0);
  const [deliveryPending, setDeliveryPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [packagesResult, profileResult, reportResult] = await Promise.all([
        getWorkerPackages(worker?.id),
        getWorkerProfile(worker?.id),
        getTodayReport(),
      ]);
      
      if (packagesResult.success && packagesResult.data) {
        // Count warehouse pending packages
        const warehousePackages = packagesResult.data.packages.filter(
          (pkg) => pkg.warehouse_pending > 0
        );
        setWarehousePending(warehousePackages.length);
        
        // Count delivery pending packages
        const deliveryPackages = packagesResult.data.packages.filter(
          (pkg) => pkg.warehouse_pending === 0 && pkg.delivery_pending > 0
        );
        setDeliveryPending(deliveryPackages.length);
      }
      
      if (profileResult.success && profileResult.data) {
        setProfile(profileResult.data);
      }

      if (reportResult.success && reportResult.data) {
        setReport(reportResult.data);
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

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('mn-MN') + '₮';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Уншиж байна...</Text>
      </View>
    );
  }

  const todayStats = profile?.today_stats;
  const progressPercent = todayStats?.total_orders 
    ? Math.round((todayStats.delivered / todayStats.total_orders) * 100) 
    : 0;

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
      }
    >
      {/* Worker Info Card */}
      <View style={styles.workerCard}>
        <View style={styles.workerHeader}>
          <View style={styles.avatarContainer}>
            <User size={28} color="#2563EB" />
          </View>
          <View style={styles.workerInfo}>
            <Text style={styles.workerName}>{worker?.name || profile?.worker?.name || 'Ажилтан'}</Text>
            <Text style={styles.workerType}>
              {profile?.worker?.worker_type_label || 'Жолооч'}
            </Text>
          </View>
        </View>
        
        {profile?.car && (
          <View style={styles.carInfo}>
            <Car size={16} color="#6B7280" />
            <Text style={styles.carText}>
              {profile.car.brand} {profile.car.model} • {profile.car.plate}
            </Text>
          </View>
        )}

        {/* Today's Date */}
        <View style={styles.todayDateRow}>
          <Calendar size={16} color="#2563EB" />
          <Text style={styles.todayDateText}>
            {new Date().toLocaleDateString('mn-MN', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              weekday: 'long'
            })}
          </Text>
        </View>
      </View>

      {/* Today Stats Overview */}
      {todayStats && (
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <TrendingUp size={20} color="#2563EB" />
            <Text style={styles.overviewTitle}>Өнөөдрийн тойм</Text>
          </View>

          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Гүйцэтгэл</Text>
              <Text style={styles.progressPercent}>{progressPercent}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressDetail}>
              {todayStats.delivered} / {todayStats.total_orders} захиалга хүргэгдсэн
            </Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.overviewStats}>
            <View style={[styles.overviewStatItem, { backgroundColor: '#EFF6FF' }]}>
              <Package size={24} color="#2563EB" />
              <Text style={styles.overviewStatValue}>{todayStats.total_orders}</Text>
              <Text style={styles.overviewStatLabel}>Нийт</Text>
            </View>
            
            <View style={[styles.overviewStatItem, { backgroundColor: '#D1FAE5' }]}>
              <CheckCircle2 size={24} color="#10B981" />
              <Text style={styles.overviewStatValue}>{todayStats.delivered}</Text>
              <Text style={styles.overviewStatLabel}>Хүргэсэн</Text>
            </View>
            
            <View style={[styles.overviewStatItem, { backgroundColor: '#FEF3C7' }]}>
              <Clock size={24} color="#F59E0B" />
              <Text style={styles.overviewStatValue}>{todayStats.pending + todayStats.in_progress}</Text>
              <Text style={styles.overviewStatLabel}>Үлдсэн</Text>
            </View>

            <View style={[styles.overviewStatItem, { backgroundColor: '#FEE2E2' }]}>
              <XCircle size={24} color="#EF4444" />
              <Text style={styles.overviewStatValue}>{todayStats.failed}</Text>
              <Text style={styles.overviewStatLabel}>Амжилтгүй</Text>
            </View>
          </View>

          {/* Amount Info */}
          <View style={styles.amountSection}>
            <View style={styles.amountRow}>
              <Banknote size={18} color="#10B981" />
              <Text style={styles.amountInfoLabel}>Хүргэсэн дүн:</Text>
              <Text style={styles.amountInfoValue}>{formatAmount(todayStats.delivered_amount)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.quickActionsTitle}>Үндсэн үйлдэл</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => router.push('/(tabs)/warehouse' as any)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#DBEAFE' }]}>
              <Warehouse size={28} color="#2563EB" />
            </View>
            <Text style={styles.quickActionText}>Агуулах</Text>
            {warehousePending > 0 && (
              <View style={styles.quickActionBadge}>
                <Text style={styles.quickActionBadgeText}>{warehousePending}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => router.push('/(tabs)/delivery' as any)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FEF3C7' }]}>
              <Truck size={28} color="#F59E0B" />
            </View>
            <Text style={styles.quickActionText}>Түгээлт</Text>
            {deliveryPending > 0 && (
              <View style={[styles.quickActionBadge, { backgroundColor: '#F59E0B' }]}>
                <Text style={styles.quickActionBadgeText}>{deliveryPending}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => router.push('/(tabs)/report' as any)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#E0E7FF' }]}>
              <BarChart3 size={28} color="#6366F1" />
            </View>
            <Text style={styles.quickActionText}>Тайлан</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => router.push('/location' as any)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FEE2E2' }]}>
              <MapPin size={28} color="#EF4444" />
            </View>
            <Text style={styles.quickActionText}>Байршил</Text>
          </TouchableOpacity>
        </View>
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
    paddingBottom: 32,
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
  
  // Worker Card
  workerCard: {
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
  workerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workerInfo: {
    marginLeft: 14,
    flex: 1,
  },
  workerName: {
    fontSize: 18,
    fontFamily: 'GIP-Bold',
    color: '#1F2937',
  },
  workerType: {
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
    marginTop: 2,
  },
  carInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  carText: {
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#4B5563',
  },
  todayDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  todayDateText: {
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#2563EB',
  },

  // Overview Card
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  overviewTitle: {
    fontSize: 16,
    fontFamily: 'GIP-SemiBold',
    color: '#1F2937',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#4B5563',
  },
  progressPercent: {
    fontSize: 20,
    fontFamily: 'GIP-Bold',
    color: '#2563EB',
  },
  progressBar: {
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 5,
  },
  progressDetail: {
    fontSize: 13,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  overviewStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  overviewStatItem: {
    width: '48%',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  overviewStatValue: {
    fontSize: 22,
    fontFamily: 'GIP-Bold',
    color: '#1F2937',
    marginTop: 6,
  },
  overviewStatLabel: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
    marginTop: 2,
  },
  amountSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountInfoLabel: {
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#4B5563',
    flex: 1,
  },
  amountInfoValue: {
    fontSize: 16,
    fontFamily: 'GIP-Bold',
    color: '#10B981',
  },

  // Quick Actions
  quickActions: {
    marginBottom: 20,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontFamily: 'GIP-SemiBold',
    color: '#1F2937',
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionButton: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionText: {
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#4B5563',
  },
  quickActionBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  quickActionBadgeText: {
    fontSize: 12,
    fontFamily: 'GIP-Bold',
    color: '#FFFFFF',
  },
});
