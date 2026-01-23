/**
 * АГУУЛАХ СОНГОХ ДЭЛГЭЦ
 * 
 * ErpDetails-д байгаа warehouses жагсаалтаас агуулах сонгоно
 * Агуулах солиход:
 * - priceTypeId өөрчлөгдөнө (үнэ өөр болно)
 * - Сагс цэвэрлэгдэнэ
 * 
 * ============================================================================
 */

import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  Warehouse as WarehouseIcon, 
  Check,
  MapPin,
} from 'lucide-react-native';
import { Text as RNText } from 'react-native';
import { useAuthStore } from '../../stores/auth-store';
import { useWarehouseStore, type Warehouse } from '../../stores/warehouse-store';
import { useCartStore } from '../../stores/cart-store';

export default function WarehouseScreen() {
  const router = useRouter();
  const { erpDetails } = useAuthStore();
  const { 
    selectedWarehouse, 
    selectWarehouse,
    warehouses,
    setWarehouses,
    setErpDetails,
  } = useWarehouseStore();
  const { items: cartItems, clearCart } = useCartStore();

  // Initialize warehouses from erpDetails if not set
  React.useEffect(() => {
    if (erpDetails && erpDetails.length > 0) {
      const details = erpDetails[0];
      setErpDetails(details);
      if (details.warehouses && details.warehouses.length > 0) {
        setWarehouses(details.warehouses);
      }
    }
  }, [erpDetails, setErpDetails, setWarehouses]);

  // Handle warehouse selection
  const handleSelectWarehouse = useCallback((warehouse: Warehouse) => {
    // If same warehouse, just go back
    if (selectedWarehouse?.uuid === warehouse.uuid) {
      router.back();
      return;
    }

    // If cart has items, show warning
    if (cartItems.length > 0) {
      Alert.alert(
        'Агуулах солих',
        'Агуулах солиход сагсны бараа устана. Үргэлжлүүлэх үү?',
        [
          { text: 'Болих', style: 'cancel' },
          { 
            text: 'Тийм', 
            style: 'destructive',
            onPress: () => {
              clearCart();
              selectWarehouse(warehouse);
              router.back();
            }
          },
        ]
      );
    } else {
      selectWarehouse(warehouse);
      router.back();
    }
  }, [selectedWarehouse, cartItems, clearCart, selectWarehouse, router]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#374151" />
        </TouchableOpacity>
        <RNText style={styles.headerTitle}>Агуулах сонгох</RNText>
        <View style={{ width: 40 }} />
      </View>

      {/* Current Selection Info */}
      {selectedWarehouse && (
        <View style={styles.currentSection}>
          <RNText style={styles.currentLabel}>Одоо сонгогдсон:</RNText>
          <View style={styles.currentWarehouse}>
            <WarehouseIcon size={20} color="#2563EB" />
            <RNText style={styles.currentName}>{selectedWarehouse.name}</RNText>
          </View>
        </View>
      )}

      {/* Warehouse List */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        <RNText style={styles.sectionTitle}>Агуулахын жагсаалт</RNText>
        
        {warehouses.length === 0 ? (
          <View style={styles.emptyState}>
            <WarehouseIcon size={48} color="#D1D5DB" />
            <RNText style={styles.emptyText}>Агуулах олдсонгүй</RNText>
          </View>
        ) : (
          warehouses.map((warehouse) => {
            const isSelected = selectedWarehouse?.uuid === warehouse.uuid;
            const isDefault = warehouse.isdefault;
            
            return (
              <TouchableOpacity
                key={warehouse.uuid}
                style={[
                  styles.warehouseItem,
                  isSelected && styles.warehouseItemSelected,
                ]}
                onPress={() => handleSelectWarehouse(warehouse)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.warehouseIcon,
                  isSelected && styles.warehouseIconSelected,
                ]}>
                  <WarehouseIcon size={22} color={isSelected ? '#FFFFFF' : '#6B7280'} />
                </View>
                
                <View style={styles.warehouseInfo}>
                  <View style={styles.warehouseNameRow}>
                    <RNText style={[
                      styles.warehouseName,
                      isSelected && styles.warehouseNameSelected,
                    ]}>
                      {warehouse.name}
                    </RNText>
                    {isDefault && (
                      <View style={styles.defaultBadge}>
                        <RNText style={styles.defaultBadgeText}>Үндсэн</RNText>
                      </View>
                    )}
                    {/* isSale badge - 50% хямдрал */}
                    {warehouse.isSale && (
                      <View style={styles.saleBadge}>
                        <RNText style={styles.saleBadgeText}>-50%</RNText>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.warehouseMeta}>
                    <MapPin size={12} color="#9CA3AF" />
                    <RNText style={styles.warehouseMetaText}>
                      {warehouse.isSale ? 'Хямдралтай үнээр' : 'Стандарт үнэ'}
                    </RNText>
                  </View>
                </View>

                {isSelected && (
                  <View style={styles.checkIcon}>
                    <Check size={20} color="#2563EB" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Info Note */}
      <View style={styles.infoNote}>
        <RNText style={styles.infoNoteText}>
          ⚠️ Агуулах солиход барааны үнэ болон үлдэгдэл өөрчлөгдөнө
        </RNText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
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
  currentSection: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  currentLabel: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  currentWarehouse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentName: {
    fontSize: 15,
    fontFamily: 'GIP-SemiBold',
    color: '#1E40AF',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'GIP-Regular',
    color: '#9CA3AF',
    marginTop: 12,
  },
  warehouseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  warehouseItemSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  warehouseIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warehouseIconSelected: {
    backgroundColor: '#2563EB',
  },
  warehouseInfo: {
    flex: 1,
    marginLeft: 12,
  },
  warehouseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  warehouseName: {
    fontSize: 15,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
  },
  warehouseNameSelected: {
    color: '#1E40AF',
  },
  defaultBadge: {
    backgroundColor: '#e17100',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontFamily: 'GIP-Medium',
    color: '#FFFFFF',
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
  warehouseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  warehouseMetaText: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoNote: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoNoteText: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#92400E',
    textAlign: 'center',
  },
});
