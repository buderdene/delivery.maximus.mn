/**
 * САГС ТАБ
 * 
 * Footer menu-н Сагс таб
 * - Сонгосон харилцагчийн мэдээлэл
 * - Урамшууллын үлдэгдэл оноо
 * - Сагсны товч мэдээлэл
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ShoppingCart, 
  User, 
  Gift, 
  ChevronRight,
  Package,
  MapPin,
  Phone,
} from 'lucide-react-native';
import { Box, VStack, HStack, Text, Heading } from '../../components/ui';
import { useCartStore } from '../../stores/cart-store';

export default function CartTabScreen() {
  const router = useRouter();
  
  const {
    selectedPartner,
    hasPartner,
    items,
    itemCount,
    totalItems,
    totalAmount,
    formattedTotal,
    isEmpty,
  } = useCartStore();

  /**
   * formatBalance: Мөнгөн дүн форматлах
   */
  const formatBalance = (balance?: number | null) => {
    if (!balance) return '0₮';
    return balance.toLocaleString() + '₮';
  };

  return (
    <Box className="flex-1 bg-background-50">
      {/* Selected Partner Info */}
      {hasPartner && selectedPartner ? (
        <View style={styles.container}>
          {/* Partner Card */}
          <View style={styles.partnerCard}>
            <View style={styles.partnerHeader}>
              <View style={styles.partnerIconBox}>
                <User size={24} color="#2563EB" />
              </View>
              <VStack style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.partnerName} numberOfLines={2}>
                  {selectedPartner.name}
                </Text>
                {selectedPartner.address && (
                  <HStack style={{ alignItems: 'center', marginTop: 4 }}>
                    <MapPin size={12} color="#6B7280" />
                    <Text style={styles.partnerAddress} numberOfLines={1}>
                      {selectedPartner.address}
                    </Text>
                  </HStack>
                )}
                {selectedPartner.phone && (
                  <HStack style={{ alignItems: 'center', marginTop: 2 }}>
                    <Phone size={12} color="#6B7280" />
                    <Text style={styles.partnerPhone}>{selectedPartner.phone}</Text>
                  </HStack>
                )}
              </VStack>
            </View>
            
            {/* Promo Point Balance */}
            <View style={styles.promoCard}>
              <View style={styles.promoIconBox}>
                <Gift size={20} color="#F59E0B" />
              </View>
              <VStack style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.promoLabel}>Урамшууллын үлдэгдэл</Text>
                <Text style={styles.promoAmount}>
                  {formatBalance(selectedPartner.totalDiscountAmount)}
                </Text>
              </VStack>
            </View>
          </View>
          
          {/* Cart Summary */}
          <View style={styles.cartSummary}>
            <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.summaryTitle}>Сагсны мэдээлэл</Text>
              <TouchableOpacity 
                style={styles.viewCartButton}
                onPress={() => router.push('/cart')}
              >
                <Text style={styles.viewCartText}>Дэлгэрэнгүй</Text>
                <ChevronRight size={16} color="#2563EB" />
              </TouchableOpacity>
            </HStack>
            
            {isEmpty ? (
              <View style={styles.emptyCart}>
                <ShoppingCart size={32} color="#D1D5DB" />
                <Text style={styles.emptyCartText}>Сагс хоосон байна</Text>
              </View>
            ) : (
              <View style={styles.cartStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{itemCount}</Text>
                  <Text style={styles.statLabel}>төрөл</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{totalItems}</Text>
                  <Text style={styles.statLabel}>ширхэг</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValueLarge}>{formattedTotal}</Text>
                  <Text style={styles.statLabel}>нийт дүн</Text>
                </View>
              </View>
            )}
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.productsButton}
              onPress={() => router.push('/products')}
            >
              <Package size={20} color="#FFFFFF" />
              <Text style={styles.productsButtonText}>Бараа нэмэх</Text>
            </TouchableOpacity>
            
            {!isEmpty && (
              <TouchableOpacity 
                style={styles.checkoutButton}
                onPress={() => router.push('/checkout')}
              >
                <ShoppingCart size={20} color="#2563EB" />
                <Text style={styles.checkoutButtonText}>Захиалга үүсгэх</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        /* No Partner Selected */
        <View style={styles.noPartnerContainer}>
          <View style={styles.noPartnerIcon}>
            <User size={48} color="#D1D5DB" />
          </View>
          <Heading size="lg" className="text-typography-700 text-center mt-4">
            Харилцагч сонгоогүй
          </Heading>
          <Text size="md" className="text-typography-500 text-center mt-2">
            Захиалга үүсгэхийн тулд эхлээд харилцагч сонгоно уу
          </Text>
          <TouchableOpacity 
            style={styles.selectPartnerButton}
            onPress={() => router.push('/partners')}
          >
            <Text style={styles.selectPartnerButtonText}>Харилцагч сонгох</Text>
          </TouchableOpacity>
        </View>
      )}
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  // Partner Card
  partnerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  partnerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  partnerIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerName: {
    fontSize: 16,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
  },
  partnerAddress: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginLeft: 4,
    flex: 1,
  },
  partnerPhone: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginLeft: 4,
  },
  // Promo Card
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  promoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoLabel: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#92400E',
  },
  promoAmount: {
    fontSize: 18,
    fontFamily: 'GIP-Bold',
    color: '#D97706',
  },
  // Cart Summary
  cartSummary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
  },
  viewCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewCartText: {
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#2563EB',
  },
  emptyCart: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyCartText: {
    fontSize: 14,
    fontFamily: 'GIP-Regular',
    color: '#9CA3AF',
    marginTop: 8,
  },
  cartStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'GIP-Bold',
    color: '#111827',
  },
  statValueLarge: {
    fontSize: 18,
    fontFamily: 'GIP-Bold',
    color: '#e17100',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
  },
  // Actions
  actions: {
    gap: 12,
  },
  productsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  productsButtonText: {
    fontSize: 15,
    fontFamily: 'GIP-SemiBold',
    color: '#FFFFFF',
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  checkoutButtonText: {
    fontSize: 15,
    fontFamily: 'GIP-SemiBold',
    color: '#2563EB',
  },
  // No Partner
  noPartnerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  noPartnerIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectPartnerButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 24,
  },
  selectPartnerButtonText: {
    fontSize: 15,
    fontFamily: 'GIP-SemiBold',
    color: '#FFFFFF',
  },
});
