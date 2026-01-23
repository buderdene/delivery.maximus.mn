/**
 * ЗАХИАЛГУУД ДЭЛГЭЦ
 * 
 * Flutter загвартай:
 * - Табууд: Өнөөдөр, Идэвхтэй, Түүх, Зочилсон
 * - Захиалгуудын жагсаалт
 * - Огноогоор бүлэглэсэн
 * 
 * API: POST /hs/or/Order
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ClipboardList, Building2, ChevronRight, Trash2, Gift,
  ImageIcon, Filter, AlertCircle, MapPin, Hash, Calendar, FileText, MessageSquare
} from 'lucide-react-native';
import { Box, VStack, HStack, Text, Heading } from '../../components/ui';
import { useAuthStore } from '../../stores/auth-store';
import { useVisitorStore } from '../../stores/visitor-store';
import { getOrders, type Order, type Visitor } from '../../services/api';

type TabType = 'today' | 'active' | 'history' | 'visited';

const TABS: { key: TabType; label: string }[] = [
  { key: 'today', label: 'Өнөөдөр' },
  { key: 'active', label: 'Идэвхтэй' },
  { key: 'history', label: 'Түүх' },
  { key: 'visited', label: 'Зочилсон' },
];

const PAGE_SIZE = 20;

export default function OrdersScreen() {
  const { user, erpDetails } = useAuthStore();
  const router = useRouter();

  // Visitor store
  const {
    visitors,
    isLoading: visitorsLoading,
    fetchVisitors,
  } = useVisitorStore();

  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Calculate dates based on tab
  const getDates = useCallback(() => {
    const endDate = new Date();
    const startDate = new Date();

    if (activeTab === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setMonth(startDate.getMonth() - 3);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }, [activeTab]);

  // Fetch orders
  const fetchOrders = useCallback(async (pageNum: number, isRefresh = false) => {
    const username = user?.username;
    if (!username) {
      setError('Username олдсонгүй');
      return;
    }

    if (pageNum === 1) {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }
    } else {
      setIsLoadingMore(true);
    }

    setError(null);

    const { startDate, endDate } = getDates();
    const tabName = activeTab === 'history' ? 'history' : 'active';

    const result = await getOrders({
      page: pageNum,
      pageSize: PAGE_SIZE,
      username,
      startDate,
      endDate,
      tabName,
    });

    if (result.success && result.data) {
      let newOrders = result.data;

      // Filter for today if needed
      if (activeTab === 'today') {
        const today = new Date().toISOString().split('T')[0];
        newOrders = newOrders.filter(o => o.date.startsWith(today));
      }

      if (pageNum === 1) {
        setOrders(newOrders);
      } else {
        setOrders(prev => [...prev, ...newOrders]);
      }

      setTotalCount(result.totalRecords || 0);
      setHasMore(newOrders.length === PAGE_SIZE);
    } else {
      setError(result.error || 'Захиалгууд татахад алдаа');
    }

    setIsLoading(false);
    setIsLoadingMore(false);
    setRefreshing(false);
  }, [user, erpDetails, activeTab, getDates]);

  // Fetch visitors for 'visited' tab
  const fetchVisitorsData = useCallback(async (isRefresh = false) => {
    const routeId = erpDetails?.[0]?.routeId;
    if (!routeId) {
      setError('Route ID олдсонгүй');
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    await fetchVisitors(routeId);

    setIsLoading(false);
    setRefreshing(false);
  }, [erpDetails, fetchVisitors]);

  // Initial fetch
  useEffect(() => {
    setPage(1);
    setOrders([]);
    setHasMore(true);

    if (activeTab === 'visited') {
      fetchVisitorsData();
    } else {
      fetchOrders(1);
    }
  }, [activeTab]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setPage(1);
    setHasMore(true);

    if (activeTab === 'visited') {
      fetchVisitorsData(true);
    } else {
      fetchOrders(1, true);
    }
  }, [activeTab, fetchOrders, fetchVisitorsData]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && !isLoading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchOrders(nextPage);
    }
  }, [isLoadingMore, hasMore, isLoading, page, fetchOrders]);

  // Check if scroll is near bottom
  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 100;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

    if (isCloseToBottom) {
      handleLoadMore();
    }
  }, [handleLoadMore]);

  // Group orders by date
  const groupedOrders = orders.reduce((groups, order) => {
    const date = order.date.split(' ')[0];
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(order);
    return groups;
  }, {} as Record<string, Order[]>);

  const sortedDates = Object.keys(groupedOrders).sort((a, b) => b.localeCompare(a));

  // Tab animation
  const tabWidth = (Dimensions.get('window').width - 80) / TABS.length; // 40px margin each side
  const translateX = useRef(new Animated.Value(TABS.findIndex(t => t.key === activeTab) * tabWidth)).current;

  useEffect(() => {
    const index = TABS.findIndex(t => t.key === activeTab);
    Animated.spring(translateX, {
      toValue: index * tabWidth,
      useNativeDriver: true,
      tension: 68,
      friction: 10,
    }).start();
  }, [activeTab, tabWidth]);

  return (
    <Box className="flex-1 bg-background-50">
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {/* Animated indicator */}
        <Animated.View
          style={[
            styles.tabIndicator,
            {
              width: tabWidth - 6,
              transform: [{ translateX }]
            }
          ]}
        />
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {activeTab === 'visited' ? 'Зочилсон бүртгэлийн мэдээлэл' : 'Сүүлийн 3 сарын борлуулалтын мэдээлэл'}
        </Text>
        <HStack className="items-center" space="sm">
          <Text style={styles.countText}>
            Нийт: <Text style={{ fontFamily: 'GIP-Bold' }}>
              {activeTab === 'visited' ? visitors.length : totalCount}
            </Text>
          </Text>
          <TouchableOpacity style={styles.filterButton}>
            <Filter size={18} color="#2563EB" />
          </TouchableOpacity>
        </HStack>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        onScroll={handleScroll}
        scrollEventThrottle={400}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563EB']}
            tintColor="#2563EB"
          />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading */}
        {(isLoading || (activeTab === 'visited' && visitorsLoading)) && (
          <Box className="flex-1 justify-center items-center py-20">
            <ActivityIndicator size="large" color="#2563EB" />
            <Text className="mt-4 text-typography-500">Ачаалж байна...</Text>
          </Box>
        )}

        {/* Error */}
        {error && !isLoading && !visitorsLoading && (
          <Box className="flex-1 justify-center items-center py-20">
            <AlertCircle size={48} color="#DC2626" />
            <Text className="mt-4 text-typography-500">{error}</Text>
          </Box>
        )}

        {/* Empty */}
        {!isLoading && !error && activeTab !== 'visited' && orders.length === 0 && (
          <Box className="flex-1 justify-center items-center py-20">
            <ClipboardList size={48} color="#9CA3AF" />
            <Text size="md" className="text-typography-500 mt-4">Захиалга олдсонгүй</Text>
          </Box>
        )}

        {/* Empty Visitors */}
        {!isLoading && !error && activeTab === 'visited' && visitors.length === 0 && (
          <Box className="flex-1 justify-center items-center py-20">
            <Building2 size={48} color="#9CA3AF" />
            <Text size="md" className="text-typography-500 mt-4">Зочилсон бүртгэл олдсонгүй</Text>
          </Box>
        )}

        {/* Visitors List */}
        {!isLoading && !error && activeTab === 'visited' && visitors.length > 0 && (
          <VStack className="px-4">
            {visitors.map((visitor, index) => (
              <View
                key={visitor.uuid || `visitor-${index}`}
                style={styles.visitorCard}
              >
                {/* Header Row */}
                <View style={styles.visitorHeader}>
                  <View style={styles.visitorIndex}>
                    <Text style={styles.visitorIndexText}>{index + 1}</Text>
                  </View>
                  <View style={styles.visitorHeaderContent}>
                    <Text style={styles.visitorCompanyName} numberOfLines={1}>
                      {visitor.customers || visitor.customerName || 'Харилцагч'}
                    </Text>
                    <View style={styles.visitorStatusBadge}>
                      <Text style={styles.visitorStatusText}>Зочилсон</Text>
                    </View>
                  </View>
                </View>

                {/* Info Rows */}
                <View style={styles.visitorInfoContainer}>
                  {/* Row 1: Дугаар + Огноо */}
                  <View style={styles.visitorInfoRow}>
                    {visitor.number && (
                      <View style={styles.visitorInfoItem}>
                        <Hash size={14} color="#9CA3AF" />
                        <Text style={styles.visitorInfoValue}>{visitor.number}</Text>
                      </View>
                    )}
                    <View style={styles.visitorInfoItem}>
                      <Calendar size={14} color="#9CA3AF" />
                      <Text style={styles.visitorInfoValue}>
                        {visitor.date || visitor.createdAt || '-'}
                      </Text>
                    </View>
                  </View>

                  {/* Row 2: Шалтгаан */}
                  {visitor.visitorDescriptionList && (
                    <View style={styles.visitorInfoRow}>
                      <View style={styles.visitorInfoItemFull}>
                        <FileText size={14} color="#D97706" />
                        <View style={styles.visitorReasonBadge}>
                          <Text style={styles.visitorReasonText}>
                            {visitor.visitorDescriptionList}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Row 3: Тайлбар */}
                  {visitor.visitorDescription && (
                    <View style={styles.visitorInfoRow}>
                      <View style={styles.visitorInfoItemFull}>
                        <MessageSquare size={14} color="#6B7280" />
                        <Text style={styles.visitorInfoValue}>
                          {visitor.visitorDescription}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Row 4: Байршил */}
                  {visitor.latitude && visitor.longitude && (
                    <View style={styles.visitorInfoRow}>
                      <View style={styles.visitorInfoItemFull}>
                        <MapPin size={14} color="#f59e0b" />
                        <Text style={styles.visitorLocationText}>
                          {visitor.latitude}, {visitor.longitude}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </VStack>
        )}

        {/* Orders List */}
        {!isLoading && !error && activeTab !== 'visited' && orders.length > 0 && (
          <VStack className="px-4">
            {sortedDates.map((date) => (
              <View key={date}>
                {/* Date Header */}
                <Text style={styles.dateHeader}>{date.replace(/-/g, ' · ')}</Text>

                {/* Orders for this date */}
                {groupedOrders[date].map((order, index) => {
                  // Calculate global index
                  let globalIndex = 0;
                  for (const d of sortedDates) {
                    if (d === date) {
                      globalIndex += index + 1;
                      break;
                    }
                    globalIndex += groupedOrders[d].length;
                  }

                  return (
                    <TouchableOpacity
                      key={`${order.uuid}-${date}-${index}`}
                      style={styles.orderItem}
                      onPress={() => router.push(`/order/${order.uuid}`)}
                      activeOpacity={0.7}
                    >
                      {/* Index */}
                      <Text style={styles.orderIndex}>{globalIndex}</Text>

                      {/* Image placeholder */}
                      <View style={styles.orderImage}>
                        <ImageIcon size={20} color="#9CA3AF" />
                      </View>

                      {/* Content */}
                      <View style={styles.orderContent}>
                        {/* Row 1: Company name + Status */}
                        <View style={styles.orderRow}>
                          <Text style={styles.companyName} numberOfLines={1}>
                            {order.companyName}
                          </Text>
                          <View style={[
                            styles.statusBadge,
                            order.status === 'draft' ? styles.statusDraft : styles.statusActive
                          ]}>
                            <Text style={[
                              styles.statusText,
                              order.status === 'draft' ? styles.statusTextDraft : styles.statusTextActive
                            ]}>
                              {order.status === 'draft' ? 'draft' : 'Борлуулалт үүссэн'}
                            </Text>
                          </View>
                        </View>

                        {/* Row 2: Order code + Product count */}
                        <View style={styles.orderRow}>
                          <Text style={styles.orderCode}>{order.orderCode}</Text>
                          <Text style={styles.productCount}>{order.products?.length || 0} төрөл</Text>
                        </View>

                        {/* Row 3: Badges */}
                        <View style={styles.orderRow}>
                          <HStack className="items-center" space="xs">
                            <View style={styles.warehouseBadge}>
                              <Building2 size={10} color="#6B7280" />
                              <Text style={styles.warehouseText}>{order.warehouseName}</Text>
                            </View>
                            {/* Delete Market */}
                            {order.deleteMarket && (
                              <View style={styles.deleteMarketBadge}>
                                <Trash2 size={10} color="#DC2626" />
                              </View>
                            )}
                            {/* Promo */}
                            {order.totalPromoPoint?.totalPromoAmount > 0 && (
                              <View style={styles.promoBadge}>
                                <Gift size={10} color="#F59E0B" />
                              </View>
                            )}
                          </HStack>
                        </View>
                      </View>

                      {/* Chevron */}
                      <ChevronRight size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {/* Load More Indicator */}
            {isLoadingMore && (
              <Box className="py-4 items-center">
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.loadingMoreText}>Ачаалж байна...</Text>
              </Box>
            )}

            {/* End of List */}
            {!hasMore && orders.length > 0 && (
              <Box className="py-4 items-center">
                <Text style={styles.endOfListText}>Бүх захиалга ачаалагдсан</Text>
              </Box>
            )}
          </VStack>
        )}
      </ScrollView>
    </Box>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 40,
    marginTop: 12,
    borderRadius: 10,
    padding: 3,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 3,
    left: 3,
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    zIndex: 1,
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#2563EB',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerText: {
    fontSize: 13,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  countText: {
    fontSize: 13,
    fontFamily: 'GIP-Regular',
    color: '#111827',
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  dateHeader: {
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  orderIndex: {
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#9CA3AF',
    width: 24,
  },
  orderImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orderContent: {
    flex: 1,
    marginRight: 8,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 15,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  orderCode: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  productCount: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  warehouseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  warehouseText: {
    fontSize: 10,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
    marginLeft: 3,
  },
  deleteMarketBadge: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoBadge: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: '#CCFBF1',
  },
  statusDraft: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'GIP-Medium',
  },
  statusTextActive: {
    color: '#0D9488',
  },
  statusTextDraft: {
    color: '#D97706',
  },
  loadingMoreText: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
  endOfListText: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#9CA3AF',
  },
  // Visitor Card Styles
  visitorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  visitorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  visitorIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  visitorIndexText: {
    fontSize: 12,
    fontFamily: 'GIP-Bold',
    color: '#FFFFFF',
  },
  visitorHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  visitorCompanyName: {
    fontSize: 15,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  visitorStatusBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  visitorStatusText: {
    fontSize: 11,
    fontFamily: 'GIP-Medium',
    color: '#f59e0b',
  },
  visitorInfoContainer: {
    gap: 8,
  },
  visitorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  visitorInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  visitorInfoItemFull: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  visitorInfoValue: {
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#374151',
  },
  visitorReasonBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  visitorReasonText: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#D97706',
  },
  visitorLocationText: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
});
