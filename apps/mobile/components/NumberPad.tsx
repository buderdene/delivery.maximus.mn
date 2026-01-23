/**
 * NumberPad Component
 * 
 * Тоо оруулах дэлгэц - Захиалгын тоо оруулахад ашиглана
 * 
 * Features:
 * - StockType сонголт (PCS, PACK, BOX)
 * - MOQ шалгалт
 * - Үнийн тооцоолол
 * - Сагсанд нэмэх/хасах
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Image,
  Alert,
  Animated,
} from 'react-native';
import { 
  X, 
  Delete, 
  Package, 
  Minus, 
  Plus,
  Check,
  AlertCircle,
} from 'lucide-react-native';
import { Box, HStack, VStack, Text, Heading } from './ui';
import type { Product } from '../services/api';
import type { StockType, CartItemStock, ProductForCart } from '../stores/cart-store';

const { width, height } = Dimensions.get('window');

// Stock тоог format хийх - 5000+ гэх мэт
const formatStock = (stock: number): string => {
  if (stock >= 5000) return '5000+';
  return stock.toLocaleString();
};

interface NumberPadProps {
  visible: boolean;
  onClose: () => void;
  product: Product | null;
  /**
   * Callback: Бараа сагсанд нэмэх
   * @param product - Барааны мэдээлэл
   * @param stocks - StockType бүрийн тоо
   */
  onAddToCart: (product: ProductForCart, stocks: CartItemStock[]) => void;
  /**
   * Одоо сагсанд байгаа тоо (edit хийх үед)
   */
  currentStocks?: CartItemStock[];
  /**
   * Хямдралтай үнэ (isSale агуулах сонгосон үед)
   * Хэрэв undefined бол product.price ашиглана
   */
  discountedPrice?: number;
}

// NumberPad товчнууд
const NUMBER_BUTTONS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['C', '0', 'DEL'],
];

