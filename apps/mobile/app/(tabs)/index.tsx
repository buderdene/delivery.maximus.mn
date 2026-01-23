import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  TrendingUp, 
  ShoppingCart, 
  Users, 
  Package,
  ArrowRight,
  Wallet,
  CalendarDays,
  Boxes,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/auth-store';
import { Box, VStack, HStack, Text, Heading, Card, Pressable } from '../../components/ui';
import { getOrders, type Order } from '../../services/api';

// Quick Action Button
function QuickAction({ icon: Icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickActionIcon}>
        <Icon size={24} color="#2563EB" />
      </View>
      <Text size="sm" className="text-typography-700 mt-2 text-center">{label}</Text>
    </Pressable>
  );
}

// Today Stats Card - Compact design
function TodayStatCard({ 
  title, 
  value, 
  icon: Icon, 
  color,
  subtitle,
}: { 
  title: string;
  value: string;
  icon: any;
  color: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.todayStatCard}>
      <View style={[styles.todayIconContainer, { backgroundColor: color + '15' }]}>
        <Icon size={20} color={color} />
      </View>
      <VStack style={{ flex: 1, marginLeft: 12 }}>
        <Text size="xs" style={{ fontFamily: 'GIP-Regular', color: '#6B7280' }}>{title}</Text>
        <Text size="lg" style={{ fontFamily: 'GIP-Bold', color: '#111827' }}>{value}</Text>
        {subtitle && (
          <Text size="xs" style={{ fontFamily: 'GIP-Regular', color: '#9CA3AF' }}>{subtitle}</Text>
        )}
      </VStack>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, erpDetails } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Today's order statistics
  const [todayStats, setTodayStats] = useState({
    totalOrders: 0,
    uniquePartners: 0,
    totalAmount: 0,
    totalProductTypes: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  const fetchTodayOrders = useCallback(async () => {
    const username = erpDetails?.[0]?.username;
    if (!username) {
      setIsLoading(false);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Fetch all active orders for today
      const result = await getOrders({
        page: 1,
        pageSize: 100, // Get all today's orders
        username,
        startDate: today,
        endDate: today,
        tabName: 'active',
      });

      if (result.success && result.data) {
        const orders = result.data;
        
        // Calculate statistics
        const uniquePartnerIds = new Set(orders.map(o => o.companyId));
        const totalAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0);
        
        // Count unique product types across all orders
        const uniqueProductIds = new Set<string>();
        orders.forEach(order => {
          order.products?.forEach(product => {
            uniqueProductIds.add(product.uuid);
          });
        });

        setTodayStats({
          totalOrders: orders.length,
          uniquePartners: uniquePartnerIds.size,
          totalAmount,
          totalProductTypes: uniqueProductIds.size,
        });

        // Set recent orders (latest 5)
        setRecentOrders(orders.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to fetch today orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [erpDetails]);

  useEffect(() => {
    fetchTodayOrders();
  }, [fetchTodayOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTodayOrders();
    setRefreshing(false);
  }, [fetchTodayOrders]);

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `₮${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `₮${(amount / 1000).toFixed(0)}K`;
    }
    return `₮${amount.toLocaleString()}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 60) return `${diffMins} минутын өмнө`;
    if (diffHours < 24) return `${diffHours} цагийн өмнө`;
    return dateString;
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Section with Products Button */}
      <Box className="px-4 pt-4 pb-6 bg-primary-600">
        <HStack style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <VStack space="xs" style={{ flex: 1 }}>
            <Text size="md" className="text-white opacity-80">Тавтай морил 👋</Text>
            <Heading size="xl" className="text-white">{user?.name || 'Хэрэглэгч'}</Heading>
          </VStack>
          
          {/* Products Button */}
          <TouchableOpacity 
            style={styles.productsButton}
            onPress={() => router.push('/products')}
            activeOpacity={0.8}
          >
            <Boxes size={20} color="#2563EB" />
            <Text style={styles.productsButtonText}>Бараа</Text>
          </TouchableOpacity>
        </HStack>
      </Box>

      {/* Today's Stats Section */}
      <View style={styles.todayStatsContainer}>
        <HStack style={{ alignItems: 'center', marginBottom: 16, gap: 8 }}>
          <CalendarDays size={20} color="#F59E0B" />
          <Text size="md" style={{ fontFamily: 'GIP-SemiBold', color: '#111827' }}>
            Өнөөдрийн борлуулалт
          </Text>
        </HStack>
        
        {isLoading ? (
          <View style={{ alignItems: 'center', padding: 20 }}>
            <ActivityIndicator color="#2563EB" />
          </View>
        ) : (
          <View style={styles.todayStatsGrid}>
            <TodayStatCard
              title="Захиалга"
              value={todayStats.totalOrders.toString()}
              icon={ShoppingCart}
              color="#2563EB"
              subtitle="Нийт захиалга"
            />
            <TodayStatCard
              title="Харилцагч"
              value={todayStats.uniquePartners.toString()}
              icon={Users}
              color="#8B5CF6"
              subtitle="Давхцаагүй"
            />
            <TodayStatCard
              title="Нийт дүн"
              value={formatAmount(todayStats.totalAmount)}
              icon={Wallet}
              color="#f59e0b"
              subtitle="Борлуулалт"
            />
            <TodayStatCard
              title="Бараа төрөл"
              value={todayStats.totalProductTypes.toString()}
              icon={Package}
              color="#F59E0B"
              subtitle="Давхцаагүй"
            />
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <HStack className="justify-between items-center mb-4 px-4">
          <Heading size="md" className="text-typography-900">Түргэн үйлдэл</Heading>
          <Pressable>
            <HStack space="xs" className="items-center">
              <Text size="sm" className="text-primary-600">Бүгдийг харах</Text>
              <ArrowRight size={16} color="#2563EB" />
            </HStack>
          </Pressable>
        </HStack>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsScroll}>
          <QuickAction icon={ShoppingCart} label="Шинэ захиалга" onPress={() => {}} />
          <QuickAction icon={Users} label="Харилцагч" onPress={() => {}} />
          <QuickAction icon={Package} label="Бараа хайх" onPress={() => {}} />
          <QuickAction icon={TrendingUp} label="Тайлан" onPress={() => {}} />
        </ScrollView>
      </View>

      {/* Recent Orders */}
      <View style={styles.section}>
        <Heading size="md" className="text-typography-900 mb-4 px-4">Сүүлийн захиалгууд</Heading>
        <VStack space="sm" className="px-4">
          {isLoading ? (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <ActivityIndicator color="#2563EB" />
            </View>
          ) : recentOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <ShoppingCart size={32} color="#9CA3AF" />
              <Text size="sm" style={{ fontFamily: 'GIP-Regular', color: '#6B7280', marginTop: 8 }}>
                Өнөөдөр захиалга байхгүй
              </Text>
            </View>
          ) : (
            recentOrders.map((order, index) => (
              <View key={order.uuid || index} style={styles.activityItem}>
                <View style={[styles.activityDot, { backgroundColor: order.status === 'Pending' ? '#F59E0B' : '#f59e0b' }]} />
                <VStack className="flex-1 ml-3">
                  <HStack style={{ alignItems: 'center', gap: 8 }}>
                    <Text size="sm" style={{ fontFamily: 'GIP-SemiBold', color: '#111827' }}>
                      {order.orderCode}
                    </Text>
                    <View style={{ 
                      backgroundColor: order.status === 'Pending' ? '#FEF3C7' : '#FEF3C7', 
                      paddingHorizontal: 6, 
                      paddingVertical: 2, 
                      borderRadius: 4 
                    }}>
                      <Text size="xs" style={{ 
                        fontFamily: 'GIP-Medium', 
                        color: order.status === 'Pending' ? '#92400E' : '#065F46' 
                      }}>
                        {order.status === 'Pending' ? 'Хүлээгдэж буй' : order.status}
                      </Text>
                    </View>
                  </HStack>
                  <Text size="xs" style={{ fontFamily: 'GIP-Regular', color: '#6B7280' }} numberOfLines={1}>
                    {order.companyName}
                  </Text>
                </VStack>
                <Text size="sm" style={{ fontFamily: 'GIP-SemiBold', color: '#f59e0b' }}>
                  ₮{order.totalAmount?.toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </VStack>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  todayStatsContainer: {
    marginTop: -20,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  todayStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  todayStatCard: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
  },
  todayIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginTop: 24,
  },
  quickActionsScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  quickAction: {
    width: 80,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f59e0b',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
  },
  productsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  productsButtonText: {
    fontSize: 13,
    fontFamily: 'GIP-SemiBold',
    color: '#2563EB',
  },
});
