/**
 * ХАРИЛЦАГЧ ДЭЛГЭРЭНГҮЙ ДЭЛГЭЦ
 * 
 * Flutter дизайн загвартай:
 * - Табууд: Үндсэн, Бүтээгдэхүүн, Захиалгууд, Загвар
 * - Компанийн мэдээлэл карт
 * - Ангилал badge
 * 
 * ============================================================================
 * БИЗНЕС ЛОГИК
 * ============================================================================
 * 
 * 1. ЗАХИАЛГА ҮҮСГЭХ ТОВЧ
 *    - coordinateRange = 1 үед GPS шалгахгүй, шууд идэвхжинэ
 *    - coordinateRange != 1 үед routeRange дотор байвал идэвхжинэ
 *    - Товч дарахад: selectedPartner тохируулж, products руу шилжинэ
 * 
 * 2. ЗОЧИЛСОН ТОВЧ
 *    - Coordinate range дотор байвал идэвхжинэ
 *    - Дарахад зочилсон гэж тэмдэглэнэ
 * 
 * 3. ХАРИЛЦАГЧ СОЛИХ
 *    - Өөр харилцагч сонгоход сагс цэвэрлэгдэнэ (анхааруулга)
 * 
 * ============================================================================
 * 
 * API: /hs/cd/Companies/{companyId}?routeId={routeId}
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Linking, Platform, ActivityIndicator, Alert, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Location from 'expo-location';
import {
  ArrowLeft, MapPin, Phone, Mail, Building2, Navigation,
  Wallet, Clock, CreditCard, FileText, ShoppingCart, AlertCircle,
  Calendar, Hash, Route, ChevronRight, TrendingUp, Edit3,
  Package, ClipboardList, Layout, Home, ImageIcon, Landmark, Truck,
  Trash2, Gift, CheckCircle, XCircle, Plus, Minus
} from 'lucide-react-native';
import {
  Box, VStack, HStack, Text, Heading, Pressable,
  Button, ButtonText, Badge, BadgeText, Divider, Card
} from '../../components/ui';
import { usePartnerStore } from '../../stores/partner-store';
import { useAuthStore } from '../../stores/auth-store';
import { useCartStore, type SelectedPartner } from '../../stores/cart-store';
import { useWarehouseStore } from '../../stores/warehouse-store';
import { useTemplateStore } from '../../stores/template-store';
import { useVisitorStore } from '../../stores/visitor-store';
import { getPartnerDetail, getOrders, type PartnerDetail, type Order } from '../../services/api';
import * as Device from 'expo-device';
import { What3WordsIcon } from '../../components/icons/What3WordsIcon';

// Tab types
type TabType = 'basic' | 'products' | 'orders' | 'template';

const TABS: { key: TabType; label: string; icon: any }[] = [
  { key: 'basic', label: 'Үндсэн', icon: Home },
  { key: 'products', label: 'Бүтээгдэхүүн', icon: Package },
  { key: 'orders', label: 'Захиалгууд', icon: ClipboardList },
  { key: 'template', label: 'Загвар', icon: Layout },
];

// Info Row Component
function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <HStack className="py-2">
      <Text size="sm" className="text-typography-500 w-36">{label}:</Text>
      <Text size="sm" className="text-typography-900 flex-1">{value}</Text>
    </HStack>
  );
}

export default function PartnerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { selectedPartner } = usePartnerStore();
  const { erpDetails, user } = useAuthStore();

  // Cart store - харилцагч сонгох
  const {
    selectedPartner: cartPartner,
    setSelectedPartner: setCartPartner,
    hasPartner: hasCartPartner,
    itemCount: cartItemCount,
    addItem: addToCart,
  } = useCartStore();

  // Warehouse store - routeRange авах
  const { getRouteRange } = useWarehouseStore();

  // Visitor store - зочилсон баримт
  const {
    isPartnerVisitedToday,
    markAsVisited,
    isCreating: visitorCreating,
    fetchVisitors,
  } = useVisitorStore();

  // Template store - загвар бараа
  const {
    templates,
    isLoading: templatesLoading,
    isInitialized: templatesInitialized,
    initDatabase,
    loadTemplates,
    removeFromTemplate,
    updateQuantity,
    clearTemplate,
  } = useTemplateStore();

  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [partnerDetail, setPartnerDetail] = useState<PartnerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // ============================================================================
  // БИЗНЕС ЛОГИК: Coordinate Range шалгалт
  // ============================================================================
  /**
   * isWithinRange: Харилцагчийн байршилд хүрсэн эсэх
   * 
   * БИЗНЕС ЛОГИК:
   * - coordinateRange = 1 → GPS шалгахгүй, шууд true
   * - Тухайн өдөр зочилсон бол (isRight=true) → GPS шалгахгүй, шууд true
   * - coordinateRange != 1 → routeRange (метр) дотор байвал true
   */
  const isWithinRange = (): boolean => {
    // coordinateRange = 1 бол GPS шалгахгүй
    if (partnerDetail?.coordinateRange === 1) {
      return true;
    }

    // Тухайн өдөр зочилсон бол GPS шалгахгүй (isRight = true)
    if (partnerDetail?.id && isPartnerVisitedToday(partnerDetail.id)) {
      return true;
    }

    // GPS-р шалгах
    if (!userLocation || !partnerDetail?.latitude || !partnerDetail?.longitude) {
      return false;
    }

    const routeRange = getRouteRange(); // метрээр (default: 2000)
    const distanceInMeters = (distance || 0) * 1000; // км → метр

    return distanceInMeters <= routeRange;
  };

  /**
   * canCreateOrderRemotely: Зайнаас захиалга үүсгэж болох эсэх
   * 
   * БИЗНЕС ЛОГИК:
   * - coordinateRange = 1 → true
   * - Тухайн өдөр зочилсон бол → true
   * - Бусад → range дотор байвал true
   */
  const canCreateOrderRemotely = (): boolean => {
    if (partnerDetail?.coordinateRange === 1) {
      return true;
    }
    if (partnerDetail?.id && isPartnerVisitedToday(partnerDetail.id)) {
      return true;
    }
    return isWithinRange();
  };

  // Orders tab state
  const [ordersTab, setOrdersTab] = useState<'active' | 'history'>('active');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  // Initialize template database
  useEffect(() => {
    if (!templatesInitialized) {
      initDatabase();
    }
  }, [templatesInitialized, initDatabase]);

  // Load templates when tab changes to template or when partner changes
  useEffect(() => {
    if (templatesInitialized && id && activeTab === 'template') {
      loadTemplates(id);
    }
  }, [templatesInitialized, id, activeTab, loadTemplates]);

  // Fetch partner detail from API
  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;

      const routeId = erpDetails?.[0]?.routeId;
      if (!routeId) {
        setError('RouteId олдсонгүй');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const result = await getPartnerDetail(id, routeId);

      if (result.success && result.data) {
        setPartnerDetail(result.data);
        setError(null);
      } else {
        setError(result.error || 'Харилцагч татахад алдаа');
      }
      setIsLoading(false);
    };

    fetchDetail();
  }, [id, erpDetails]);

  // Calculate distance
  useEffect(() => {
    const getDistance = async () => {
      if (partnerDetail?.latitude && partnerDetail?.longitude) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });

            // Хэрэглэгчийн байршил хадгалах
            setUserLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });

            const dist = calculateDistance(
              location.coords.latitude,
              location.coords.longitude,
              partnerDetail.latitude,
              partnerDetail.longitude
            );
            setDistance(dist);
          }
        } catch (err) {
          console.log('Location error:', err);
        }
      }
    };
    getDistance();
  }, [partnerDetail]);

  // Fetch orders when orders tab is active
  useEffect(() => {
    const fetchOrders = async () => {
      if (activeTab !== 'orders' || !id) return;

      const currentUsername = user?.username;
      if (!currentUsername) {
        setOrdersError('Username олдсонгүй');
        return;
      }

      setOrdersLoading(true);
      setOrdersError(null);

      // Сүүлийн 3 сарын огноо
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);

      const result = await getOrders({
        page: 1,
        pageSize: 50,
        username: currentUsername,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        tabName: ordersTab,
        companyId: id,
      });

      if (result.success && result.data) {
        setOrders(result.data);
      } else {
        setOrdersError(result.error || 'Захиалгууд татахад алдаа');
      }
      setOrdersLoading(false);
    };

    fetchOrders();
  }, [activeTab, ordersTab, id, user, erpDetails]);

  /**
   * Haversine формула ашиглан хоёр цэгийн хоорондох зайг км-ээр тооцоолох
   */
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  /**
   * Утасны дугаар руу залгах
   * Олон утасны дугаар байвал эхнийхийг ашиглана
   */
  const handleCall = (phoneNumber?: string) => {
    const phone = phoneNumber || partnerDetail?.phoneNumbers?.[0];
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  /**
   * Газрын зураг дээр байршлыг нээх
   * iOS: Apple Maps, Android: Google Maps
   */
  const handleNavigate = () => {
    if (partnerDetail?.latitude && partnerDetail?.longitude) {
      const url = Platform.select({
        ios: `maps:0,0?q=${partnerDetail.latitude},${partnerDetail.longitude}`,
        android: `geo:0,0?q=${partnerDetail.latitude},${partnerDetail.longitude}(${partnerDetail.name})`,
      });
      if (url) Linking.openURL(url);
    }
  };

  /**
   * What3Words линк нээх
   */
  const openW3W = () => {
    if (partnerDetail?.what3words) {
      Linking.openURL(`https://what3words.com/${partnerDetail.what3words}`);
    }
  };

  /**
   * Мөнгөн дүнг форматлах
   */
  const formatBalance = (balance?: number | null) => {
    if (!balance) return '0₮';
    return balance.toLocaleString() + '₮';
  };

  // ============================================================================
  // БИЗНЕС ЛОГИК: Захиалга үүсгэх
  // ============================================================================
  /**
   * handleCreateOrder: "Захиалга үүсгэх" товч дарсан үед
   * 
   * БИЗНЕС ЛОГИК:
   * 1. Coordinate range шалгах (coordinateRange=1 эсвэл зочилсон бол шалгахгүй)
   * 2. Өөр харилцагч сонгосон бол сагс цэвэрлэх анхааруулга
   * 3. selectedPartner тохируулж products руу шилжих
   */
  const handleCreateOrder = () => {
    if (!partnerDetail) return;

    // Range шалгалт (зочилсон бол зайнаас ч захиалга үүсгэж болно)
    if (!canCreateOrderRemotely()) {
      // Зочилсон эсэхийг нэмэлт мессежид оруулах
      const visitHint = partnerDetail.coordinateRange !== 1
        ? '\n\nЭсвэл "Зочилсон" товч дарж тэмдэглээд зайнаас захиалга үүсгэж болно.'
        : '';

      Alert.alert(
        'Зай хол байна',
        `Та харилцагчийн байршилд хүрээгүй байна. Ойртсоны дараа захиалга үүсгэнэ үү.${visitHint}`,
        [{ text: 'Ойлголоо' }]
      );
      return;
    }

    // Өөр харилцагч сонгоход анхааруулга
    if (hasCartPartner && cartPartner?.id !== partnerDetail.id && cartItemCount > 0) {
      Alert.alert(
        'Харилцагч солих',
        `Та "${cartPartner?.name}" харилцагчид ${cartItemCount} бараа сагсласан байна.\n\nӨөр харилцагч сонгоход сагс цэвэрлэгдэх болно.`,
        [
          { text: 'Үгүй', style: 'cancel' },
          {
            text: 'Тийм, солих',
            style: 'destructive',
            onPress: () => selectPartnerAndNavigate(),
          },
        ]
      );
      return;
    }

    selectPartnerAndNavigate();
  };

  /**
   * selectPartnerAndNavigate: Харилцагч сонгоод products руу шилжих
   */
  const selectPartnerAndNavigate = () => {
    if (!partnerDetail) return;

    const partner: SelectedPartner = {
      id: partnerDetail.id,
      name: partnerDetail.name,
      phone: partnerDetail.phoneNumbers?.[0] || null,
      address: partnerDetail.address || null,
      latitude: partnerDetail.latitude || null,
      longitude: partnerDetail.longitude || null,
      coordinateRange: partnerDetail.coordinateRange || null,
      totalDiscountAmount: partnerDetail.totalDiscountAmount || null,
    };

    setCartPartner(partner);
    router.push('/products');
  };

  /**
   * handleVisit: "Зочилсон" товч дарсан үед
   * 
   * БИЗНЕС ЛОГИК:
   * - Coordinate range дотор байвал зочилсон гэж тэмдэглэнэ
   * - API дуудаж visitor баримт үүсгэнэ
   * - Амжилттай бол тухайн өдөр зайнаас захиалга үүсгэж болно
   */
  const handleVisit = async () => {
    // Зочилсон эсэхийг шалгахдаа range-г зөвхөн GPS-р шалгана
    // (isPartnerVisitedToday дахин шалгахгүй)
    const checkRangeForVisit = (): boolean => {
      if (partnerDetail?.coordinateRange === 1) {
        return true;
      }
      if (!userLocation || !partnerDetail?.latitude || !partnerDetail?.longitude) {
        return false;
      }
      const routeRange = getRouteRange();
      const distanceInMeters = (distance || 0) * 1000;
      return distanceInMeters <= routeRange;
    };

    if (!checkRangeForVisit()) {
      Alert.alert(
        'Зай хол байна',
        'Та харилцагчийн байршилд хүрээгүй байна.',
        [{ text: 'Ойлголоо' }]
      );
      return;
    }

    // Аль хэдийн зочилсон эсэхийг шалгах
    if (partnerDetail?.id && isPartnerVisitedToday(partnerDetail.id)) {
      Alert.alert(
        'Зочилсон',
        'Та өнөөдөр энэ харилцагч дээр аль хэдийн зочилсон байна.',
        [{ text: 'Ойлголоо' }]
      );
      return;
    }

    Alert.alert(
      'Зочилсон',
      `"${partnerDetail?.name}" харилцагчид зочилсон гэж тэмдэглэх үү?`,
      [
        { text: 'Үгүй', style: 'cancel' },
        {
          text: 'Тийм',
          onPress: async () => {
            if (!partnerDetail || !userLocation) return;

            const routeId = erpDetails?.[0]?.routeId;
            if (!routeId) {
              Alert.alert('Алдаа', 'Route ID олдсонгүй');
              return;
            }

            // Device ID авах
            const deviceId = Device.modelId || Device.modelName || 'unknown';

            const result = await markAsVisited({
              customerId: partnerDetail.id,
              routeId: routeId,
              latitude: userLocation.latitude.toString(),
              longitude: userLocation.longitude.toString(),
              imei: deviceId,
              visitorDescription: 'Зочилсон',
            });

            if (result.success) {
              Alert.alert(
                'Амжилттай',
                'Зочилсон гэж тэмдэглэгдлээ.\n\nТа одоо зайнаас захиалга үүсгэх боломжтой.',
                [{ text: 'Ойлголоо' }]
              );
            } else {
              Alert.alert('Алдаа', result.error || 'Зочилсон тэмдэглэхэд алдаа гарлаа');
            }
          }
        },
      ]
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Box className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text className="mt-4 text-typography-500">Ачаалж байна...</Text>
        </Box>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !partnerDetail) {
    return (
      <SafeAreaView style={styles.container}>
        <Box className="flex-1 justify-center items-center px-6">
          <AlertCircle size={48} color="#DC2626" />
          <Heading size="lg" className="text-typography-700 mt-4">Алдаа гарлаа</Heading>
          <Text className="text-typography-500 text-center mt-2">
            {error || 'Харилцагч олдсонгүй'}
          </Text>
          <Button onPress={() => router.back()} className="mt-4">
            <ButtonText>Буцах</ButtonText>
          </Button>
        </Box>
      </SafeAreaView>
    );
  }

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return (
          <VStack space="md" className="p-4">
            {/* Company Header Card */}
            <View style={styles.card}>
              <HStack space="md">
                {/* Company Image */}
                <Box className="w-16 h-16 bg-background-100 rounded-lg items-center justify-center border border-outline-200">
                  <ImageIcon size={28} color="#9CA3AF" />
                </Box>

                {/* Company Basic Info */}
                <VStack className="flex-1" space="xs">
                  <Heading size="md" className="text-typography-900" numberOfLines={2}>
                    {partnerDetail.name}
                  </Heading>

                  {partnerDetail.commonName && partnerDetail.commonName !== partnerDetail.name && (
                    <Text size="sm" className="text-typography-500" numberOfLines={1}>
                      ({partnerDetail.commonName})
                    </Text>
                  )}

                  {/* Head Company */}
                  {partnerDetail.headCompanyName && (
                    <HStack space="xs" className="items-center">
                      <Building2 size={12} color="#6B7280" />
                      <Text size="xs" className="text-typography-500">
                        {partnerDetail.headCompanyName}
                        {partnerDetail.headCompanyRegister && ` (${partnerDetail.headCompanyRegister})`}
                      </Text>
                    </HStack>
                  )}
                </VStack>
              </HStack>
            </View>

            {/* Company Details Section */}
            <VStack space="sm">
              <Text style={styles.sectionTitle}>Компанийн мэдээлэл</Text>

              {/* 2-column grid for short info */}
              <View style={styles.gridContainer}>
                {/* Company Code */}
                {partnerDetail.companyCode && (
                  <View style={styles.gridItem}>
                    <View style={styles.gridItemInner}>
                      <View style={[styles.iconBoxSmall, { backgroundColor: '#EFF6FF' }]}>
                        <Hash size={14} color="#2563EB" />
                      </View>
                      <VStack className="flex-1 ml-2">
                        <Text size="xs" className="text-typography-500">Код</Text>
                        <Text size="sm" className="text-typography-800 font-medium">{partnerDetail.companyCode}</Text>
                      </VStack>
                    </View>
                  </View>
                )}

                {/* Corporate ID */}
                {partnerDetail.corporateId && (
                  <View style={styles.gridItem}>
                    <View style={styles.gridItemInner}>
                      <View style={[styles.iconBoxSmall, { backgroundColor: '#F3E8FF' }]}>
                        <CreditCard size={14} color="#7C3AED" />
                      </View>
                      <VStack className="flex-1 ml-2">
                        <Text size="xs" className="text-typography-500">Corporate ID</Text>
                        <Text size="sm" className="text-typography-800 font-medium">{partnerDetail.corporateId}</Text>
                      </VStack>
                    </View>
                  </View>
                )}

                {/* Registry Number */}
                {partnerDetail.registryNumber && (
                  <View style={styles.gridItem}>
                    <View style={styles.gridItemInner}>
                      <View style={[styles.iconBoxSmall, { backgroundColor: '#ECFDF5' }]}>
                        <FileText size={14} color="#e17100" />
                      </View>
                      <VStack className="flex-1 ml-2">
                        <Text size="xs" className="text-typography-500">Регистр</Text>
                        <Text size="sm" className="text-typography-800 font-medium">{partnerDetail.registryNumber}</Text>
                      </VStack>
                    </View>
                  </View>
                )}

                {/* Company Type */}
                {partnerDetail.companyType && (
                  <View style={styles.gridItem}>
                    <View style={styles.gridItemInner}>
                      <View style={[styles.iconBoxSmall, { backgroundColor: '#FEF3C7' }]}>
                        <Building2 size={14} color="#D97706" />
                      </View>
                      <VStack className="flex-1 ml-2">
                        <Text size="xs" className="text-typography-500">Төрөл</Text>
                        <Text size="sm" className="text-typography-800 font-medium">{partnerDetail.companyType}</Text>
                      </VStack>
                    </View>
                  </View>
                )}
              </View>

              {/* 4-column grid for Sales Channel, Tax, Business Region, Delivery Region */}
              <View style={styles.gridContainer}>
                {/* Sales Channel */}
                <View style={styles.gridItem}>
                  <View style={styles.gridItemInner}>
                    <View style={[styles.iconBoxSmall, { backgroundColor: '#E0E7FF' }]}>
                      <ShoppingCart size={14} color="#4F46E5" />
                    </View>
                    <VStack className="flex-1 ml-2">
                      <Text size="xs" className="text-typography-500">Суваг</Text>
                      <Text size="sm" className="text-primary-600 font-medium">
                        {partnerDetail.salesChannel || '-'}
                      </Text>
                    </VStack>
                  </View>
                </View>

                {/* Tax Payer */}
                <View style={styles.gridItem}>
                  <View style={styles.gridItemInner}>
                    <View style={[styles.iconBoxSmall, { backgroundColor: partnerDetail.taxPayerType ? '#DCFCE7' : '#F3F4F6' }]}>
                      <Wallet size={14} color={partnerDetail.taxPayerType ? '#16A34A' : '#9CA3AF'} />
                    </View>
                    <VStack className="flex-1 ml-2">
                      <Text size="xs" className="text-typography-500">Татвар төлөгч</Text>
                      <Text size="sm" className={partnerDetail.taxPayerType ? 'text-success-600 font-medium' : 'text-typography-500 font-medium'}>
                        {partnerDetail.taxPayerType ? 'Тийм' : 'Үгүй'}
                      </Text>
                    </VStack>
                  </View>
                </View>

                {/* Business Region */}
                <View style={styles.gridItem}>
                  <View style={styles.gridItemInner}>
                    <View style={[styles.iconBoxSmall, { backgroundColor: '#DBEAFE' }]}>
                      <Building2 size={14} color="#2563EB" />
                    </View>
                    <VStack className="flex-1 ml-2">
                      <Text size="xs" className="text-typography-500">Бизнес бүс</Text>
                      <Text size="sm" className="text-typography-800 font-medium" numberOfLines={1}>
                        {partnerDetail.businessRegion || '-'}
                      </Text>
                    </VStack>
                  </View>
                </View>

                {/* Delivery Region */}
                <View style={styles.gridItem}>
                  <View style={styles.gridItemInner}>
                    <View style={[styles.iconBoxSmall, { backgroundColor: '#FED7AA' }]}>
                      <Truck size={14} color="#EA580C" />
                    </View>
                    <VStack className="flex-1 ml-2">
                      <Text size="xs" className="text-typography-500">Хүргэлт</Text>
                      <Text size="sm" className="text-typography-800 font-medium" numberOfLines={1}>
                        {partnerDetail.deliveryRegion || '-'}
                      </Text>
                    </VStack>
                  </View>
                </View>
              </View>
            </VStack>

            {/* Total Discount - Ticket Style Card */}
            <View style={styles.ticketCard}>
              <View style={styles.ticketLeftSection}>
                <TrendingUp size={22} color="#FFFFFF" />
              </View>
              <View style={styles.ticketContent}>
                <Text style={styles.ticketAmount}>
                  {formatBalance(partnerDetail.totalDiscountAmount)}
                </Text>
              </View>
              <View style={styles.ticketBadge}>
                <Text style={styles.ticketBadgeText}>УРАМШУУЛЛЫН ДҮН</Text>
              </View>
            </View>

            {/* Contact Info Section */}
            <VStack space="sm">
              <Text style={styles.sectionTitle}>Холбоо барих</Text>
              <VStack space="xs">
                {/* Phone Numbers */}
                {partnerDetail.phoneNumbers && partnerDetail.phoneNumbers.length > 0 && (
                  partnerDetail.phoneNumbers.map((phoneNum, index) => (
                    <TouchableOpacity key={`phone-${index}`} style={styles.listItem} onPress={() => handleCall(phoneNum)}>
                      <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                        <Phone size={18} color="#2563EB" />
                      </View>
                      <VStack className="flex-1 ml-3">
                        <Text size="xs" className="text-typography-500">
                          Утас {partnerDetail.phoneNumbers.length > 1 ? index + 1 : ''}
                        </Text>
                        <Text size="sm" className="text-typography-800 font-medium">{phoneNum}</Text>
                      </VStack>
                      <ChevronRight size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))
                )}

                {/* Email */}
                {partnerDetail.email && (
                  <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => Linking.openURL(`mailto:${partnerDetail.email}`)}
                  >
                    <View style={[styles.iconBox, { backgroundColor: '#F3E8FF' }]}>
                      <Mail size={18} color="#7C3AED" />
                    </View>
                    <VStack className="flex-1 ml-3">
                      <Text size="xs" className="text-typography-500">Имэйл</Text>
                      <Text size="sm" className="text-typography-800 font-medium">{partnerDetail.email}</Text>
                    </VStack>
                    <ChevronRight size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}

                {/* Address */}
                {partnerDetail.address && (
                  <TouchableOpacity style={styles.listItem} onPress={handleNavigate}>
                    <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                      <MapPin size={18} color="#e17100" />
                    </View>
                    <VStack className="flex-1 ml-3">
                      <Text size="xs" className="text-typography-500">Хаяг</Text>
                      <Text size="sm" className="text-typography-800 font-medium" numberOfLines={2}>{partnerDetail.address}</Text>
                    </VStack>
                    <ChevronRight size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}

                {/* What3Words */}
                {partnerDetail.what3words && (
                  <TouchableOpacity style={styles.listItem} onPress={openW3W}>
                    <View style={[styles.iconBox, { backgroundColor: '#FFF1F2' }]}>
                      <What3WordsIcon size={18} />
                    </View>
                    <VStack className="flex-1 ml-3">
                      <Text size="xs" className="text-typography-500">What3Words</Text>
                      <Text size="sm" className="text-rose-600 font-medium">{partnerDetail.what3words}</Text>
                    </VStack>
                    <ChevronRight size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}

                {/* Coordinate Range */}
                {partnerDetail.coordinateRange && (
                  <View style={styles.listItem}>
                    <View style={[styles.iconBox, { backgroundColor: '#FFF7ED' }]}>
                      <Navigation size={18} color="#EA580C" />
                    </View>
                    <VStack className="flex-1 ml-3">
                      <Text size="xs" className="text-typography-500">Байршлын радиус</Text>
                      <Text size="sm" className="text-typography-800 font-medium">{partnerDetail.coordinateRange}м</Text>
                    </VStack>
                  </View>
                )}

                {/* Distance from current location */}
                {distance !== null && (
                  <View style={styles.listItem}>
                    <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
                      <Route size={18} color="#4F46E5" />
                    </View>
                    <VStack className="flex-1 ml-3">
                      <Text size="xs" className="text-typography-500">Одоогийн байршлаас</Text>
                      <Text size="sm" className="text-typography-800 font-medium">{distance.toFixed(2)} км</Text>
                    </VStack>
                  </View>
                )}
              </VStack>
            </VStack>

            {/* Bank Accounts Section */}
            {partnerDetail.bankAccounts && partnerDetail.bankAccounts.length > 0 && (
              <VStack space="sm">
                <Text style={styles.sectionTitle}>Банкны данс</Text>
                <VStack space="xs">
                  {partnerDetail.bankAccounts.map((bank, index) => (
                    <View key={`bank-${index}`} style={styles.listItem}>
                      <View style={[styles.iconBox, { backgroundColor: '#CCFBF1' }]}>
                        <Landmark size={18} color="#0D9488" />
                      </View>
                      <VStack className="flex-1 ml-3">
                        <Text size="xs" className="text-typography-500">{bank.bankName}</Text>
                        <Text size="sm" className="text-typography-800 font-medium">{bank.bankAccount}</Text>
                      </VStack>
                    </View>
                  ))}
                </VStack>
              </VStack>
            )}

          </VStack>
        );

      case 'products':
        return (
          <Box className="flex-1 justify-center items-center py-20">
            <Package size={48} color="#9CA3AF" />
            <Text size="md" className="text-typography-500 mt-4">Бүтээгдэхүүн удахгүй</Text>
          </Box>
        );

      case 'orders':
        // Tab animation for orders
        const ordersTabWidth = (Dimensions.get('window').width - 32) / 2; // 16px padding each side, 2 tabs

        return (
          <VStack className="flex-1">
            {/* Orders Sub-tabs */}
            <View style={styles.ordersTabBar}>
              {/* Animated indicator */}
              <Animated.View
                style={[
                  styles.ordersTabIndicator,
                  {
                    width: ordersTabWidth - 8,
                    transform: [{ translateX: ordersTab === 'active' ? 0 : ordersTabWidth }]
                  }
                ]}
              />
              <TouchableOpacity
                style={styles.ordersTab}
                onPress={() => setOrdersTab('active')}
                activeOpacity={0.7}
              >
                <Text style={[styles.ordersTabText, ordersTab === 'active' && styles.ordersTabTextActive]}>
                  Идэвхтэй
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ordersTab}
                onPress={() => setOrdersTab('history')}
                activeOpacity={0.7}
              >
                <Text style={[styles.ordersTabText, ordersTab === 'history' && styles.ordersTabTextActive]}>
                  Түүх
                </Text>
              </TouchableOpacity>
            </View>

            {/* Orders Header */}
            <View style={styles.ordersHeader}>
              <Text style={styles.ordersHeaderText}>Сүүлийн 3 сарын борлуулалтын мэдээлэл</Text>
              <HStack className="items-center" space="sm">
                <Text style={styles.ordersCount}>Нийт: <Text style={{ fontFamily: 'GIP-Bold' }}>{orders.length}</Text></Text>
                <TouchableOpacity>
                  <View style={styles.filterIcon}>
                    <FileText size={18} color="#2563EB" />
                  </View>
                </TouchableOpacity>
              </HStack>
            </View>

            {/* Orders Loading */}
            {ordersLoading && (
              <Box className="flex-1 justify-center items-center py-20">
                <ActivityIndicator size="large" color="#2563EB" />
                <Text className="mt-4 text-typography-500">Ачаалж байна...</Text>
              </Box>
            )}

            {/* Orders Error */}
            {ordersError && !ordersLoading && (
              <Box className="flex-1 justify-center items-center py-20">
                <AlertCircle size={48} color="#DC2626" />
                <Text className="mt-4 text-typography-500">{ordersError}</Text>
              </Box>
            )}

            {/* Orders Empty */}
            {!ordersLoading && !ordersError && orders.length === 0 && (
              <Box className="flex-1 justify-center items-center py-20">
                <ClipboardList size={48} color="#9CA3AF" />
                <Text size="md" className="text-typography-500 mt-4">Захиалга олдсонгүй</Text>
              </Box>
            )}

            {/* Orders List */}
            {!ordersLoading && !ordersError && orders.length > 0 && (
              <VStack className="px-4 pt-2">
                {orders.map((order, index) => {
                  // Group by date - check if new date
                  const orderDate = order.date.split(' ')[0];
                  const prevOrderDate = index > 0 ? orders[index - 1].date.split(' ')[0] : null;
                  const showDateHeader = orderDate !== prevOrderDate;

                  return (
                    <View key={`${order.uuid}-${index}`}>
                      {/* Date Header */}
                      {showDateHeader && (
                        <Text style={styles.orderDateHeader}>{orderDate.replace(/-/g, ' · ')}</Text>
                      )}

                      {/* Order Item */}
                      <TouchableOpacity
                        style={styles.orderItem}
                        onPress={() => router.push(`/order/${order.uuid}`)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.orderIndex}>{index + 1}</Text>

                        <View style={styles.orderContent}>
                          {/* Row 1: Warehouse + Status */}
                          <View style={styles.orderRow}>
                            <HStack className="items-center" space="xs">
                              <View style={styles.warehouseBadge}>
                                <Building2 size={10} color="#6B7280" />
                                <Text style={styles.warehouseText}>{order.warehouseName}</Text>
                              </View>
                              {/* Delete Market indicator */}
                              {order.deleteMarket && (
                                <View style={styles.deleteMarketBadge}>
                                  <Trash2 size={10} color="#DC2626" />
                                </View>
                              )}
                              {/* Promo indicator */}
                              {order.totalPromoPoint?.totalPromoAmount > 0 && (
                                <View style={styles.promoBadge}>
                                  <Gift size={10} color="#F59E0B" />
                                </View>
                              )}
                            </HStack>
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

                          {/* Row 2: Code + Product Count + Amount */}
                          <View style={styles.orderRow}>
                            <HStack className="items-center" space="xs">
                              <Text style={styles.orderCode}>{order.orderCode}</Text>
                              <View style={styles.productCountBadge}>
                                <Text style={styles.productCountText}>{order.products?.length || 0} төрөл</Text>
                              </View>
                            </HStack>
                            <Text style={styles.orderAmount}>{order.totalAmount.toLocaleString()}₮</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </VStack>
            )}
          </VStack>
        );

      case 'template':
        // Filter templates for current partner
        const partnerTemplates = templates.filter(t => t.partnerId === id);

        return (
          <VStack space="md" className="p-4">
            {/* Header with Add Button */}
            <HStack className="justify-between items-center">
              <VStack>
                <Text style={styles.sectionTitle}>Загвар бараанууд</Text>
                <Text size="xs" className="text-typography-500">
                  {partnerTemplates.length} бүтээгдэхүүн
                </Text>
              </VStack>
              <TouchableOpacity
                style={styles.addTemplateButton}
                onPress={() => {
                  // Select partner and navigate to products to add to template
                  if (partnerDetail) {
                    const partner: SelectedPartner = {
                      id: partnerDetail.id,
                      name: partnerDetail.name,
                      phone: partnerDetail.phoneNumbers?.[0] || null,
                      address: partnerDetail.address || null,
                      latitude: partnerDetail.latitude || null,
                      longitude: partnerDetail.longitude || null,
                      coordinateRange: partnerDetail.coordinateRange || null,
                      totalDiscountAmount: partnerDetail.totalDiscountAmount || null,
                    };
                    setCartPartner(partner);
                    router.push('/products?mode=template');
                  }
                }}
              >
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.addTemplateButtonText}>Бараа нэмэх</Text>
              </TouchableOpacity>
            </HStack>

            {/* Loading */}
            {templatesLoading && (
              <Box className="py-8 items-center">
                <ActivityIndicator size="small" color="#2563EB" />
              </Box>
            )}

            {/* Empty State */}
            {!templatesLoading && partnerTemplates.length === 0 && (
              <Box className="py-12 items-center">
                <Layout size={48} color="#9CA3AF" />
                <Text size="md" className="text-typography-500 mt-4">Загвар бараа байхгүй</Text>
                <Text size="sm" className="text-typography-400 mt-1 text-center px-8">
                  Энэ харилцагчид зориулсан загвар бараа нэмэх бол дээрх "Бараа нэмэх" товчийг дарна уу
                </Text>
              </Box>
            )}

            {/* Template List */}
            {!templatesLoading && partnerTemplates.length > 0 && (
              <VStack space="sm">
                {partnerTemplates.map((template, index) => (
                  <View key={template.id} style={styles.templateItem}>
                    <View style={styles.templateIndex}>
                      <Text style={styles.templateIndexText}>{index + 1}</Text>
                    </View>

                    <View style={styles.templateContent}>
                      {/* Product Name & Category */}
                      <Text style={styles.templateName} numberOfLines={2}>
                        {template.productName}
                      </Text>
                      <HStack space="xs" className="mt-1">
                        {template.brandName && (
                          <Badge size="sm" variant="outline" action="info">
                            <BadgeText>{template.brandName}</BadgeText>
                          </Badge>
                        )}
                        {template.categoryName && (
                          <Badge size="sm" variant="outline" action="muted">
                            <BadgeText>{template.categoryName}</BadgeText>
                          </Badge>
                        )}
                      </HStack>

                      {/* Price & MOQ */}
                      <HStack className="mt-2 items-center" space="md">
                        <Text style={styles.templatePrice}>
                          {template.productPrice.toLocaleString()}₮
                        </Text>
                        <Text style={styles.templateMoq}>
                          MOQ: {template.productMoq}
                        </Text>
                      </HStack>
                    </View>

                    {/* Quantity Controls */}
                    <View style={styles.templateActions}>
                      <View style={styles.quantityControl}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => {
                            if (template.quantity > 1) {
                              updateQuantity(id!, template.productId, template.quantity - 1);
                            }
                          }}
                        >
                          <Minus size={14} color="#6B7280" />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{template.quantity}</Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => {
                            updateQuantity(id!, template.productId, template.quantity + 1);
                          }}
                        >
                          <Plus size={14} color="#6B7280" />
                        </TouchableOpacity>
                      </View>

                      {/* Delete Button */}
                      <TouchableOpacity
                        style={styles.deleteTemplateButton}
                        onPress={() => {
                          Alert.alert(
                            'Устгах',
                            `"${template.productName}" загвараас устгах уу?`,
                            [
                              { text: 'Үгүй', style: 'cancel' },
                              {
                                text: 'Тийм',
                                style: 'destructive',
                                onPress: () => removeFromTemplate(id!, template.productId),
                              },
                            ]
                          );
                        }}
                      >
                        <Trash2 size={16} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {/* Add All to Cart Button */}
                {partnerTemplates.length > 0 && (
                  <TouchableOpacity
                    style={styles.addToCartButton}
                    onPress={() => {
                      // First ensure partner is selected
                      if (partnerDetail) {
                        const partner: SelectedPartner = {
                          id: partnerDetail.id,
                          name: partnerDetail.name,
                          phone: partnerDetail.phoneNumbers?.[0] || null,
                          address: partnerDetail.address || null,
                          latitude: partnerDetail.latitude || null,
                          longitude: partnerDetail.longitude || null,
                          coordinateRange: partnerDetail.coordinateRange || null,
                          totalDiscountAmount: partnerDetail.totalDiscountAmount || null,
                        };
                        setCartPartner(partner);
                      }

                      // Add all templates to cart
                      let addedCount = 0;
                      partnerTemplates.forEach(template => {
                        addToCart(
                          {
                            id: template.productId,
                            name: template.productName,
                            code: '',
                            price: template.productPrice,
                            image: null,
                            stock: 9999,
                            stockTypes: template.stockTypeId ? [{
                              uuid: template.stockTypeId,
                              name: template.stockTypeName || 'PCS',
                              pcs: 1,
                            }] : [],
                            moq: template.productMoq,
                            onlyBoxSale: false,
                            promoPoint: null,
                          },
                          [{
                            stockTypeId: template.stockTypeId || 'default',
                            stockTypeName: template.stockTypeName || 'PCS',
                            quantity: template.quantity,
                            pcs: 1,
                          }]
                        );
                        addedCount++;
                      });

                      Alert.alert(
                        'Амжилттай',
                        `${addedCount} бараа сагсанд нэмэгдлээ`,
                        [
                          { text: 'Болсон' },
                          {
                            text: 'Сагс руу очих',
                            onPress: () => router.push('/cart'),
                          },
                        ]
                      );
                    }}
                  >
                    <ShoppingCart size={16} color="#FFFFFF" />
                    <Text style={styles.addToCartText}>Сагсанд нэмэх</Text>
                  </TouchableOpacity>
                )}

                {/* Clear All Button */}
                {partnerTemplates.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearTemplateButton}
                    onPress={() => {
                      Alert.alert(
                        'Бүгдийг устгах',
                        'Энэ харилцагчийн бүх загвар барааг устгах уу?',
                        [
                          { text: 'Үгүй', style: 'cancel' },
                          {
                            text: 'Тийм',
                            style: 'destructive',
                            onPress: () => clearTemplate(id!),
                          },
                        ]
                      );
                    }}
                  >
                    <Trash2 size={16} color="#DC2626" />
                    <Text style={styles.clearTemplateText}>Бүгдийг устгах</Text>
                  </TouchableOpacity>
                )}
              </VStack>
            )}
          </VStack>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <Box className="bg-white px-4 py-3 border-b border-outline-100">
        <HStack className="items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Heading size="md" className="text-typography-900 flex-1 text-center" numberOfLines={1}>
            {partnerDetail.name}
          </Heading>
          <TouchableOpacity style={styles.headerBtn}>
            <Edit3 size={22} color="#111827" />
          </TouchableOpacity>
        </HStack>
      </Box>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Icon size={20} color={isActive ? '#2563EB' : '#9CA3AF'} />
              <Text
                size="xs"
                className={isActive ? 'text-primary-600 mt-1' : 'text-typography-400 mt-1'}
                style={{ fontFamily: isActive ? 'GIP-Medium' : 'GIP-Regular' }}
              >
                {tab.label}
              </Text>
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {renderTabContent()}
      </ScrollView>

      {/* Bottom Action Buttons */}
      <Box style={styles.bottomAction}>
        {/* Distance indicator */}
        {userLocation && partnerDetail.latitude && partnerDetail.longitude && (
          <Box style={styles.distanceIndicator}>
            <Navigation size={12} color={isWithinRange() ? '#e17100' : '#DC2626'} />
            <Text style={[
              styles.distanceText,
              { color: isWithinRange() ? '#e17100' : '#DC2626' }
            ]}>
              {(() => {
                const R = 6371000;
                const lat1 = userLocation.latitude * Math.PI / 180;
                const lat2 = partnerDetail.latitude * Math.PI / 180;
                const dLat = (partnerDetail.latitude - userLocation.latitude) * Math.PI / 180;
                const dLon = (partnerDetail.longitude - userLocation.longitude) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const d = R * c;
                return d >= 1000 ? `${(d / 1000).toFixed(1)} км` : `${Math.round(d)} м`;
              })()}
            </Text>
            {partnerDetail.coordinateRange !== 1 && (
              <Text style={styles.rangeText}>
                / {getRouteRange()}м дотор
              </Text>
            )}
          </Box>
        )}

        {/* Cart count indicator */}
        {cartItemCount > 0 && cartPartner?.id === partnerDetail.id && (
          <Box style={styles.cartCountIndicator}>
            <ShoppingCart size={14} color="#2563EB" />
            <Text style={styles.cartCountText}>{cartItemCount} бараа сагсанд</Text>
          </Box>
        )}

        {/* Action Buttons */}
        <HStack space="sm" className="w-full">
          {/* Зочилсон товч - зочилсон бол ногоон өнгөтэй */}
          {(() => {
            const isVisited = partnerDetail?.id && isPartnerVisitedToday(partnerDetail.id);
            const canVisit = !isVisited && isWithinRange();

            return (
              <Button
                size="lg"
                variant="outline"
                className="flex-1"
                style={[
                  styles.actionButton,
                  isVisited ? styles.visitedButton : !canVisit && styles.actionButtonDisabled
                ]}
                onPress={handleVisit}
                disabled={!canVisit || visitorCreating}
              >
                {visitorCreating ? (
                  <ActivityIndicator size="small" color="#f59e0b" />
                ) : (
                  <MapPin size={20} color={isVisited ? '#f59e0b' : canVisit ? '#1F2937' : '#D1D5DB'} />
                )}
                <ButtonText style={{
                  marginLeft: 8,
                  color: isVisited ? '#f59e0b' : canVisit ? '#1F2937' : '#D1D5DB'
                }}>
                  {isVisited ? 'Зочилсон ✓' : 'Зочилсон'}
                </ButtonText>
              </Button>
            );
          })()}
          <Button
            size="lg"
            className="flex-1"
            style={[
              styles.actionButton,
              styles.primaryButton,
              !canCreateOrderRemotely() && styles.primaryButtonDisabled
            ]}
            onPress={handleCreateOrder}
            disabled={!canCreateOrderRemotely()}
          >
            <ShoppingCart size={20} color={canCreateOrderRemotely() ? 'white' : '#9CA3AF'} />
            <ButtonText style={{ marginLeft: 8, color: canCreateOrderRemotely() ? '#FFFFFF' : '#9CA3AF' }}>
              Захиалга үүсгэх
            </ButtonText>
          </Button>
        </HStack>
      </Box>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  activeTab: {
    // Active styles applied via activeIndicator
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 3,
    backgroundColor: '#2563EB',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  gridItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Ticket Style Card
  ticketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  ticketLeftSection: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketContent: {
    flex: 1,
    marginLeft: 12,
  },
  ticketAmount: {
    fontSize: 22,
    fontFamily: 'GIP-Bold',
    color: '#f59e0b',
    marginTop: 2,
  },
  ticketBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ticketBadgeText: {
    fontSize: 10,
    fontFamily: 'GIP-Bold',
    color: '#16A34A',
    letterSpacing: 1,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'column',
    padding: 16,
    paddingBottom: 32,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  // Distance and Cart indicators
  distanceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  distanceText: {
    fontSize: 12,
    fontFamily: 'GIP-SemiBold',
    marginLeft: 4,
  },
  rangeText: {
    fontSize: 10,
    fontFamily: 'GIP-Regular',
    color: '#9CA3AF',
    marginLeft: 4,
  },
  cartCountIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  cartCountText: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#2563EB',
    marginLeft: 6,
  },
  // Action buttons
  actionButton: {
    height: 48,
  },
  actionButtonDisabled: {
    opacity: 0.5,
    borderColor: '#E5E7EB',
  },
  visitedButton: {
    borderColor: '#f59e0b',
    backgroundColor: '#ECFDF5',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
  },
  primaryButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  // Orders Tab Styles
  ordersTabBar: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
    padding: 4,
    position: 'relative',
  },
  ordersTabIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  ordersTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    zIndex: 1,
  },
  ordersTabText: {
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#2563EB',
  },
  ordersTabTextActive: {
    color: '#FFFFFF',
  },
  ordersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ordersHeaderText: {
    fontSize: 13,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  ordersCount: {
    fontSize: 13,
    fontFamily: 'GIP-Regular',
    color: '#111827',
  },
  filterIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderDateHeader: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 6,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  orderContent: {
    flex: 1,
    marginLeft: 8,
    marginRight: 10,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderBadges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIndex: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#9CA3AF',
    width: 20,
    paddingTop: 2,
  },
  orderAmount: {
    fontSize: 15,
    fontFamily: 'GIP-Bold',
    color: '#111827',
  },
  orderCode: {
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
  productCountBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  productCountText: {
    fontSize: 10,
    fontFamily: 'GIP-Medium',
    color: '#4F46E5',
  },
  cartButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Template styles
  addTemplateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addTemplateButtonText: {
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#FFFFFF',
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  templateIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  templateIndexText: {
    fontSize: 11,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
  },
  templateContent: {
    flex: 1,
    marginRight: 12,
  },
  templateName: {
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#111827',
    lineHeight: 20,
  },
  templatePrice: {
    fontSize: 14,
    fontFamily: 'GIP-Bold',
    color: '#2563EB',
  },
  templateMoq: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#9CA3AF',
  },
  templateActions: {
    alignItems: 'center',
    gap: 8,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  quantityButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
  },
  quantityText: {
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#111827',
    minWidth: 32,
    textAlign: 'center',
  },
  deleteTemplateButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  clearTemplateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
    gap: 8,
  },
  clearTemplateText: {
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#DC2626',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
    gap: 8,
  },
  addToCartText: {
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#FFFFFF',
  },
});
