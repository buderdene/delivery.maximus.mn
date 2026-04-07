/**
 * CHECKOUT ХУУДАС
 * 
 * Захиалга үүсгэх, ERP руу илгээх flow
 * 
 * ============================================================================
 * БИЗНЕС ЛОГИК: 2-STEP ORDER PROCESS (ERP шууд холболт)
 * ============================================================================
 * 
 * ERP STEP 1: DRAFT ҮҮСГЭХ
 * - POST http://203.21.120.60:8080/maximus_trade/hs/direct/Order
 * - paymentcheck: false
 * - Response: { uuid, documentNumber } - Draft захиалгын UUID
 * 
 * ERP STEP 2: FINISH (БАТАЛГААЖУУЛАХ)
 * - POST http://203.21.120.60:8080/maximus_trade/hs/direct/Order
 * - paymentcheck: true, finishStep: true, latitudeFinish, longitudeFinish, end_date
 * - Response: { success, order }
 * 
 * ============================================================================
 * UI FLOW: 4-STEP
 * ============================================================================
 * 
 * 1. REVIEW - Сагс харах, агуулах сонгох, бараа жагсаалт
 * 2. PAYMENT - Төлбөрийн хэлбэр сонгох, тэмдэглэл -> Draft илгээх (ERP Step 1)
 * 3. CONFIRM - Баталгаажуулах мэдээлэл -> Finish илгээх (ERP Step 2)
 * 4. SUCCESS - Амжилттай мэдээлэл
 * 
 * ============================================================================
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import {
  ChevronLeft,
  Check,
  Package,
  Building2,
  MapPin,
  Clock,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  Gift,
} from 'lucide-react-native';
import { Box, HStack, VStack, Text, Heading } from '../../components/ui';
import { useCartStore } from '../../stores/cart-store';
import { useWarehouseStore } from '../../stores/warehouse-store';
import { useAuthStore } from '../../stores/auth-store';

const { width } = Dimensions.get('window');

// ==========================================================================
// ERP API ТОХИРГОО (Шууд холболт)
// ==========================================================================
const ERP_BASE_URL = 'http://203.21.120.60:8080/maximus_trade/hs';
const ERP_ORDER_PATH = '/direct/Order';
const ERP_USERNAME = 'TestAPI';
const ERP_PASSWORD = 'jI9da0zu';

// Base64 encode for Basic Auth
const ERP_AUTH = btoa(`${ERP_USERNAME}:${ERP_PASSWORD}`);

// Mobile version
const MOBILE_VERSION = '2.2.2';

// Step definitions
type CheckoutStep = 'review' | 'payment' | 'confirm' | 'success';

const STEPS = [
  { key: 'review', label: 'Шалгах', icon: Package },
  { key: 'payment', label: 'Төлбөр', icon: CreditCard },
  { key: 'confirm', label: 'Баталгаажуулах', icon: Check },
  { key: 'success', label: 'Дууссан', icon: CheckCircle },
] as const;

export default function CheckoutScreen() {
  const router = useRouter();

  // Stores
  const {
    items,
    selectedPartner,
    totalAmount,
    formattedTotal,
    totalItems,
    setDraftOrderUuid,
    setOrderStatus,
    setOrderError,
    draftOrderUuid,
    orderStatus,
    orderError,
    clearCart,
  } = useCartStore();

  const {
    selectedWarehouse,
  } = useWarehouseStore();

  const { erpDetails, user } = useAuthStore();

  // Local state
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('review');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [paymentCheck, setPaymentCheck] = useState<'cash' | 'transfer' | 'loan'>('cash');
  const [note, setNote] = useState('');

  // Location state
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Created order info
  const [createdOrderCode, setCreatedOrderCode] = useState<string | null>(null);
  const [createdOrderUuid, setCreatedOrderUuid] = useState<string | null>(null);

  /**
   * Get user location
   */
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Байршил авах зөвшөөрөл олгогдоогүй');
        return;
      }

      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        setLocationError('Байршил авахад алдаа гарлаа');
      }
    })();
  }, []);

  /**
   * formatPrice: Мөнгөн дүн форматлах
   */
  const formatPrice = (price: number) => {
    return '₮' + price.toLocaleString();
  };

  /**
   * handleSubmitDraft: Step 1 - Draft захиалга үүсгэх
   * ERP шууд: POST /direct/Order (paymentcheck: false)
   */
  const handleSubmitDraft = async () => {
    if (!selectedPartner || !selectedWarehouse || !userLocation) {
      Alert.alert('Алдаа', 'Бүх мэдээлэл бөглөгдөөгүй байна');
      return;
    }

    setIsSubmitting(true);
    setOrderStatus('submitting');
    setOrderError(null);

    try {
      // Current datetime
      const now = new Date();
      const datetime = now.toISOString().slice(0, 19).replace('T', ' ');

      // Build order products for ERP format
      const orderProducts = items.map((item) => ({
        productId: item.productId,
        stock: item.stocks.map((s) => ({
          typeId: s.typeId,
          count: s.count,
        })),
        priceType: selectedPartner.priceTypeId || selectedWarehouse.priceTypeId,
        sale: 0,
        promotions: [],
      }));

      // Build Step 1 (Draft) request
      const draftRequest = {
        uuid: '', // Empty for new order
        username: user?.username || '11202250', // Борлуулагчийн username
        imei: erpDetails?.[0]?.routeIMEI || 'MOBILE-SALES-APP',
        companyId: selectedPartner.id,
        contractId: selectedPartner.contract?.contractId || 'db05d0d6-9c37-11e5-9beb-3085a97c20be',
        paymentType: 1,
        cashAmount: null,
        warehouseId: selectedWarehouse.uuid,
        deliveryType: 1,
        deliveryDatetime: datetime,
        deliveryAdditionalInfo: '',
        description: note || '',
        orderProducts,
        priceTypeId: selectedPartner.priceTypeId || selectedWarehouse.priceTypeId,
        paymentcheck: false, // Step 1 = false (Draft)
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        useDiscount: true,
        customerPriceTypeId: selectedPartner.priceTypeId || selectedWarehouse.priceTypeId,
        deliveryDate: null,
        isSale: selectedWarehouse.isSale || false,
        start_date: datetime,
        end_date: datetime,
        mobileVersion: MOBILE_VERSION,
      };

      // API call - Draft шууд ERP руу
      const apiUrl = `${ERP_BASE_URL}${ERP_ORDER_PATH}`;
      console.log('[Checkout] Calling ERP:', apiUrl);
      console.log('[Checkout] Request body:', JSON.stringify(draftRequest, null, 2));

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Basic ${ERP_AUTH}`,
        },
        body: JSON.stringify(draftRequest),
      });

      const data = await response.json();
      console.log('[Checkout] Draft response:', data);

      if (data.uuid) {
        setDraftOrderUuid(data.uuid);
        setCreatedOrderUuid(data.uuid);
        // documentNumber хэрэглэгчид ойлгомжтой (жнь: MDMD-00009194)
        setCreatedOrderCode(data.documentNumber || data.orderCode || data.uuid);
        setOrderStatus('draft');
        setCurrentStep('confirm'); // Payment -> Confirm step
      } else {
        throw new Error(data.error || data.message || 'Draft үүсгэхэд алдаа');
      }
    } catch (error: any) {
      console.error('[Checkout] Draft error:', error);
      setOrderError(error.message || 'Алдаа гарлаа');
      setOrderStatus('error');
      Alert.alert('Алдаа', error.message || 'Захиалга үүсгэхэд алдаа гарлаа');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * handleFinishOrder: Step 2 - Баталгаажуулах
   * ERP шууд: POST /direct/Order (paymentcheck: true, finishStep: true)
   */
  const handleFinishOrder = async () => {
    if (!draftOrderUuid || !userLocation || !selectedPartner || !selectedWarehouse) {
      Alert.alert('Алдаа', 'Draft захиалга олдсонгүй');
      return;
    }

    setIsSubmitting(true);
    setOrderStatus('submitting');

    try {
      // Current datetime for end_date
      const now = new Date();
      const endDatetime = now.toISOString().slice(0, 19).replace('T', ' ');

      // Build order products for ERP format
      const orderProducts = items.map((item) => ({
        productId: item.productId,
        stock: item.stocks.map((s) => ({
          typeId: s.typeId,
          count: s.count,
        })),
        priceType: selectedPartner.priceTypeId || selectedWarehouse.priceTypeId,
        sale: 0,
        promotions: [],
      }));

      // Build Step 2 (Finish) request
      const finishRequest = {
        uuid: draftOrderUuid, // UUID from Step 1
        finishStep: true, // ЧУХАЛ: Finish step
        mobileVersion: MOBILE_VERSION,
        username: user?.username || '11202250', // Борлуулагчийн username
        imei: erpDetails?.[0]?.routeIMEI || 'MOBILE-SALES-APP',
        companyId: selectedPartner.id,
        contractId: selectedPartner.contract?.contractId || 'db05d0d6-9c37-11e5-9beb-3085a97c20be',
        paymentType: 1,
        cashAmount: null,
        warehouseId: selectedWarehouse.uuid,
        deliveryType: 1,
        deliveryDatetime: endDatetime,
        deliveryAdditionalInfo: '',
        description: note || '',
        orderProducts,
        priceTypeId: selectedPartner.priceTypeId || selectedWarehouse.priceTypeId,
        customerPriceTypeId: selectedPartner.priceTypeId || selectedWarehouse.priceTypeId,
        deliveryDate: null,
        isSale: selectedWarehouse.isSale || false,
        start_date: endDatetime,
        // Finish-specific fields
        latitudeFinish: userLocation.latitude,
        longitudeFinish: userLocation.longitude,
        paymentcheck: true, // Step 2 = true (Finish)
        useDiscount: true,
        end_date: endDatetime,
        // Loan fields
        loan: paymentCheck === 'loan',
        loanDescription: paymentCheck === 'loan' ? note : '',
      };

      // API call - Finish шууд ERP руу
      const apiUrl = `${ERP_BASE_URL}${ERP_ORDER_PATH}`;
      console.log('[Checkout] Calling ERP Finish:', apiUrl);
      console.log('[Checkout] Finish request:', JSON.stringify(finishRequest, null, 2));

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Basic ${ERP_AUTH}`,
        },
        body: JSON.stringify(finishRequest),
      });

      const data = await response.json();
      console.log('[Checkout] Finish response:', data);

      // Check success - ERP may return different success indicators
      if (data.success === true || data.status === 'success' || data.uuid || !data.error) {
        setOrderStatus('finished');
        setCurrentStep('success');
        // Сагс цэвэрлэх
        clearCart();
      } else {
        throw new Error(data.error || data.message || 'Баталгаажуулахад алдаа');
      }
    } catch (error: any) {
      console.error('[Checkout] Finish error:', error);
      setOrderError(error.message || 'Алдаа гарлаа');
      setOrderStatus('error');
      Alert.alert('Алдаа', error.message || 'Баталгаажуулахад алдаа гарлаа');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * renderStepIndicator: Step indicator UI
   */
  const renderStepIndicator = () => {
    const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

    return (
      <View style={styles.stepIndicator}>
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;

          return (
            <React.Fragment key={step.key}>
              <View style={[
                styles.stepCircle,
                isActive && styles.stepCircleActive,
                isCompleted && styles.stepCircleCompleted,
              ]}>
                {isCompleted ? (
                  <Check size={16} color="white" />
                ) : (
                  <Icon size={16} color={isActive ? 'white' : '#9CA3AF'} />
                )}
              </View>
              {index < STEPS.length - 1 && (
                <View style={[
                  styles.stepLine,
                  isCompleted && styles.stepLineCompleted,
                ]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  /**
   * renderReviewStep: Step 1 - Шалгах
   */
  const renderReviewStep = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Partner Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Харилцагч</Text>
        <View style={styles.infoCard}>
          <HStack style={{ alignItems: 'center', gap: 12 }}>
            <View style={styles.iconBox}>
              <Building2 size={20} color="#2563EB" />
            </View>
            <VStack style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>{selectedPartner?.name}</Text>
              {selectedPartner?.address && (
                <Text style={styles.infoSubtitle}>{selectedPartner.address}</Text>
              )}
            </VStack>
          </HStack>
        </View>
      </View>

      {/* Warehouse Info (Read-only) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Агуулах</Text>
        <View style={styles.infoCard}>
          <HStack style={{ alignItems: 'center', gap: 12 }}>
            <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
              <Package size={20} color="#D97706" />
            </View>
            <VStack style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>
                {selectedWarehouse?.name || 'Агуулах сонгогдоогүй'}
              </Text>
              <Text style={styles.infoSubtitle}>Захиалга энэ агуулахаас үүснэ</Text>
            </VStack>
          </HStack>
        </View>
      </View>

      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Захиалгын хураангуй</Text>
        <View style={styles.summaryCard}>
          <HStack style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Нийт төрөл</Text>
            <Text style={styles.summaryValue}>{items.length}</Text>
          </HStack>
          <HStack style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Нийт ширхэг</Text>
            <Text style={styles.summaryValue}>{totalItems}</Text>
          </HStack>
          <View style={styles.divider} />
          <HStack style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Нийт дүн</Text>
            <Text style={styles.summaryTotalValue}>{formattedTotal}</Text>
          </HStack>
        </View>
      </View>

      {/* Product List with PromoPoints */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Барааны жагсаалт</Text>
        <View style={styles.productListCard}>
          {items.map((item, index) => (
            <View key={item.id} style={[
              styles.productListItem,
              index < items.length - 1 && styles.productListItemBorder,
            ]}>
              <View style={styles.productListIndex}>
                <Text style={styles.productListIndexText}>{index + 1}</Text>
              </View>
              <VStack style={{ flex: 1 }}>
                <Text style={styles.productListName} numberOfLines={2}>{item.name}</Text>
                {/* PromoPoint Badge */}
                {item.promoPoint && item.promoPoint > 0 && (
                  <View style={styles.productPromoPointBadge}>
                    <Gift size={10} color="#F59E0B" />
                    <Text style={styles.productPromoPointText}>+{item.promoPoint} оноо</Text>
                  </View>
                )}
                <Text style={styles.productListQty}>
                  {item.stocks.map(s => `${s.count} ${s.typeName}`).join(' + ')} = {item.totalQuantity}ш
                </Text>
              </VStack>
              <Text style={styles.productListPrice}>{formatPrice(item.totalPrice)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Location Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Байршил</Text>
        <View style={[
          styles.infoCard,
          !userLocation && styles.infoCardWarning,
        ]}>
          <HStack style={{ alignItems: 'center', gap: 12 }}>
            <View style={[
              styles.iconBox,
              { backgroundColor: userLocation ? '#DCFCE7' : '#FEE2E2' }
            ]}>
              <MapPin size={20} color={userLocation ? '#e17100' : '#DC2626'} />
            </View>
            <VStack style={{ flex: 1 }}>
              {userLocation ? (
                <>
                  <Text style={styles.infoTitle}>Байршил тодорхойлогдсон</Text>
                  <Text style={styles.infoSubtitle}>
                    {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.infoTitle}>Байршил тодорхойлогдоогүй</Text>
                  <Text style={styles.infoSubtitle}>{locationError || 'Түр хүлээнэ үү...'}</Text>
                </>
              )}
            </VStack>
          </HStack>
        </View>
      </View>
    </ScrollView>
  );

  /**
   * renderPaymentStep: Step 2 - Төлбөрийн мэдээлэл
   * Draft захиалга илгээгдэнэ (ERP Step 1)
   */
  const renderPaymentStep = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Захиалгын хураангуй</Text>
        <View style={styles.summaryCard}>
          <HStack style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Харилцагч</Text>
            <Text style={styles.summaryValue}>{selectedPartner?.name}</Text>
          </HStack>
          <HStack style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Агуулах</Text>
            <Text style={styles.summaryValue}>{selectedWarehouse?.name}</Text>
          </HStack>
          <HStack style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Нийт төрөл</Text>
            <Text style={styles.summaryValue}>{items.length}</Text>
          </HStack>
          <HStack style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Нийт ширхэг</Text>
            <Text style={styles.summaryValue}>{totalItems}</Text>
          </HStack>
          <View style={styles.divider} />
          <HStack style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Нийт дүн</Text>
            <Text style={styles.summaryTotalValue}>{formattedTotal}</Text>
          </HStack>
        </View>
      </View>

      {/* Payment Method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Төлбөрийн хэлбэр</Text>
        <View style={styles.paymentOptions}>
          {[
            { key: 'cash', label: 'Бэлэн мөнгө' },
            { key: 'transfer', label: 'Шилжүүлэг' },
            { key: 'loan', label: 'Зээл' },
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.paymentOption,
                paymentCheck === option.key && styles.paymentOptionActive,
              ]}
              onPress={() => setPaymentCheck(option.key as any)}
            >
              <View style={[
                styles.radioOuter,
                paymentCheck === option.key && styles.radioOuterActive,
              ]}>
                {paymentCheck === option.key && <View style={styles.radioInner} />}
              </View>
              <Text style={[
                styles.paymentOptionText,
                paymentCheck === option.key && styles.paymentOptionTextActive,
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Note */}
      <View style={[styles.section, { marginBottom: 120 }]}>
        <Text style={styles.sectionTitle}>Тэмдэглэл</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="Нэмэлт тэмдэглэл..."
          placeholderTextColor="#9CA3AF"
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
        />
      </View>
    </ScrollView>
  );

  /**
   * renderConfirmStep: Step 3 - Баталгаажуулах
   * Finish захиалга илгээгдэнэ (ERP Step 2)
   */
  const renderConfirmStep = () => {
    // Current datetime for display
    const now = new Date();
    const endDateFormatted = now.toLocaleString('mn-MN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.confirmContent, { paddingTop: 20 }]}>
          <View style={styles.confirmIcon}>
            <Clock size={48} color="#2563EB" />
          </View>
          <Text style={styles.confirmTitle}>Draft захиалга үүслээ</Text>
          <Text style={styles.confirmSubtitle}>
            Захиалгын дугаар: {createdOrderCode}
          </Text>
          <Text style={styles.confirmDescription}>
            Захиалгыг баталгаажуулахын тулд доорх товчийг дарна уу.
            Баталгаажуулсны дараа засварлах боломжгүй болохыг анхаарна уу.
          </Text>

          {/* Order Summary */}
          <View style={styles.confirmSummary}>
            <HStack style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Харилцагч</Text>
              <Text style={styles.summaryValue}>{selectedPartner?.name}</Text>
            </HStack>
            <HStack style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Агуулах</Text>
              <Text style={styles.summaryValue}>{selectedWarehouse?.name}</Text>
            </HStack>
            <HStack style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Нийт дүн</Text>
              <Text style={styles.summaryValue}>{formattedTotal}</Text>
            </HStack>
            <HStack style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Төлбөр</Text>
              <Text style={styles.summaryValue}>
                {paymentCheck === 'cash' ? 'Бэлэн' : paymentCheck === 'transfer' ? 'Шилжүүлэг' : 'Зээл'}
              </Text>
            </HStack>
          </View>

          {/* Finish Step Info */}
          <View style={[styles.section, { marginTop: 16, width: '100%' }]}>
            <Text style={styles.sectionTitle}>Баталгаажуулах мэдээлэл</Text>
            <View style={styles.infoCard}>
              <VStack style={{ gap: 12 }}>
                {/* Location */}
                <HStack style={{ alignItems: 'center', gap: 12 }}>
                  <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
                    <MapPin size={18} color="#e17100" />
                  </View>
                  <VStack style={{ flex: 1 }}>
                    <Text style={styles.infoTitle}>Байршил (Finish)</Text>
                    <Text style={styles.infoSubtitle}>
                      {userLocation ? `${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}` : 'Байршил олдсонгүй'}
                    </Text>
                  </VStack>
                </HStack>

                {/* End Date */}
                <HStack style={{ alignItems: 'center', gap: 12 }}>
                  <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                    <Clock size={18} color="#D97706" />
                  </View>
                  <VStack style={{ flex: 1 }}>
                    <Text style={styles.infoTitle}>Дуусах огноо (end_date)</Text>
                    <Text style={styles.infoSubtitle}>{endDateFormatted}</Text>
                  </VStack>
                </HStack>

                {/* Payment Check */}
                <HStack style={{ alignItems: 'center', gap: 12 }}>
                  <View style={[styles.iconBox, { backgroundColor: '#DBEAFE' }]}>
                    <CreditCard size={18} color="#2563EB" />
                  </View>
                  <VStack style={{ flex: 1 }}>
                    <Text style={styles.infoTitle}>Төлбөр шалгах (paymentcheck)</Text>
                    <Text style={[styles.infoSubtitle, { color: '#e17100', fontFamily: 'GIP-SemiBold' }]}>true</Text>
                  </VStack>
                </HStack>

                {/* Finish Step */}
                <HStack style={{ alignItems: 'center', gap: 12 }}>
                  <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
                    <Check size={18} color="#DC2626" />
                  </View>
                  <VStack style={{ flex: 1 }}>
                    <Text style={styles.infoTitle}>Эцсийн алхам (finishStep)</Text>
                    <Text style={[styles.infoSubtitle, { color: '#DC2626', fontFamily: 'GIP-SemiBold' }]}>true</Text>
                  </VStack>
                </HStack>
              </VStack>
            </View>
          </View>
          {/* Bottom spacing for action button */}
          <View style={{ height: 120 }} />
        </View>
      </ScrollView>
    );
  };

  /**
   * renderSuccessStep: Step 4 - Амжилттай (Congratulations)
   */
  const renderSuccessStep = () => (
    <View style={styles.successContent}>
      <View style={styles.successIcon}>
        <CheckCircle size={80} color="#e17100" />
      </View>
      <Text style={styles.successTitle}>🎉 Баяр хүргэе!</Text>
      <Text style={styles.successSubtitle}>
        Захиалга амжилттай баталгаажлаа
      </Text>

      {/* Order Info Card */}
      <View style={[styles.confirmSummary, { marginTop: 24 }]}>
        <HStack style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Захиалгын дугаар</Text>
          <Text style={[styles.summaryValue, { color: '#e17100', fontFamily: 'GIP-Bold' }]}>{createdOrderCode}</Text>
        </HStack>
        <HStack style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Харилцагч</Text>
          <Text style={styles.summaryValue}>{selectedPartner?.name}</Text>
        </HStack>
        <HStack style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Агуулах</Text>
          <Text style={styles.summaryValue}>{selectedWarehouse?.name}</Text>
        </HStack>
        <View style={styles.divider} />
        <HStack style={styles.summaryRow}>
          <Text style={styles.summaryTotalLabel}>Нийт дүн</Text>
          <Text style={styles.summaryTotalValue}>{formattedTotal}</Text>
        </HStack>
      </View>

      <Text style={styles.successDescription}>
        Захиалга ERP систем дээр амжилттай бүртгэгдлээ.
        Та захиалгуудаа дараах хэсгээс харах боломжтой.
      </Text>

      <View style={styles.successActions}>
        <TouchableOpacity
          style={styles.successPrimaryButton}
          onPress={() => {
            clearCart();
            router.push('/orders');
          }}
        >
          <Text style={styles.successPrimaryButtonText}>Захиалгууд харах</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.successSecondaryButton}
          onPress={() => {
            clearCart();
            router.push('/partners');
          }}
        >
          <Text style={styles.successSecondaryButtonText}>Шинэ захиалга үүсгэх</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {currentStep !== 'success' && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color="#111827" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>
          {currentStep === 'review' && 'Захиалга шалгах'}
          {currentStep === 'payment' && 'Төлбөрийн мэдээлэл'}
          {currentStep === 'confirm' && 'Баталгаажуулах'}
          {currentStep === 'success' && 'Амжилттай'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Content */}
      {currentStep === 'review' && renderReviewStep()}
      {currentStep === 'payment' && renderPaymentStep()}
      {currentStep === 'confirm' && renderConfirmStep()}
      {currentStep === 'success' && renderSuccessStep()}

      {/* Bottom Action */}
      {currentStep !== 'success' && (
        <View style={styles.bottomAction}>
          {/* Step 1: Review -> Payment */}
          {currentStep === 'review' && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                (!selectedWarehouse || !userLocation) && styles.actionButtonDisabled,
              ]}
              onPress={() => setCurrentStep('payment')}
              disabled={!selectedWarehouse || !userLocation}
            >
              <Text style={styles.actionButtonText}>Үргэлжлүүлэх</Text>
              <ChevronLeft size={20} color="white" style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
          )}

          {/* Step 2: Payment -> Confirm (Draft илгээх) */}
          {currentStep === 'payment' && (
            <HStack style={{ gap: 12 }}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setCurrentStep('review')}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Буцах</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isSubmitting && styles.actionButtonDisabled,
                  { flex: 1 },
                ]}
                onPress={handleSubmitDraft}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Text style={styles.actionButtonText}>Draft илгээх</Text>
                    <ChevronLeft size={20} color="white" style={{ transform: [{ rotate: '180deg' }] }} />
                  </>
                )}
              </TouchableOpacity>
            </HStack>
          )}

          {/* Step 3: Confirm -> Success (Finish илгээх) */}
          {currentStep === 'confirm' && (
            <HStack style={{ gap: 12 }}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setCurrentStep('payment')}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Буцах</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isSubmitting && styles.actionButtonDisabled,
                  { flex: 1 },
                ]}
                onPress={handleFinishOrder}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Check size={20} color="white" />
                    <Text style={styles.actionButtonText}>Баталгаажуулах</Text>
                  </>
                )}
              </TouchableOpacity>
            </HStack>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
  },
  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#2563EB',
  },
  stepCircleCompleted: {
    backgroundColor: '#e17100',
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: '#E5E7EB',
  },
  stepLineCompleted: {
    backgroundColor: '#e17100',
  },
  // Content
  scrollContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#374151',
    marginBottom: 10,
  },
  // Info Card
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoCardWarning: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
  },
  infoSubtitle: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  // Select Card
  selectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionsList: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  optionItemActive: {
    backgroundColor: '#EFF6FF',
  },
  optionText: {
    fontSize: 14,
    fontFamily: 'GIP-Regular',
    color: '#374151',
  },
  optionTextActive: {
    fontFamily: 'GIP-Medium',
    color: '#2563EB',
  },
  // Summary Card
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryRow: {
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
  },
  summaryTotalValue: {
    fontSize: 16,
    fontFamily: 'GIP-Bold',
    color: '#e17100',
  },
  // Payment Options
  paymentOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  paymentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  paymentOptionActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: '#2563EB',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  paymentOptionText: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  paymentOptionTextActive: {
    fontFamily: 'GIP-Medium',
    color: '#2563EB',
  },
  // Note Input
  noteInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 14,
    fontFamily: 'GIP-Regular',
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // Bottom Action
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
    paddingBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  actionButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: 'GIP-SemiBold',
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
  },
  // Confirm Step
  confirmContent: {
    alignItems: 'center',
    padding: 24,
  },
  confirmIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  confirmTitle: {
    fontSize: 22,
    fontFamily: 'GIP-Bold',
    color: '#111827',
  },
  confirmSubtitle: {
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#2563EB',
    marginTop: 8,
  },
  confirmDescription: {
    fontSize: 14,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  confirmSummary: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  // Success Step
  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: 'GIP-Bold',
    color: '#e17100',
  },
  successSubtitle: {
    fontSize: 16,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
    marginTop: 8,
  },
  successDescription: {
    fontSize: 14,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  successActions: {
    width: '100%',
    marginTop: 32,
    gap: 12,
  },
  successPrimaryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  successPrimaryButtonText: {
    fontSize: 16,
    fontFamily: 'GIP-SemiBold',
    color: '#FFFFFF',
  },
  successSecondaryButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  successSecondaryButtonText: {
    fontSize: 16,
    fontFamily: 'GIP-SemiBold',
    color: '#374151',
  },
  // Product List
  productListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
  },
  productListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 10,
  },
  productListItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  productListIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productListIndexText: {
    fontSize: 11,
    fontFamily: 'GIP-Bold',
    color: '#2563EB',
  },
  productListName: {
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#111827',
    lineHeight: 18,
  },
  productListQty: {
    fontSize: 11,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  productListPrice: {
    fontSize: 13,
    fontFamily: 'GIP-Bold',
    color: '#e17100',
  },
  productPromoPointBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  productPromoPointText: {
    fontSize: 10,
    fontFamily: 'GIP-SemiBold',
    color: '#D97706',
  },
});
