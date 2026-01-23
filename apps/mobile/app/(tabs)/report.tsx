/**
 * ТАЙЛАН ДЭЛГЭЦ
 * 
 * Өнөөдрийн хүргэлтийн тайлан:
 * - Нийт хүргэлт
 * - Хүргэсэн
 * - Хүргэж буй
 * - Амжилтгүй
 * - Нийт дүн
 * - Хүргэсэн дүн
 * - Төлбөрийн мэдээлэл
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Package,
  CheckCircle2,
  Truck,
  XCircle,
  Banknote,
  CreditCard,
  Clock,
  TrendingUp,
  BarChart3,
  Wallet,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/delivery-auth-store';
import { getTodayReport, TodayReportData } from '../../services/delivery-api';

export default function ReportScreen() {
  const { worker } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [report, setReport] = useState<TodayReportData | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      const result = await getTodayReport();
      if (result.success && result.data) {
        setReport(result.data);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReport();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Тайлан ачааллаж байна...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const formatAmount = (amount: number) => {
    return amount.toLocaleString() + '₮';
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <BarChart3 size={28} color="#2563EB" />
          <Text style={styles.headerTitle}>Өнөөдрийн тайлан</Text>
          <Text style={styles.headerDate}>
            {new Date().toLocaleDateString('mn-MN', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
        </View>

        {/* Delivery Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Хүргэлтийн статистик</Text>
          
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
              <Package size={24} color="#2563EB" />
              <Text style={styles.statValue}>{report?.total_orders || 0}</Text>
              <Text style={styles.statLabel}>Нийт захиалга</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
              <CheckCircle2 size={24} color="#F59E0B" />
              <Text style={styles.statValue}>{report?.delivered || 0}</Text>
              <Text style={styles.statLabel}>Хүргэсэн</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
              <Truck size={24} color="#3B82F6" />
              <Text style={styles.statValue}>{report?.in_progress || 0}</Text>
              <Text style={styles.statLabel}>Хүргэж буй</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
              <XCircle size={24} color="#EF4444" />
              <Text style={styles.statValue}>{report?.failed || 0}</Text>
              <Text style={styles.statLabel}>Амжилтгүй</Text>
            </View>
          </View>
        </View>

        {/* Amount Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Дүнгийн мэдээлэл</Text>
          
          <View style={styles.amountCard}>
            <View style={styles.amountRow}>
              <View style={styles.amountItem}>
                <Wallet size={20} color="#6B7280" />
                <Text style={styles.amountLabel}>Нийт дүн</Text>
              </View>
              <Text style={styles.amountValue}>{formatAmount(report?.total_amount || 0)}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.amountRow}>
              <View style={styles.amountItem}>
                <TrendingUp size={20} color="#10B981" />
                <Text style={styles.amountLabel}>Хүргэсэн дүн</Text>
              </View>
              <Text style={[styles.amountValue, { color: '#10B981' }]}>
                {formatAmount(report?.delivered_amount || 0)}
              </Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.amountRow}>
              <View style={styles.amountItem}>
                <Clock size={20} color="#F59E0B" />
                <Text style={styles.amountLabel}>Үлдсэн дүн</Text>
              </View>
              <Text style={[styles.amountValue, { color: '#F59E0B' }]}>
                {formatAmount((report?.total_amount || 0) - (report?.delivered_amount || 0))}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Төлбөрийн мэдээлэл</Text>
          
          <View style={styles.paymentGrid}>
            <View style={styles.paymentCard}>
              <Banknote size={24} color="#10B981" />
              <Text style={styles.paymentValue}>{formatAmount(report?.cash_amount || 0)}</Text>
              <Text style={styles.paymentLabel}>Бэлэн</Text>
            </View>
            
            <View style={styles.paymentCard}>
              <CreditCard size={24} color="#8B5CF6" />
              <Text style={styles.paymentValue}>{formatAmount(report?.card_amount || 0)}</Text>
              <Text style={styles.paymentLabel}>Карт</Text>
            </View>
          </View>
        </View>

        {/* Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Гүйцэтгэл</Text>
          
          <View style={styles.performanceCard}>
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>Хүргэлтийн хувь</Text>
              <Text style={styles.performanceValue}>
                {report?.total_orders 
                  ? Math.round((report.delivered / report.total_orders) * 100) 
                  : 0}%
              </Text>
            </View>
            
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${report?.total_orders 
                      ? Math.round((report.delivered / report.total_orders) * 100) 
                      : 0}%` 
                  }
                ]} 
              />
            </View>
            
            <View style={styles.performanceDetails}>
              <Text style={styles.performanceDetailText}>
                {report?.delivered || 0} / {report?.total_orders || 0} захиалга хүргэгдсэн
              </Text>
            </View>
          </View>
        </View>

        {/* Average Delivery Time */}
        {report?.avg_delivery_minutes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Дундаж хугацаа</Text>
            
            <View style={styles.timeCard}>
              <Clock size={32} color="#2563EB" />
              <Text style={styles.timeValue}>
                {report.avg_delivery_minutes < 60 
                  ? `${Math.round(report.avg_delivery_minutes)} минут`
                  : `${Math.floor(report.avg_delivery_minutes / 60)} цаг ${Math.round(report.avg_delivery_minutes % 60)} мин`
                }
              </Text>
              <Text style={styles.timeLabel}>Дундаж хүргэлтийн хугацаа</Text>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'GIP-Bold',
    color: '#1F2937',
    marginTop: 8,
  },
  headerDate: {
    fontSize: 14,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'GIP-SemiBold',
    color: '#374151',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontFamily: 'GIP-Bold',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
    marginTop: 4,
  },
  amountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  amountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  amountLabel: {
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#4B5563',
  },
  amountValue: {
    fontSize: 16,
    fontFamily: 'GIP-Bold',
    color: '#1F2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  paymentGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentValue: {
    fontSize: 18,
    fontFamily: 'GIP-Bold',
    color: '#1F2937',
    marginTop: 8,
  },
  paymentLabel: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
    marginTop: 4,
  },
  performanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  performanceLabel: {
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#4B5563',
  },
  performanceValue: {
    fontSize: 24,
    fontFamily: 'GIP-Bold',
    color: '#2563EB',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 4,
  },
  performanceDetails: {
    marginTop: 12,
    alignItems: 'center',
  },
  performanceDetailText: {
    fontSize: 13,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  timeCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  timeValue: {
    fontSize: 28,
    fontFamily: 'GIP-Bold',
    color: '#2563EB',
    marginTop: 12,
  },
  timeLabel: {
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
    marginTop: 4,
  },
});
