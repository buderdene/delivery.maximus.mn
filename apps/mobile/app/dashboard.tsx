/**
 * DASHBOARD ДЭЛГЭЦ
 * 
 * Борлуулалтын менежерийн үндсэн dashboard:
 * - Өнөөдрийн болон сарын статистик
 * - Зорилтын биелэлт
 * - Түргэн үйлдлүүд
 * 
 * Flutter дизайн загвартай - StyleSheet ашигласан
 */

import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TrendingUp,
  Users,
  ShoppingCart,
  Package,
  Calendar,
  Clock,
  ChevronRight,
  Bell,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Truck,
  Gift,
} from 'lucide-react-native';
import { useAuthStore } from '../stores/auth-store';
import { Box, VStack, HStack, Text, Heading } from '../components/ui';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Dashboard Statistics Interface
interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  todayVisits: number;
  todayNewPartners: number;
  monthSales: number;
  monthOrders: number;
  monthTarget: number;
  monthProgress: number;
  salesGrowth: number;
  ordersGrowth: number;
}

// Quick Action Interface
interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  bgColor: string;
  route: string;
  badge?: number;
}

// Өнөөдрийн ажлууд
interface TodayTask {
  id: string;
  title: string;
  status: 'completed' | 'pending' | 'overdue';
  time?: string;
  partner?: string;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user, erpDetails, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayOrders: 0,
    todayVisits: 0,
    todayNewPartners: 0,
    monthSales: 0,
    monthOrders: 0,
    monthTarget: 100000000,
    monthProgress: 0,
    salesGrowth: 0,
    ordersGrowth: 0,
  });

  // Түргэн үйлдлүүд
  const quickActions: QuickAction[] = [
    {
      id: 'partners',
      title: 'Харилцагч',
      subtitle: 'Жагсаалт үзэх',
      icon: Users,
      color: '#2563EB',
      bgColor: '#EFF6FF',
      route: '/partners',
    },
    {
      id: 'products',
      title: 'Бүтээгдэхүүн',
      subtitle: 'Каталог үзэх',
      icon: Package,
      color: '#7C3AED',
      bgColor: '#F3E8FF',
      route: '/products',
    },
    {
      id: 'orders',
      title: 'Захиалга',
      subtitle: 'Бүх захиалга',
      icon: ShoppingCart,
      color: '#e17100',
      bgColor: '#ECFDF5',
      route: '/(tabs)',
      badge: 5,
    },
    {
      id: 'route',
      title: 'Маршрут',
      subtitle: "Өнөөдрийн",
      icon: MapPin,
      color: '#EA580C',
      bgColor: '#FFF7ED',
      route: '/(tabs)',
    },
  ];

  // Өнөөдрийн ажлууд (mock)
  const todayTasks: TodayTask[] = [
    { id: '1', title: 'Номин супермаркет - Захиалга авах', status: 'completed', time: '09:30', partner: 'Номин' },
    { id: '2', title: 'Санко ХХК - Төлбөр цуглуулах', status: 'pending', time: '11:00', partner: 'Санко' },
    { id: '3', title: 'Оргил ХХК - Хүргэлт хийх', status: 'pending', time: '14:30', partner: 'Оргил' },
    { id: '4', title: 'Мандал дэлгүүр - Шинэ бүтээгдэхүүн танилцуулах', status: 'overdue', time: '16:00', partner: 'Мандал' },
  ];

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // TODO: API-аас бодит мэдээлэл татах
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setStats({
        todaySales: 4_520_000,
        todayOrders: 12,
        todayVisits: 8,
        todayNewPartners: 2,
        monthSales: 125_430_500,
        monthOrders: 156,
        monthTarget: 200_000_000,
        monthProgress: 62.7,
        salesGrowth: 14.2,
        ordersGrowth: 8.5,
      });
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000_000) {
      return `${(amount / 1_000_000_000).toFixed(1)}B₮`;
    }
    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(1)}M₮`;
    }
    if (amount >= 1_000) {
      return `${(amount / 1_000).toFixed(1)}K₮`;
    }
    return `${amount.toLocaleString()}₮`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Өглөөний мэнд';
    if (hour < 18) return 'Өдрийн мэнд';
    return 'Оройн мэнд';
  };

  const getCurrentDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    };
    return now.toLocaleDateString('mn-MN', options);
  };

  const getTaskStatusIcon = (status: TodayTask['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={18} color="#f59e0b" />;
      case 'pending':
        return <Clock size={18} color="#F59E0B" />;
      case 'overdue':
        return <AlertCircle size={18} color="#EF4444" />;
    }
  };

  const getTaskStatusColor = (status: TodayTask['status']) => {
    switch (status) {
      case 'completed':
        return '#DCFCE7';
      case 'pending':
        return '#FEF3C7';
      case 'overdue':
        return '#FEE2E2';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Ачаалж байна...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()} 👋</Text>
            <Text style={styles.userName}>{user?.name || 'Хэрэглэгч'}</Text>
            <Text style={styles.routeName}>{erpDetails?.[0]?.routeName || 'Маршрут'}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIconBtn}>
              <Bell size={22} color="#6B7280" />
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>3</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatarContainer} onPress={handleLogout}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Card */}
        <View style={styles.dateCard}>
          <Calendar size={16} color="#2563EB" />
          <Text style={styles.dateText}>{getCurrentDate()}</Text>
        </View>

        {/* Main Stats Card - Gradient */}
        <LinearGradient
          colors={['#2563EB', '#1D4ED8', '#1E40AF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.mainStatsCard}
        >
          {/* Total Sales */}
          <View style={styles.mainStatTop}>
            <View>
              <Text style={styles.mainStatLabel}>Сарын борлуулалт</Text>
              <Text style={styles.mainStatValue}>{formatCurrency(stats.monthSales)}</Text>
            </View>
            <View style={styles.growthBadge}>
              <TrendingUp size={14} color="#f59e0b" />
              <Text style={styles.growthText}>+{stats.salesGrowth}%</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Зорилт: {formatCurrency(stats.monthTarget)}</Text>
              <Text style={styles.progressPercent}>{stats.monthProgress.toFixed(1)}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.min(stats.monthProgress, 100)}%` }]} />
            </View>
          </View>

          {/* Bottom Stats */}
          <View style={styles.mainStatBottom}>
            <View style={styles.mainStatItem}>
              <Text style={styles.mainStatItemLabel}>Өнөөдөр</Text>
              <Text style={styles.mainStatItemValue}>{formatCurrency(stats.todaySales)}</Text>
            </View>
            <View style={styles.mainStatDivider} />
            <View style={styles.mainStatItem}>
              <Text style={styles.mainStatItemLabel}>Захиалга</Text>
              <Text style={styles.mainStatItemValue}>{stats.monthOrders}</Text>
            </View>
            <View style={styles.mainStatDivider} />
            <View style={styles.mainStatItem}>
              <Text style={styles.mainStatItemLabel}>Зочилсон</Text>
              <Text style={styles.mainStatItemValue}>{stats.todayVisits}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Today's Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
            <View style={[styles.statIconBox, { backgroundColor: '#DBEAFE' }]}>
              <ShoppingCart size={20} color="#2563EB" />
            </View>
            <Text style={styles.statCardValue}>{stats.todayOrders}</Text>
            <Text style={styles.statCardLabel}>Өнөөдрийн захиалга</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#F3E8FF' }]}>
            <View style={[styles.statIconBox, { backgroundColor: '#E9D5FF' }]}>
              <MapPin size={20} color="#7C3AED" />
            </View>
            <Text style={styles.statCardValue}>{stats.todayVisits}</Text>
            <Text style={styles.statCardLabel}>Зочилсон</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#ECFDF5' }]}>
            <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Users size={20} color="#e17100" />
            </View>
            <Text style={styles.statCardValue}>{stats.todayNewPartners}</Text>
            <Text style={styles.statCardLabel}>Шинэ харилцагч</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <View style={[styles.statIconBox, { backgroundColor: '#FDE68A' }]}>
              <Gift size={20} color="#D97706" />
            </View>
            <Text style={styles.statCardValue}>+{stats.ordersGrowth}%</Text>
            <Text style={styles.statCardLabel}>Өсөлт</Text>
          </View>
        </View>

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Түргэн үйлдлүүд</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Бүгд</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <TouchableOpacity
                  key={action.id}
                  style={styles.quickActionCard}
                  onPress={() => router.push(action.route as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: action.bgColor }]}>
                    <Icon size={24} color={action.color} />
                    {action.badge && (
                      <View style={styles.quickActionBadge}>
                        <Text style={styles.quickActionBadgeText}>{action.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.quickActionTitle}>{action.title}</Text>
                  <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Today's Tasks Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Өнөөдрийн ажлууд</Text>
            <TouchableOpacity style={styles.seeAllBtn}>
              <Text style={styles.seeAllText}>Бүгд</Text>
              <ChevronRight size={16} color="#2563EB" />
            </TouchableOpacity>
          </View>

          <View style={styles.tasksList}>
            {todayTasks.map((task, index) => (
              <TouchableOpacity key={task.id} style={styles.taskItem} activeOpacity={0.7}>
                <Text style={styles.taskIndex}>{index + 1}</Text>
                <View style={[styles.taskStatusIcon, { backgroundColor: getTaskStatusColor(task.status) }]}>
                  {getTaskStatusIcon(task.status)}
                </View>
                <View style={styles.taskContent}>
                  <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                  <HStack space="sm" className="items-center mt-1">
                    <Clock size={12} color="#9CA3AF" />
                    <Text style={styles.taskTime}>{task.time}</Text>
                  </HStack>
                </View>
                <ChevronRight size={18} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Warehouse Info Card */}
        {erpDetails?.[0]?.warehouses && erpDetails[0].warehouses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Агуулах</Text>
            <View style={styles.warehouseCard}>
              <View style={[styles.iconBox, { backgroundColor: '#DBEAFE' }]}>
                <Truck size={20} color="#2563EB" />
              </View>
              <View style={styles.warehouseContent}>
                <Text style={styles.warehouseName}>
                  {erpDetails[0].warehouses.find(w => w.isdefault)?.name || erpDetails[0].warehouses[0]?.name}
                </Text>
                <Text style={styles.warehouseCount}>
                  {erpDetails[0].warehouses.length} агуулах холбогдсон
                </Text>
              </View>
              <ChevronRight size={18} color="#9CA3AF" />
            </View>
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  userName: {
    fontSize: 22,
    fontFamily: 'GIP-Bold',
    color: '#111827',
    marginTop: 2,
  },
  routeName: {
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#2563EB',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    fontSize: 10,
    fontFamily: 'GIP-Bold',
    color: '#FFFFFF',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontFamily: 'GIP-Bold',
    color: '#FFFFFF',
  },

  // Date Card
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  dateText: {
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#374151',
  },

  // Main Stats Card
  mainStatsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  mainStatTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  mainStatLabel: {
    fontSize: 14,
    fontFamily: 'GIP-Regular',
    color: 'rgba(255,255,255,0.8)',
  },
  mainStatValue: {
    fontSize: 28,
    fontFamily: 'GIP-Bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  growthText: {
    fontSize: 13,
    fontFamily: 'GIP-SemiBold',
    color: '#f59e0b',
  },
  progressSection: {
    marginTop: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: 'rgba(255,255,255,0.7)',
  },
  progressPercent: {
    fontSize: 12,
    fontFamily: 'GIP-Bold',
    color: '#FFFFFF',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 4,
  },
  mainStatBottom: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  mainStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  mainStatItemLabel: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: 'rgba(255,255,255,0.7)',
  },
  mainStatItemValue: {
    fontSize: 18,
    fontFamily: 'GIP-Bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  mainStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 8,
  },
  statCard: {
    width: (SCREEN_WIDTH - 32 - 24) / 2,
    marginHorizontal: 6,
    marginBottom: 12,
    borderRadius: 14,
    padding: 16,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statCardValue: {
    fontSize: 22,
    fontFamily: 'GIP-Bold',
    color: '#111827',
  },
  statCardLabel: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginTop: 4,
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#2563EB',
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  quickActionCard: {
    width: (SCREEN_WIDTH - 32 - 24) / 2,
    marginHorizontal: 6,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  quickActionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionBadgeText: {
    fontSize: 11,
    fontFamily: 'GIP-Bold',
    color: '#FFFFFF',
  },
  quickActionTitle: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },

  // Tasks List
  tasksList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  taskIndex: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#9CA3AF',
    width: 20,
  },
  taskStatusIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#111827',
  },
  taskTime: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#9CA3AF',
  },

  // Warehouse Card
  warehouseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warehouseContent: {
    flex: 1,
    marginLeft: 12,
  },
  warehouseName: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
  },
  warehouseCount: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
});
