/**
 * САГС ХУУДАС
 * 
 * Сагсанд нэмсэн барааг харуулах, засварлах, захиалга үүсгэх
 * 
 * ============================================================================
 * БИЗНЕС ЛОГИК
 * ============================================================================
 * 
 * 1. САГСНЫ ЖАГСААЛТ
 *    - Бараа бүрийн stockTypes бүрийн тоо харуулна
 *    - Нийт ширхэг, нийт дүн
 *    - MOQ анхааруулга (улаан)
 * 
 * 2. БАРАА ЗАСВАРЛАХ
 *    - Бараа дээр дарахад NumberPad нээгдэнэ
 *    - Тоо өөрчилж болно
 *    - Устгах товч
 * 
 * 3. ЗАХИАЛГА ҮҮСГЭХ
 *    - "Захиалга үүсгэх" товч дарахад checkout руу шилжинэ
 *    - MOQ шаардлага хангаагүй бол анхааруулга
 * 
 * ============================================================================
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Trash2,
  Package,
  ShoppingCart,
  User,
  AlertCircle,
  Minus,
  Plus,
  Edit3,
  Gift,
} from 'lucide-react-native';
import { Box, HStack, VStack, Text, Heading } from '../../components/ui';
import { useCartStore, type CartItem, type ProductForCart, type CartItemStock } from '../../stores/cart-store';
import { NumberPad } from '../../components/NumberPad';
import type { Product } from '../../services/api';

const { width } = Dimensions.get('window');

export default function CartScreen() {
  const router = useRouter();
  
  // Cart Store
  const {
    items,
    selectedPartner,
    isEmpty,
    itemCount,
    totalItems,
    totalAmount,
    formattedTotal,
    removeItem,
    clearCart,
    getItemByProductId,
    validateCart,
  } = useCartStore();
  
  // NumberPad state
  const [showNumberPad, setShowNumberPad] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingStocks, setEditingStocks] = useState<CartItemStock[] | undefined>(undefined);
  
  // Cart Store addItem function
  const { addItem } = useCartStore();
  
  /**
   * handleEditItem: Бараа засах
   */
  const handleEditItem = useCallback((item: CartItem) => {
    // Convert CartItem back to Product-like object for NumberPad
    const productLike: Product = {
      uuid: item.productId,
      name: item.name,
      code: item.article || '',
      barcode: null,
      price: item.price,
      moq: item.moq,
      stock: item.maxQuantity,
      brand: null,
      category: null,
      unit: null,
      image: item.imageUrl,
      isActive: true,
      stockTypes: item.stockTypes.map(st => ({
        uuid: st.uuid,
        name: st.name,
        pcs: st.pcs,
      })),
      onlyBoxSale: item.onlyBoxSale,
      promoPoint: item.promoPoint,
    };
    
    setEditingProduct(productLike);
    setEditingStocks(item.stocks);
    setShowNumberPad(true);
  }, []);
  
  /**
   * handleUpdateItem: NumberPad-с update ирэхэд
   */
  const handleUpdateItem = useCallback((product: ProductForCart, stocks: CartItemStock[]) => {
    addItem(product, stocks);
    setShowNumberPad(false);
    setEditingProduct(null);
    setEditingStocks(undefined);
  }, [addItem]);
  
  /**
   * handleRemoveItem: Бараа устгах
   */
  const handleRemoveItem = useCallback((item: CartItem) => {
    Alert.alert(
      'Бараа устгах',
      `"${item.name}" барааг сагснаас устгах уу?`,
      [
        { text: 'Үгүй', style: 'cancel' },
        { 
          text: 'Тийм', 
          style: 'destructive',
          onPress: () => removeItem(item.productId),
        },
      ]
    );
  }, [removeItem]);
  
  /**
   * handleClearCart: Сагс цэвэрлэх
   */
  const handleClearCart = useCallback(() => {
    Alert.alert(
      'Сагс цэвэрлэх',
      'Бүх барааг сагснаас устгах уу?',
      [
        { text: 'Үгүй', style: 'cancel' },
        { 
          text: 'Тийм', 
          style: 'destructive',
          onPress: clearCart,
        },
      ]
    );
  }, [clearCart]);
  
  /**
   * handleCheckout: Захиалга үүсгэх
   */
  const handleCheckout = useCallback(() => {
    const validation = validateCart();
    
    if (!validation.isValid) {
      Alert.alert(
        'Алдаа',
        validation.errors.join('\n'),
        [{ text: 'Ойлголоо' }]
      );
      return;
    }
    
    if (validation.warnings.length > 0) {
      Alert.alert(
        'Анхааруулга',
        validation.warnings.join('\n'),
        [
          { text: 'Болих', style: 'cancel' },
          { text: 'Үргэлжлүүлэх', onPress: () => router.push('/checkout') },
        ]
      );
      return;
    }
    
    router.push('/checkout');
  }, [validateCart, router]);
  
  /**
   * formatPrice: Мөнгөн дүн форматлах
   */
  const formatPrice = (price: number) => {
    return '₮' + price.toLocaleString();
  };
  
  /**
   * renderCartItem: Сагсны бараа
   */
  const renderCartItem = ({ item, index }: { item: CartItem; index: number }) => {
    const isMOQMet = item.totalQuantity >= item.moq;
    
    return (
      <View style={[styles.cartItem, !isMOQMet && styles.cartItemWarning]}>
        {/* Row 1: Image + Info */}
        <HStack style={styles.cartItemMain}>
          {/* Image */}
          <View style={styles.itemImage}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.image} />
            ) : (
              <Package size={28} color="#9CA3AF" />
            )}
          </View>
          
          {/* Info */}
          <VStack style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.itemName} numberOfLines={2}>
              <Text style={styles.itemIndex}>{index + 1}. </Text>
              {item.name}
            </Text>
            
            {/* PromoPoint Badge */}
            {item.promoPoint && item.promoPoint > 0 && (
              <View style={styles.promoPointBadge}>
                <Gift size={12} color="#F59E0B" />
                <Text style={styles.promoPointText}>+{item.promoPoint} оноо</Text>
              </View>
            )}
            
            <Text style={styles.itemCode}>{item.article}</Text>
            
            {/* StockTypes breakdown */}
            <HStack style={{ flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {item.stocks.map((stock) => (
                <View key={stock.typeId} style={styles.stockBadge}>
                  <Text style={styles.stockBadgeText}>
                    {stock.count} {stock.typeName}
                  </Text>
                  <Text style={styles.stockPcsText}>
                    ({stock.totalPcs}ш)
                  </Text>
                </View>
              ))}
            </HStack>
          </VStack>
          
          {/* Actions */}
          <VStack style={{ alignItems: 'flex-end', gap: 8 }}>
            <Text style={styles.itemPrice}>{formatPrice(item.totalPrice)}</Text>
            <Text style={styles.itemQty}>{item.totalQuantity} ширхэг</Text>
            
            <HStack style={{ gap: 8 }}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEditItem(item)}
              >
                <Edit3 size={16} color="#2563EB" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleRemoveItem(item)}
              >
                <Trash2 size={16} color="#DC2626" />
              </TouchableOpacity>
            </HStack>
          </VStack>
        </HStack>
        
        {/* MOQ Warning */}
        {!isMOQMet && (
          <View style={styles.moqWarning}>
            <AlertCircle size={14} color="#DC2626" />
            <Text style={styles.moqWarningText}>
              MOQ: {item.moq} ширхэг (одоо {item.totalQuantity})
            </Text>
          </View>
        )}
      </View>
    );
  };
  
  /**
   * renderEmptyCart: Хоосон сагс
   */
  const renderEmptyCart = () => (
    <View style={styles.emptyContainer}>
      <ShoppingCart size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>Сагс хоосон байна</Text>
      <Text style={styles.emptySubtitle}>
        Бараа нэмэхийн тулд барааны жагсаалт руу очно уу
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => router.push('/products')}
      >
        <Text style={styles.emptyButtonText}>Бараа харах</Text>
      </TouchableOpacity>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <VStack style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Сагс</Text>
          {!isEmpty && (
            <Text style={styles.headerSubtitle}>{itemCount} төрөл · {totalItems} ширхэг</Text>
          )}
        </VStack>
        {!isEmpty && (
          <TouchableOpacity onPress={handleClearCart} style={styles.clearButton}>
            <Trash2 size={20} color="#DC2626" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Selected Partner Info */}
      {selectedPartner && (
        <View style={styles.partnerBar}>
          <User size={16} color="#2563EB" />
          <Text style={styles.partnerName} numberOfLines={1}>
            {selectedPartner.name}
          </Text>
          {selectedPartner.phone && (
            <Text style={styles.partnerPhone}>{selectedPartner.phone}</Text>
          )}
        </View>
      )}
      
      {/* Content */}
      {isEmpty ? (
        renderEmptyCart()
      ) : (
        <>
          {/* Cart Items */}
          <FlatList
            data={items}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
          
          {/* Bottom Summary */}
          <View style={styles.bottomSummary}>
            {/* Summary Row */}
            <View style={styles.summaryRow}>
              <VStack>
                <Text style={styles.summaryLabel}>Нийт дүн</Text>
                <Text style={styles.summaryAmount}>{formattedTotal}</Text>
              </VStack>
              
              <TouchableOpacity
                style={styles.checkoutButton}
                onPress={handleCheckout}
              >
                <Text style={styles.checkoutButtonText}>Захиалга үүсгэх</Text>
                <ChevronLeft size={20} color="white" style={{ transform: [{ rotate: '180deg' }] }} />
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
      
      {/* NumberPad for editing */}
      <NumberPad
        visible={showNumberPad}
        onClose={() => {
          setShowNumberPad(false);
          setEditingProduct(null);
          setEditingStocks(undefined);
        }}
        product={editingProduct}
        onAddToCart={handleUpdateItem}
        currentStocks={editingStocks}
      />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  clearButton: {
    padding: 8,
  },
  // Partner Bar
  partnerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  partnerName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#2563EB',
  },
  partnerPhone: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  // List
  listContent: {
    padding: 16,
    paddingBottom: 120,
  },
  // Cart Item
  cartItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cartItemWarning: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  cartItemMain: {
    alignItems: 'flex-start',
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  itemIndex: {
    fontSize: 13,
    fontFamily: 'GIP-Bold',
    color: '#2563EB',
  },
  itemName: {
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#111827',
    lineHeight: 20,
  },
  itemCode: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  stockBadgeText: {
    fontSize: 12,
    fontFamily: 'GIP-SemiBold',
    color: '#2563EB',
  },
  stockPcsText: {
    fontSize: 10,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  // Promo Point Badge
  promoPointBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  promoPointText: {
    fontSize: 11,
    fontFamily: 'GIP-SemiBold',
    color: '#D97706',
  },
  itemPrice: {
    fontSize: 16,
    fontFamily: 'GIP-Bold',
    color: '#e17100',
  },
  itemQty: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // MOQ Warning
  moqWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FCA5A5',
    gap: 6,
  },
  moqWarningText: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#DC2626',
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'GIP-SemiBold',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyButtonText: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#FFFFFF',
  },
  // Bottom Summary
  bottomSummary: {
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
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  summaryAmount: {
    fontSize: 22,
    fontFamily: 'GIP-Bold',
    color: '#111827',
    marginTop: 2,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  checkoutButtonText: {
    fontSize: 15,
    fontFamily: 'GIP-SemiBold',
    color: '#FFFFFF',
  },
});