export function NumberPad({ 
  visible, 
  onClose, 
  product, 
  onAddToCart,
  currentStocks,
  discountedPrice,
}: NumberPadProps) {
  // Сонгосон stockType
  const [selectedStockType, setSelectedStockType] = useState<StockType | null>(null);
  // StockType бүрийн тоо хадгалах
  const [stockQuantities, setStockQuantities] = useState<Map<string, number>>(new Map());
  // Одоогийн input string
  const [inputValue, setInputValue] = useState('');
  // Анимац
  const [slideAnim] = useState(new Animated.Value(height));

  // Available stockTypes - onlyBoxSale байвал зөвхөн BOX
  const availableStockTypes = React.useMemo(() => {
    if (!product) return [];
    if (product.onlyBoxSale) {
      // Зөвхөн BOX (pcs >= 12 гэж үзнэ)
      const boxType = product.stockTypes.find(st => st.pcs >= 12);
      return boxType ? [boxType] : product.stockTypes.slice(-1);
    }
    return product.stockTypes || [];
  }, [product]);

  // Initialize values when modal opens
  useEffect(() => {
    if (visible && product) {
      // Initialize from currentStocks if editing
      const initialMap = new Map<string, number>();
      if (currentStocks) {
        currentStocks.forEach(stock => {
          initialMap.set(stock.typeId, stock.count);
        });
      }
      setStockQuantities(initialMap);
      
      // Select first stockType by default
      if (availableStockTypes.length > 0) {
        setSelectedStockType({
          uuid: availableStockTypes[0].uuid,
          name: availableStockTypes[0].name,
          pcs: availableStockTypes[0].pcs,
        });
        // Set input to current quantity
        const currentQty = initialMap.get(availableStockTypes[0].uuid) || 0;
        setInputValue(currentQty > 0 ? currentQty.toString() : '');
      }
      
      // Slide up animation
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      // Slide down animation
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, product, currentStocks, availableStockTypes]);

  // StockType солих
  const handleStockTypeSelect = useCallback((stockType: { uuid: string; name: string; pcs: number }) => {
    // Save current input before switching
    if (selectedStockType && inputValue) {
      const qty = parseInt(inputValue, 10) || 0;
      setStockQuantities(prev => {
        const newMap = new Map(prev);
        if (qty > 0) {
          newMap.set(selectedStockType.uuid, qty);
        } else {
          newMap.delete(selectedStockType.uuid);
        }
        return newMap;
      });
    }
    
    // Switch to new stockType
    setSelectedStockType({
      uuid: stockType.uuid,
      name: stockType.name,
      pcs: stockType.pcs,
    });
    
    // Load saved quantity for this stockType
    const savedQty = stockQuantities.get(stockType.uuid) || 0;
    setInputValue(savedQty > 0 ? savedQty.toString() : '');
  }, [selectedStockType, inputValue, stockQuantities]);

  // Тоо оруулах
  const handleNumberPress = useCallback((num: string) => {
    if (num === 'C') {
      setInputValue('');
    } else if (num === 'DEL') {
      setInputValue(prev => prev.slice(0, -1));
    } else {
      setInputValue(prev => {
        const newValue = prev + num;
        // Max 9999
        if (parseInt(newValue, 10) > 9999) return prev;
        return newValue;
      });
    }
  }, []);

  // +/- товчнууд
  const handleIncrement = useCallback(() => {
    setInputValue(prev => {
      const current = parseInt(prev, 10) || 0;
      return Math.min(current + 1, 9999).toString();
    });
  }, []);

  const handleDecrement = useCallback(() => {
    setInputValue(prev => {
      const current = parseInt(prev, 10) || 0;
      return Math.max(current - 1, 0).toString();
    });
  }, []);

  // Нийт PCS тоо тооцоолох
  const calculateTotalPcs = useCallback(() => {
    let total = 0;
    
    // Add saved quantities
    stockQuantities.forEach((qty, stockTypeId) => {
      const stockType = availableStockTypes.find(st => st.uuid === stockTypeId);
      if (stockType) {
        total += qty * stockType.pcs;
      }
    });
    
    // Add current input if not saved yet
    if (selectedStockType && inputValue) {
      const currentQty = parseInt(inputValue, 10) || 0;
      const savedQty = stockQuantities.get(selectedStockType.uuid) || 0;
      if (currentQty !== savedQty) {
        total += (currentQty - savedQty) * selectedStockType.pcs;
      }
    }
    
    return total;
  }, [stockQuantities, selectedStockType, inputValue, availableStockTypes]);

  // Нийт үнэ тооцоолох - хямдралтай үнэ ашиглах
  const calculateTotalPrice = useCallback(() => {
    if (!product) return 0;
    const priceToUse = discountedPrice !== undefined ? discountedPrice : product.price;
    return calculateTotalPcs() * (priceToUse || 0);
  }, [product, calculateTotalPcs, discountedPrice]);

  // MOQ шалгах
  const validateMOQ = useCallback(() => {
    if (!product) return { valid: true, message: '' };
    
    const totalPcs = calculateTotalPcs();
    
    if (totalPcs > 0 && totalPcs < product.moq) {
      return {
        valid: false,
        message: `Хамгийн багадаа ${product.moq} ширхэг захиалах шаардлагатай`,
      };
    }
    
    return { valid: true, message: '' };
  }, [product, calculateTotalPcs]);

  // Сагсанд нэмэх
  const handleAddToCart = useCallback(() => {
    if (!product || !selectedStockType) return;
    
    // Save current input
    const currentQty = parseInt(inputValue, 10) || 0;
    const finalQuantities = new Map(stockQuantities);
    
    if (currentQty > 0) {
      finalQuantities.set(selectedStockType.uuid, currentQty);
    } else {
      finalQuantities.delete(selectedStockType.uuid);
    }
    
    // Check if anything to add
    if (finalQuantities.size === 0) {
      Alert.alert('Анхааруулга', 'Тоо оруулна уу');
      return;
    }
    
    // Check MOQ
    let totalPcs = 0;
    finalQuantities.forEach((qty, stockTypeId) => {
      const stockType = availableStockTypes.find(st => st.uuid === stockTypeId);
      if (stockType) {
        totalPcs += qty * stockType.pcs;
      }
    });
    
    if (totalPcs < product.moq) {
      Alert.alert(
        'MOQ шаардлага',
        `Энэ барааг хамгийн багадаа ${product.moq} ширхэг захиалах шаардлагатай.\n\nОдоо: ${totalPcs} ширхэг`,
        [{ text: 'Ойлголоо' }]
      );
      return;
    }
    
    // Check stock
    if (totalPcs > product.stock) {
      Alert.alert(
        'Үлдэгдэл хүрэлцэхгүй',
        `Үлдэгдэл: ${product.stock} ширхэг\nЗахиалга: ${totalPcs} ширхэг`,
        [{ text: 'Ойлголоо' }]
      );
      return;
    }
    
    // Convert to CartItemStock array
    const stocks: CartItemStock[] = [];
    finalQuantities.forEach((qty, typeId) => {
      const stockType = availableStockTypes.find(st => st.uuid === typeId);
      if (stockType && qty > 0) {
        stocks.push({
          typeId: stockType.uuid,
          typeName: stockType.name,
          pcs: stockType.pcs,
          count: qty,
          totalPcs: qty * stockType.pcs,
        });
      }
    });
    
    // Create ProductForCart - use discountedPrice if provided (isSale warehouse)
    const finalPrice = discountedPrice !== undefined ? discountedPrice : product.price;
    
    const productForCart: ProductForCart = {
      id: product.uuid,
      name: product.name,
      code: product.code,
      price: finalPrice, // Хямдралтай үнэ (isSale = true үед 50% хямдрал)
      stock: product.stock,
      moq: product.moq,
      image: product.image,
      stockTypes: product.stockTypes,
      onlyBoxSale: product.onlyBoxSale,
      promoPoint: product.promoPoint || null,
    };
    
    onAddToCart(productForCart, stocks);
    onClose();
  }, [product, selectedStockType, inputValue, stockQuantities, availableStockTypes, onAddToCart, onClose, discountedPrice]);

  // MOQ validation result
  const moqValidation = validateMOQ();

  if (!product) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        
        <Animated.View 
          style={[
            styles.container,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Тоо оруулах</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Product Info */}
          <View style={styles.productInfo}>
            <View style={styles.productImage}>
              {product.image ? (
                <Image source={{ uri: product.image }} style={styles.image} />
              ) : (
                <Package size={32} color="#9CA3AF" />
              )}
            </View>
            <VStack style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
              <Text style={styles.productCode}>{product.code}</Text>
              <HStack style={{ marginTop: 4, gap: 8, alignItems: 'center' }}>
                {/* Show original price with strikethrough if discounted */}
                {discountedPrice !== undefined && (
                  <Text style={styles.productPriceOriginal}>
                    ₮{product.price?.toLocaleString()}
                  </Text>
                )}
                <Text style={[
                  styles.productPrice, 
                  discountedPrice !== undefined && styles.productPriceDiscounted
                ]}>
                  ₮{discountedPrice !== undefined ? discountedPrice.toLocaleString() : product.price?.toLocaleString()}
                </Text>
                {discountedPrice !== undefined && (
                  <View style={styles.saleBadge}>
                    <Text style={styles.saleBadgeText}>-50%</Text>
                  </View>
                )}
                <Text style={styles.productStock}>Үлдэгдэл: {formatStock(product.stock)}</Text>
              </HStack>
            </VStack>
          </View>

          {/* StockType Selection */}
          <View style={styles.stockTypeSection}>
            <Text style={styles.sectionLabel}>Нэгж сонгох</Text>
            <HStack style={{ gap: 8, flexWrap: 'wrap' }}>
              {availableStockTypes.map((stockType) => {
                const isSelected = selectedStockType?.uuid === stockType.uuid;
                const qty = stockType.uuid === selectedStockType?.uuid 
                  ? (parseInt(inputValue, 10) || 0)
                  : (stockQuantities.get(stockType.uuid) || 0);
                
                return (
                  <TouchableOpacity
                    key={stockType.uuid}
                    style={[
                      styles.stockTypeButton,
                      isSelected && styles.stockTypeButtonActive,
                      qty > 0 && !isSelected && styles.stockTypeButtonWithQty,
                    ]}
                    onPress={() => handleStockTypeSelect(stockType)}
                  >
                    <Text style={[
                      styles.stockTypeName,
                      isSelected && styles.stockTypeNameActive,
                    ]}>
                      {stockType.name}
                    </Text>
                    <Text style={[
                      styles.stockTypePcs,
                      isSelected && styles.stockTypePcsActive,
                    ]}>
                      {stockType.pcs} ш
                    </Text>
                    {qty > 0 && (
                      <View style={[
                        styles.qtyBadge,
                        isSelected && styles.qtyBadgeActive,
                      ]}>
                        <Text style={[
                          styles.qtyBadgeText,
                          isSelected && styles.qtyBadgeTextActive,
                        ]}>
                          {qty}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </HStack>
          </View>

          {/* Quantity Input Display */}
          <View style={styles.inputSection}>
            <TouchableOpacity 
              style={styles.adjustButton}
              onPress={handleDecrement}
            >
              <Minus size={24} color="#374151" />
            </TouchableOpacity>
            
            <View style={styles.inputDisplay}>
              <Text style={styles.inputValue}>
                {inputValue || '0'}
              </Text>
              <Text style={styles.inputUnit}>
                {selectedStockType?.name || 'PCS'}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.adjustButton}
              onPress={handleIncrement}
            >
              <Plus size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* MOQ Warning */}
          {!moqValidation.valid && (
            <View style={styles.moqWarning}>
              <AlertCircle size={16} color="#DC2626" />
              <Text style={styles.moqWarningText}>{moqValidation.message}</Text>
            </View>
          )}

          {/* Summary */}
          <View style={styles.summary}>
            <HStack style={{ justifyContent: 'space-between' }}>
              <Text style={styles.summaryLabel}>Нийт ширхэг:</Text>
              <Text style={styles.summaryValue}>{calculateTotalPcs()} ш</Text>
            </HStack>
            <HStack style={{ justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={styles.summaryLabel}>Нийт дүн:</Text>
              <Text style={styles.summaryPrice}>₮{calculateTotalPrice().toLocaleString()}</Text>
            </HStack>
            {product.moq > 1 && (
              <Text style={styles.moqInfo}>MOQ: {product.moq} ширхэг</Text>
            )}
          </View>

          {/* Number Pad */}
          <View style={styles.numberPad}>
            {NUMBER_BUTTONS.map((row, rowIndex) => (
              <HStack key={rowIndex} style={styles.numberRow}>
                {row.map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.numberButton,
                      num === 'C' && styles.clearButton,
                      num === 'DEL' && styles.deleteButton,
                    ]}
                    onPress={() => handleNumberPress(num)}
                  >
                    {num === 'DEL' ? (
                      <Delete size={24} color="#DC2626" />
                    ) : (
                      <Text style={[
                        styles.numberText,
                        num === 'C' && styles.clearText,
                      ]}>
                        {num}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </HStack>
            ))}
          </View>

          {/* Add to Cart Button */}
          <TouchableOpacity
            style={[
              styles.addButton,
              (!moqValidation.valid || calculateTotalPcs() === 0) && styles.addButtonDisabled,
            ]}
            onPress={handleAddToCart}
            disabled={!moqValidation.valid || calculateTotalPcs() === 0}
          >
            <Check size={20} color="white" />
            <Text style={styles.addButtonText}>
              Сагсанд нэмэх
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    maxHeight: height * 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
  },
  // Product Info
  productInfo: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#F9FAFB',
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  productName: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
    lineHeight: 20,
  },
  productCode: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  productPrice: {
    fontSize: 14,
    fontFamily: 'GIP-Bold',
    color: '#2563EB',
  },
  productPriceOriginal: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  productPriceDiscounted: {
    color: '#DC2626', // Улаан өнгө - хямдралтай үнэ
  },
  saleBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  saleBadgeText: {
    fontSize: 10,
    fontFamily: 'GIP-Bold',
    color: '#FFFFFF',
  },
  productStock: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#e17100',
  },
  // StockType Selection
  stockTypeSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
    marginBottom: 10,
  },
  stockTypeButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    minWidth: 90,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stockTypeButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  stockTypeButtonWithQty: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  stockTypeName: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#374151',
  },
  stockTypeNameActive: {
    color: '#FFFFFF',
  },
  stockTypePcs: {
    fontSize: 11,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  stockTypePcsActive: {
    color: '#BFDBFE',
  },
  qtyBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  qtyBadgeActive: {
    backgroundColor: '#FFFFFF',
  },
  qtyBadgeText: {
    fontSize: 11,
    fontFamily: 'GIP-Bold',
    color: '#FFFFFF',
  },
  qtyBadgeTextActive: {
    color: '#2563EB',
  },
  // Input Section
  inputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  adjustButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputDisplay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    minHeight: 60,
  },
  inputValue: {
    fontSize: 36,
    fontFamily: 'GIP-Bold',
    color: '#111827',
    minWidth: 60,
    textAlign: 'center',
    lineHeight: 44,
    includeFontPadding: false,
  },
  inputUnit: {
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
    marginTop: 4,
  },
  // MOQ Warning
  moqWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  moqWarningText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#DC2626',
  },
  // Summary
  summary: {
    backgroundColor: '#F9FAFB',
    marginHorizontal: 20,
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
  },
  summaryPrice: {
    fontSize: 16,
    fontFamily: 'GIP-Bold',
    color: '#2563EB',
  },
  moqInfo: {
    fontSize: 11,
    fontFamily: 'GIP-Regular',
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'right',
  },
  // Number Pad
  numberPad: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 6,
  },
  numberRow: {
    gap: 6,
    justifyContent: 'center',
  },
  numberButton: {
    width: (width - 64) / 3,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    backgroundColor: '#FEF3C7',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  numberText: {
    fontSize: 20,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
  },
  clearText: {
    color: '#D97706',
  },
  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: 'GIP-SemiBold',
    color: '#FFFFFF',
  },
});

export default NumberPad;
