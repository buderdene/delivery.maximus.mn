/**
 * ТУЛГАЛТЫН АРГА СОНГОХ ДЭЛГЭЦ
 * 
 * Багц руу орох үед эхлээд энэ дэлгэц гарч ирнэ:
 * - Падаанаар тулгах: Харилцагч бүрээр захиалга тулгах
 * - Хайрцагаар тулгах: Бүх бараануудыг нэгтгэж тулгах
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { 
  Package, 
  Users, 
  Boxes, 
  ArrowLeft,
  ArrowRight,
  Calendar,
  ClipboardList,
  Hash,
  CheckCircle2,
  Circle,
  Warehouse,
  Truck,
  Loader2,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../stores/delivery-auth-store';
import { getPackageOrders, PackageOrdersData, getPackageProducts, PackageProductsSummary, completePackageChecking } from '../../../services/delivery-api';

// Warehouse related statuses
const WAREHOUSE_STATUSES = 'assigned_to_driver,warehouse_checking,warehouse_checked,driver_checking';

export default function PackageCheckingMethodScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { worker } = useAuthStore();
  
  const [data, setData] = useState<PackageOrdersData | null>(null);
  const [productsSummary, setProductsSummary] = useState<PackageProductsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  const fetchPackageInfo = useCallback(async () => {
    if (!id) return;
    
    try {
      // Fetch both orders and products summary in parallel
      const [ordersResult, productsResult] = await Promise.all([
        getPackageOrders({
          packageId: parseInt(id),
          workerId: worker?.id,
          status: WAREHOUSE_STATUSES,
        }),
        getPackageProducts({
          packageId: parseInt(id),
          workerId: worker?.id,
          status: WAREHOUSE_STATUSES,
        }),
      ]);
      
      if (ordersResult.success && ordersResult.data) {
        setData(ordersResult.data);
      } else {
        Alert.alert('Алдаа', ordersResult.message || 'Багц татахад алдаа гарлаа');
      }
      
      if (productsResult.success && productsResult.data) {
        setProductsSummary(productsResult.data.summary);
      }
    } catch (error) {
      Alert.alert('Алдаа', 'Сүлжээний алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }, [id, worker?.id]);

  useEffect(() => {
    fetchPackageInfo();
  }, [fetchPackageInfo]);

  // Check if all products are fully checked (by driver)
  const isFullyChecked = productsSummary && 
    productsSummary.total_quantity > 0 && 
    productsSummary.driver_checked_quantity >= productsSummary.total_quantity;
  
  const checkProgress = productsSummary && productsSummary.total_quantity > 0
    ? Math.round((productsSummary.driver_checked_quantity / productsSummary.total_quantity) * 100)
    : 0;

  // Handle complete checking - move to LOADED status
  const handleCompleteChecking = async (force: boolean = false) => {
    if (!id) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (!force && !isFullyChecked) {
      // Show confirmation if not fully checked
      Alert.alert(
        'Тулгалт дуусгах',
        `Бүх бараа тулгагдаагүй байна (${checkProgress}%).\nСилэх үү?`,
        [
          { text: 'Үгүй', style: 'cancel' },
          { 
            text: 'Тийм, дуусгах', 
            style: 'destructive',
            onPress: () => handleCompleteChecking(true),
          },
        ]
      );
      return;
    }
    
    setCompleting(true);
    
    try {
      const result = await completePackageChecking({
        packageId: parseInt(id),
        workerId: worker?.id,
        force: force,
      });
      
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Амжилттай!',
          result.message || 'Багц ачилтад бэлэн болсон.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(tabs)'),
            },
          ]
        );
      } else {
        // Check if there are unchecked orders
        if (result.unchecked_orders && result.unchecked_orders.length > 0) {
          const orderList = result.unchecked_orders
            .slice(0, 3)
            .map(o => `• ${o.order_code}: ${o.checked_quantity}/${o.total_quantity}`)
            .join('\n');
          
          Alert.alert(
            'Тулгагдаагүй захиалга',
            `${result.message}\n\n${orderList}${result.unchecked_orders.length > 3 ? `\n... +${result.unchecked_orders.length - 3} бусад` : ''}`,
            [
              { text: 'Буцах', style: 'cancel' },
              { 
                text: 'Дуусгах', 
                style: 'destructive',
                onPress: () => handleCompleteChecking(true),
              },
            ]
          );
        } else {
          Alert.alert('Алдаа', result.message || 'Алдаа гарлаа');
        }
      }
    } catch (error) {
      Alert.alert('Алдаа', 'Сүлжээний алдаа гарлаа');
    } finally {
      setCompleting(false);
    }
  };

  const handleSelectMethod = (method: 'padaan' | 'box') => {
    if (method === 'padaan') {
      router.replace(`/package/${id}/orders` as any);
    } else {
      router.replace(`/package/${id}/box` as any);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Уншиж байна...</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Тулгалтын арга сонгох',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 8 }}>
              <ArrowLeft size={24} color="#1F2937" />
            </TouchableOpacity>
          ),
        }}
      />
      
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Package Info Header */}
        {data?.package && (
          <View style={styles.packageHeader}>
            <View style={styles.packageTitleRow}>
              <Calendar size={20} color="#2563EB" />
              <Text style={styles.packageTitle}>Багц: {data.package.name}</Text>
            </View>
            <View style={styles.packageInfoRow}>
              <Text style={styles.packageDate}>{data.package.formatted_date}</Text>
              <Text style={styles.packageOrderCount}>{data.total_count} захиалга</Text>
            </View>
          </View>
        )}

        {/* Method Selection */}
        <View style={styles.methodsContainer}>
          <Text style={styles.sectionTitle}>Тулгалтын аргаа сонгоно уу</Text>
          
          {/* Падаанаар тулгах */}
          <TouchableOpacity
            style={styles.methodCard}
            onPress={() => handleSelectMethod('padaan')}
            activeOpacity={0.7}
          >
            <View style={styles.methodIconContainer}>
              <Users size={32} color="#3B82F6" />
            </View>
            <View style={styles.methodContent}>
              <Text style={styles.methodTitle}>Падаанаар тулгах</Text>
              <Text style={styles.methodDescription}>
                Харилцагч бүрээр нь бараа тулгах
              </Text>
              <View style={styles.methodBadges}>
                <View style={styles.badge}>
                  <ClipboardList size={12} color="#6B7280" />
                  <Text style={styles.badgeText}>{data?.total_count || 0} падаан</Text>
                </View>
                <View style={[styles.badge, styles.badgeOutline]}>
                  <Text style={styles.badgeTextOutline}>Дараалалтай</Text>
                </View>
              </View>
            </View>
            <ArrowRight size={24} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Хайрцагаар тулгах */}
          <TouchableOpacity
            style={styles.methodCard}
            onPress={() => handleSelectMethod('box')}
            activeOpacity={0.7}
          >
            <View style={[styles.methodIconContainer, { backgroundColor: '#ECFDF5' }]}>
              <Boxes size={32} color="#e17100" />
            </View>
            <View style={styles.methodContent}>
              <Text style={styles.methodTitle}>Хайрцагаар тулгах</Text>
              <Text style={styles.methodDescription}>
                Бүх бараануудыг нэгтгэж тулгах
              </Text>
              
              {/* Check Progress */}
              {productsSummary && productsSummary.total_quantity > 0 && (
                <View style={styles.checkProgressContainer}>
                  {/* Warehouse Progress */}
                  <View style={styles.checkProgressRow}>
                    <View style={styles.checkProgressLabel}>
                      <Warehouse size={12} color="#2563EB" />
                      <Text style={[styles.checkProgressLabelText, styles.checkProgressLabelWarehouse]}>Нярав</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View 
                        style={[
                          styles.progressBar, 
                          styles.progressBarWarehouse,
                          { width: `${Math.min(100, (productsSummary.warehouse_checked_quantity / productsSummary.total_quantity) * 100)}%` }
                        ]} 
                      />
                    </View>
                    <Text style={[
                      styles.checkProgressCount,
                      styles.checkProgressCountWarehouse,
                      productsSummary.warehouse_checked_quantity >= productsSummary.total_quantity && styles.checkProgressCompleteWarehouse
                    ]}>
                      {productsSummary.warehouse_checked_quantity}/{productsSummary.total_quantity}
                    </Text>
                  </View>
                  
                  {/* Driver Progress */}
                  <View style={styles.checkProgressRow}>
                    <View style={styles.checkProgressLabel}>
                      <Truck size={12} color="#e17100" />
                      <Text style={[styles.checkProgressLabelText, styles.checkProgressLabelDriver]}>Түгээгч</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View 
                        style={[
                          styles.progressBar, 
                          styles.progressBarDriver,
                          { width: `${Math.min(100, (productsSummary.driver_checked_quantity / productsSummary.total_quantity) * 100)}%` }
                        ]} 
                      />
                    </View>
                    <Text style={[
                      styles.checkProgressCount,
                      styles.checkProgressCountDriver,
                      productsSummary.driver_checked_quantity >= productsSummary.total_quantity && styles.checkProgressCompleteDriver
                    ]}>
                      {productsSummary.driver_checked_quantity}/{productsSummary.total_quantity}
                    </Text>
                  </View>
                </View>
              )}
              
              <View style={styles.methodBadges}>
                <View style={styles.badge}>
                  <Hash size={12} color="#6B7280" />
                  <Text style={styles.badgeText}>{productsSummary?.total_products || 0} бараа</Text>
                </View>
                <View style={[styles.badge, styles.badgeOutline]}>
                  <Text style={styles.badgeTextOutline}>Хурдан</Text>
                </View>
              </View>
            </View>
            <ArrowRight size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Stats Summary - Based on Product Check Progress */}
        {productsSummary && productsSummary.total_quantity > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View style={styles.statIconRow}>
                <Warehouse size={16} color="#2563EB" />
              </View>
              <Text style={[styles.statValue, styles.statValueWarehouse]}>
                {productsSummary.warehouse_checked_quantity}/{productsSummary.total_quantity}
              </Text>
              <Text style={styles.statLabel}>Нярав</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconRow}>
                <Truck size={16} color="#e17100" />
              </View>
              <Text style={[styles.statValue, styles.statValueDriver]}>
                {productsSummary.driver_checked_quantity}/{productsSummary.total_quantity}
              </Text>
              <Text style={styles.statLabel}>Түгээгч</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconRow}>
                <Circle size={16} color="#F59E0B" />
              </View>
              <Text style={[styles.statValue, styles.statValueRemaining]}>
                {productsSummary.total_quantity - Math.max(productsSummary.warehouse_checked_quantity, productsSummary.driver_checked_quantity)}
              </Text>
              <Text style={styles.statLabel}>Үлдсэн</Text>
            </View>
          </View>
        )}
        
        {/* Order Stats Summary */}
        {data && (
          <View style={styles.orderStatsContainer}>
            <Text style={styles.orderStatsTitle}>Падаан ({data.total_count})</Text>
            <View style={styles.orderStatsRow}>
              <View style={styles.orderStatBadge}>
                <Text style={styles.orderStatValue}>{data.status_counts.assigned_to_driver || 0}</Text>
                <Text style={styles.orderStatLabel}>Хүлээгдэж</Text>
              </View>
              <View style={[styles.orderStatBadge, styles.orderStatBadgeBlue]}>
                <Text style={[styles.orderStatValue, styles.orderStatValueBlue]}>
                  {(data.status_counts.warehouse_checking || 0) + (data.status_counts.warehouse_checked || 0)}
                </Text>
                <Text style={styles.orderStatLabel}>Нярав</Text>
              </View>
              <View style={[styles.orderStatBadge, styles.orderStatBadgeGreen]}>
                <Text style={[styles.orderStatValue, styles.orderStatValueGreen]}>{data.status_counts.driver_checking || 0}</Text>
                <Text style={styles.orderStatLabel}>Түгээгч</Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Complete Checking Button - Move to LOADED status */}
        {productsSummary && productsSummary.total_quantity > 0 && (
          <View style={styles.completeButtonContainer}>
            <TouchableOpacity
              style={[
                styles.completeButton,
                isFullyChecked && styles.completeButtonReady,
                completing && styles.completeButtonDisabled,
              ]}
              onPress={() => handleCompleteChecking(false)}
              disabled={completing}
              activeOpacity={0.8}
            >
              {completing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Truck size={20} color="#FFFFFF" />
                  <View style={styles.completeButtonTextContainer}>
                    <Text style={styles.completeButtonText}>
                      Тулгалт дуусгах → Ачилт
                    </Text>
                    <Text style={styles.completeButtonSubtext}>
                      {isFullyChecked 
                        ? '✓ Бүх бараа тулгагдсан'
                        : `${checkProgress}% тулгагдсан`
                      }
                    </Text>
                  </View>
                  <ArrowRight size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  packageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  packageTitle: {
    fontSize: 18,
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
  methodsContainer: {
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#6B7280',
    marginBottom: 4,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  methodIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodContent: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontFamily: 'GIP-Bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 13,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginBottom: 8,
  },
  methodBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
  },
  badgeOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  badgeTextOutline: {
    fontSize: 11,
    fontFamily: 'GIP-Medium',
    color: '#9CA3AF',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'GIP-Bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  statIconRow: {
    marginBottom: 4,
  },
  statValueWarehouse: {
    color: '#2563EB',
    fontSize: 18,
  },
  statValueDriver: {
    color: '#e17100',
    fontSize: 18,
  },
  statValueRemaining: {
    color: '#F59E0B',
    fontSize: 18,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  // Order Stats Container
  orderStatsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  orderStatsTitle: {
    fontSize: 12,
    fontFamily: 'GIP-SemiBold',
    color: '#6B7280',
    marginBottom: 8,
  },
  orderStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  orderStatBadge: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  orderStatBadgeBlue: {
    backgroundColor: '#EFF6FF',
  },
  orderStatBadgeGreen: {
    backgroundColor: '#ECFDF5',
  },
  orderStatValue: {
    fontSize: 18,
    fontFamily: 'GIP-Bold',
    color: '#374151',
  },
  orderStatValueBlue: {
    color: '#2563EB',
  },
  orderStatValueGreen: {
    color: '#e17100',
  },
  orderStatLabel: {
    fontSize: 10,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
    marginTop: 2,
  },
  // Check progress styles
  checkProgressContainer: {
    marginTop: 8,
    marginBottom: 8,
    gap: 6,
  },
  checkProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkProgressLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 60,
  },
  checkProgressLabelText: {
    fontSize: 10,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
  },
  checkProgressLabelWarehouse: {
    color: '#2563EB',
  },
  checkProgressLabelDriver: {
    color: '#e17100',
  },
  progressBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressBarWarehouse: {
    backgroundColor: '#2563EB',
  },
  progressBarDriver: {
    backgroundColor: '#e17100',
  },
  checkProgressCount: {
    fontSize: 10,
    fontFamily: 'GIP-SemiBold',
    color: '#6B7280',
    minWidth: 55,
    textAlign: 'right',
  },
  checkProgressCountWarehouse: {
    color: '#1E40AF',
  },
  checkProgressCountDriver: {
    color: '#047857',
  },
  checkProgressComplete: {
    color: '#e17100',
  },
  checkProgressCompleteWarehouse: {
    color: '#1D4ED8',
  },
  checkProgressCompleteDriver: {
    color: '#e17100',
  },
  // Complete Checking Button
  completeButtonContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  completeButtonReady: {
    backgroundColor: '#e17100',
    shadowColor: '#e17100',
  },
  completeButtonDisabled: {
    opacity: 0.7,
  },
  completeButtonTextContainer: {
    flex: 1,
  },
  completeButtonText: {
    fontSize: 16,
    fontFamily: 'GIP-Bold',
    color: '#FFFFFF',
  },
  completeButtonSubtext: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
});
