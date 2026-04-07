/**
 * БАРААНЫ ЖАГСААЛТ ДЭЛГЭЦ
 * 
 * API: GET /hs/pr/Products
 * Parameters: page, pageSize, warehouseId, routeId, priceTypeId, companyId, name, article, brands, categories, sortBy, sortOrder
 * 
 * FEATURES:
 * - Grid/List view toggle
 * - Search барааны нэр, код-р
 * - Infinite scroll pagination
 * - Brand/Category шүүлтүүр
 * - NumberPad тоо оруулах
 * - StockType сонголт (PCS, PACK, BOX)
 * - MOQ шалгалт
 * - Сагсанд нэмэх
 * 
 * ============================================================================
 * БИЗНЕС ЛОГИК
 * ============================================================================
 * 
 * 1. STOCKTYPES
 *    - API-с stockTypes массив ирнэ: [{ uuid, name, pcs }]
 *    - PCS = 1 ширхэг, PACK = N ширхэг, BOX = M ширхэг
 *    - onlyBoxSale = true бол зөвхөн BOX сонголт
 * 
 * 2. MOQ (Minimum Order Quantity)
 *    - Нийт PCS >= MOQ байх ёстой
 *    - MOQ хангаагүй бол сагсанд нэмэхгүй
 * 
 * 3. САГСАНД НЭМЭХ
 *    - NumberPad дээр тоо оруулж confirm хийнэ
 *    - Харилцагч сонгоогүй бол анхааруулга
 *    - Агуулах солигдоход prices өөрчлөгдөнө
 * 
 * ============================================================================
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Image,
  Dimensions,
  Modal,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Search,
  Grid3X3,
  List,
  Package,
  X,
  Filter,
  Plus,
  Minus,
  ShoppingCart,
  Check,
  ChevronDown,
  User,
} from 'lucide-react-native';
import { Box, HStack, VStack, Text, Heading } from '../../components/ui';
import { useAuthStore } from '../../stores/auth-store';
import { useCartStore, type ProductForCart, type CartItemStock } from '../../stores/cart-store';
import { useWarehouseStore } from '../../stores/warehouse-store';
import { useTemplateStore } from '../../stores/template-store';
import { getProducts, type Product, type Category, type Brand } from '../../services/api';
import { NumberPad } from '../../components/NumberPad';
import { useLocalSearchParams } from 'expo-router';

const { width } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (width - 24) / 2; // 2 columns with 8px padding each side + 8px gap

// Stock тоог format хийх - 5000+ гэх мэт
const formatStock = (stock: number): string => {
  if (stock >= 5000) return '5000+';
  return stock.toLocaleString();
};

export default function ProductsScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isTemplateMode = mode === 'template';
  const { erpDetails } = useAuthStore();

  // Cart Store
  const {
    selectedPartner,
    items: cartItems,
    addItem,
    getItemQuantity,
    getCartItemCount,
  } = useCartStore();

  // Warehouse Store
  const { selectedWarehouse, getSelectedPriceTypeId } = useWarehouseStore();

  // Template Store
  const {
    templates,
    isInitialized: templatesInitialized,
    initDatabase,
    loadTemplates,
    addToTemplate,
    isInTemplate,
  } = useTemplateStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filter States
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]); // All brands from products
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([]); // Filtered by category
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(false);

  // NumberPad States
  const [showNumberPad, setShowNumberPad] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const PAGE_SIZE = 20;
  const cartItemCount = getCartItemCount();

  // Get warehouse and route info from erpDetails or selected warehouse
  const warehouseId = selectedWarehouse?.uuid || erpDetails?.[0]?.warehouses?.[0]?.uuid || '';
  const routeId = erpDetails?.[0]?.routeId || '';
  // БИЗНЕС ЛОГИК: Харилцагчийн гэрээний үнийн төрөл байвал тэрийг ашиглана (жнь: НОМИН ҮНЭ)
  // Байхгүй бол агуулахын үнийн төрөлийг ашиглана
  const priceTypeId = selectedPartner?.priceTypeId || getSelectedPriceTypeId() || erpDetails?.[0]?.warehouses?.[0]?.priceTypeId || '';

  // Extract unique categories and brands from all products
  const fetchFiltersFromProducts = useCallback(async () => {
    if (!warehouseId || !routeId || !priceTypeId) return;

    setFiltersLoading(true);

    // Fetch all products (large page size to get all)
    const result = await getProducts({
      page: 1,
      pageSize: 1000, // Get all products to extract categories/brands
      warehouseId,
      routeId,
      priceTypeId,
    });

    if (result.success && result.data) {
      // Extract unique categories from products
      const uniqueCategories = new Map<string, Category>();
      const uniqueBrands = new Map<string, Brand>();

      result.data.forEach(product => {
        // Add category if exists
        if (product.category?.uuid && product.category?.name) {
          uniqueCategories.set(product.category.uuid, {
            uuid: product.category.uuid,
            name: product.category.name,
          });
        }

        // Add brand if exists (with categoryUID for filtering)
        if (product.brand?.uuid && product.brand?.name) {
          uniqueBrands.set(product.brand.uuid, {
            uuid: product.brand.uuid,
            name: product.brand.name,
            categoryUID: product.category?.uuid, // Link brand to category
          });
        }
      });

      // Sort alphabetically
      const sortedCategories = Array.from(uniqueCategories.values()).sort((a, b) => a.name.localeCompare(b.name));
      const sortedBrands = Array.from(uniqueBrands.values()).sort((a, b) => a.name.localeCompare(b.name));

      setCategories(sortedCategories);
      setAllBrands(sortedBrands);
      setFilteredBrands(sortedBrands);
    }

    setFiltersLoading(false);
  }, [warehouseId, routeId, priceTypeId]);

  // Load filters from products on mount
  useEffect(() => {
    fetchFiltersFromProducts();
  }, [warehouseId, routeId, priceTypeId]);

  // Initialize template database and load templates for template mode
  useEffect(() => {
    if (isTemplateMode) {
      if (!templatesInitialized) {
        initDatabase();
      }
      if (templatesInitialized && selectedPartner?.id) {
        loadTemplates(selectedPartner.id);
      }
    }
  }, [isTemplateMode, templatesInitialized, selectedPartner?.id, initDatabase, loadTemplates]);

  // When category selection changes, filter brands client-side
  useEffect(() => {
    if (selectedCategories.length === 1) {
      // Filter brands by categoryUID matching the selected category
      const filtered = allBrands.filter(brand => brand.categoryUID === selectedCategories[0]);
      setFilteredBrands(filtered);
    } else if (selectedCategories.length > 1) {
      // Filter brands matching any of the selected categories
      const filtered = allBrands.filter(brand => selectedCategories.includes(brand.categoryUID || ''));
      setFilteredBrands(filtered);
    } else {
      // No category selected - show all brands
      setFilteredBrands(allBrands);
    }
  }, [selectedCategories, allBrands]);

  const fetchProducts = useCallback(async (pageNum: number = 1, isRefresh: boolean = false) => {
    if (!warehouseId || !routeId || !priceTypeId) {
      setError('Агуулах эсвэл маршрут олдсонгүй');
      setIsLoading(false);
      return;
    }

    if (pageNum === 1) {
      if (!isRefresh) setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    const result = await getProducts({
      page: pageNum,
      pageSize: PAGE_SIZE,
      warehouseId,
      routeId,
      priceTypeId,
      name: searchQuery || undefined,
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      brands: selectedBrands.length > 0 ? selectedBrands : undefined,
    });

    if (result.success && result.data) {
      if (pageNum === 1) {
        setProducts(result.data);
      } else {
        setProducts(prev => [...prev, ...result.data!]);
      }
      setTotalCount(result.totalRecords || 0);
      setHasMore(result.data.length === PAGE_SIZE);
      setError(null);
    } else {
      setError(result.error || 'Бараа татахад алдаа');
    }

    setIsLoading(false);
    setIsLoadingMore(false);
    setRefreshing(false);
  }, [warehouseId, routeId, priceTypeId, searchQuery, selectedCategories, selectedBrands]);

  useEffect(() => {
    setPage(1);
    fetchProducts(1);
  }, [searchQuery, selectedCategories, selectedBrands]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchProducts(1, true);
  }, [fetchProducts]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && !isLoading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProducts(nextPage);
    }
  }, [isLoadingMore, hasMore, isLoading, page, fetchProducts]);

  // Filter handlers
  const toggleCategory = (uuid: string) => {
    setSelectedCategories(prev => {
      const newSelection = prev.includes(uuid)
        ? prev.filter(id => id !== uuid)
        : [...prev, uuid];

      // When category changes, clear selected brands (they may not be available)
      setSelectedBrands([]);

      return newSelection;
    });
  };

  const toggleBrand = (uuid: string) => {
    setSelectedBrands(prev =>
      prev.includes(uuid)
        ? prev.filter(id => id !== uuid)
        : [...prev, uuid]
    );
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
  };

  const applyFilters = () => {
    setShowFilterModal(false);
  };

  const activeFiltersCount = selectedCategories.length + selectedBrands.length;

  // ============================================================================
  // ХЯМДРАЛТАЙ ҮНЭ ТООЦООЛОХ (isSale = true үед 50% хямдрал)
  // ============================================================================

  /**
   * isSaleWarehouse: Сонгосон агуулах хямдралтай эсэх
   * isSale = true үед бүх барааны үнэ 50% хямдарна
   */
  const isSaleWarehouse = selectedWarehouse?.isSale || false;

  /**
   * getDiscountedPrice: Хямдралтай үнэ тооцоолох
   * @param originalPrice - Үндсэн үнэ
   * @returns Хямдралтай үнэ (isSale = true бол 50% хямдрал)
   */
  const getDiscountedPrice = useCallback((originalPrice: number | undefined | null): number => {
    if (originalPrice == null) return 0;
    if (isSaleWarehouse) {
      return Math.round(originalPrice * 0.5); // 50% хямдрал
    }
    return originalPrice;
  }, [isSaleWarehouse]);

  /**
   * formatPrice: Үнэ форматлах (зөвхөн хямдралтай үнэ буцаана)
   */
  const formatPrice = (price: number | undefined | null): string => {
    if (price == null) return '₮0';
    const discountedPrice = getDiscountedPrice(price);
    return `₮${discountedPrice.toLocaleString()}`;
  };

  // ============================================================================
  // БАРАА САГСАНД НЭМЭХ HANDLERS
  // ============================================================================

  /**
   * handleProductPress: Бараа дээр дарсан үед NumberPad нээх
   */
  const handleProductPress = useCallback((product: Product) => {
    // Харилцагч сонгоогүй бол анхааруулга
    if (!selectedPartner) {
      Alert.alert(
        'Харилцагч сонгоно уу',
        'Бараа сагсалахын өмнө харилцагч сонгох шаардлагатай.',
        [
          { text: 'Болих', style: 'cancel' },
          {
            text: 'Харилцагч сонгох',
            onPress: () => router.push('/partners'),
          },
        ]
      );
      return;
    }

    // Template mode - add to template directly
    if (isTemplateMode) {
      handleAddToTemplate(product);
      return;
    }

    setSelectedProduct(product);
    setShowNumberPad(true);
  }, [selectedPartner, router, isTemplateMode]);

  /**
   * handleAddToTemplate: Загварт нэмэх
   */
  const handleAddToTemplate = useCallback((product: Product) => {
    if (!selectedPartner?.id) return;

    // Check if already in template
    if (isInTemplate(selectedPartner.id, product.uuid)) {
      Alert.alert('Мэдээлэл', 'Энэ бараа аль хэдийн загварт нэмэгдсэн байна.');
      return;
    }

    // Get default stock type (first one or BOX if available)
    const defaultStockType = product.stockTypes?.find(st => st.name === 'BOX') || product.stockTypes?.[0];

    addToTemplate(selectedPartner.id, {
      productId: product.uuid,
      productName: product.name,
      productPrice: product.price,
      productMoq: product.moq,
      quantity: product.moq || 1,
      stockTypeId: defaultStockType?.uuid,
      stockTypeName: defaultStockType?.name,
      brandName: product.brand?.name,
      categoryName: product.category?.name,
    });

    Alert.alert('Амжилттай', `"${product.name}" загварт нэмэгдлээ`);
  }, [selectedPartner?.id, addToTemplate, isInTemplate]);

  /**
   * handleAddToCart: NumberPad-с confirm хийсэн үед
   */
  const handleAddToCart = useCallback((product: ProductForCart, stocks: CartItemStock[]) => {
    addItem(product, stocks);

    // Амжилттай нэмсэн мессеж
    // Alert биш toast ашиглах нь дээр, одоогоор Alert
    // Toast component нэмж болно
  }, [addItem]);

  /**
   * getProductCartQuantity: Бараа сагсанд хэдэн ширхэг байгааг авах
   */
  const getProductCartQuantity = useCallback((productId: string) => {
    return getItemQuantity(productId);
  }, [getItemQuantity]);


  const renderGridItem = ({ item, index }: { item: Product; index: number }) => {
    const cartQty = getProductCartQuantity(item.uuid);
    const isInCart = cartQty > 0;
    const isInTemplateList = isTemplateMode && selectedPartner?.id && isInTemplate(selectedPartner.id, item.uuid);

    return (
      <TouchableOpacity
        style={[
          styles.gridItem,
          isInCart && styles.gridItemInCart,
          isInTemplateList && styles.gridItemInTemplate
        ]}
        activeOpacity={0.7}
        onPress={() => handleProductPress(item)}
      >
        {/* Product Image with Stock Badge */}
        <View style={styles.gridImageContainer}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.gridImage} resizeMode="cover" />
          ) : (
            <Package size={36} color="#D1D5DB" />
          )}

          {/* Stock Badge - Top Right */}
          <View style={styles.gridStockBadge}>
            <Text style={styles.gridStockText}>{formatStock(item.stock || 0)}</Text>
          </View>

          {/* Brand Badge - Top Left */}
          {item.brand?.name && (
            <View style={styles.gridBrandBadge}>
              <Text style={styles.gridBrandText} numberOfLines={1}>{item.brand.name}</Text>
            </View>
          )}

          {/* Cart Quantity Badge - Bottom Right */}
          {isInCart && (
            <View style={styles.gridCartBadge}>
              <Text style={styles.gridCartBadgeText}>{cartQty}</Text>
            </View>
          )}

          {/* Template Badge - Show if in template */}
          {isInTemplateList && (
            <View style={styles.gridTemplateBadge}>
              <Check size={12} color="#FFFFFF" />
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.gridInfo}>
          {/* Product Code */}
          <Text style={styles.gridProductCode}>{item.code}</Text>

          {/* Product Name with Index */}
          <Text style={styles.gridProductName} numberOfLines={2}>
            <Text style={styles.gridIndexText}>{index + 1}. </Text>{item.name}
          </Text>

          {/* MOQ indicator */}
          {item.moq > 1 && (
            <Text style={styles.gridMoqText}>MOQ: {item.moq}</Text>
          )}

          {/* Price Row - 50% хямдралтай үнэ isSale үед */}
          <View style={styles.gridPriceRow}>
            <View style={{ flex: 1 }}>
              {isSaleWarehouse && (
                <Text style={styles.gridPriceOriginal}>₮{item.price?.toLocaleString()}</Text>
              )}
              <Text style={[styles.gridPrice, isSaleWarehouse && styles.gridPriceDiscounted]}>
                {formatPrice(item.price)}
              </Text>
            </View>

            {/* Add to Cart Button */}
            <TouchableOpacity
              style={[styles.gridAddButton, isInCart && styles.gridAddButtonInCart]}
              activeOpacity={0.8}
              onPress={() => handleProductPress(item)}
            >
              {isInCart ? (
                <Check size={14} color="#FFFFFF" />
              ) : (
                <Plus size={14} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Sale Badge */}
          {isSaleWarehouse && (
            <View style={styles.saleBadge}>
              <Text style={styles.saleBadgeText}>-50%</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderListItem = ({ item, index }: { item: Product; index: number }) => {
    const cartQty = getProductCartQuantity(item.uuid);
    const isInCart = cartQty > 0;

    return (
      <TouchableOpacity
        style={[styles.listItem, isInCart && styles.listItemInCart]}
        activeOpacity={0.7}
        onPress={() => handleProductPress(item)}
      >
        {/* Product Image */}
        <View style={styles.listImageContainer}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.listImage} resizeMode="cover" />
          ) : (
            <Package size={28} color="#9CA3AF" />
          )}
          {/* Cart indicator on image */}
          {isInCart && (
            <View style={styles.listCartBadge}>
              <Text style={styles.listCartBadgeText}>{cartQty}</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <VStack style={{ flex: 1, gap: 2 }}>
          <Text style={styles.listProductName} numberOfLines={2}>
            <Text style={styles.listIndexText}>{index + 1}. </Text>{item.name}
          </Text>
          <Text style={styles.listProductCode}>{item.code}</Text>

          <HStack style={{ alignItems: 'center', gap: 8, marginTop: 4 }}>
            {item.brand?.name && (
              <View style={styles.brandBadgeSmall}>
                <Text style={styles.brandTextSmall}>{item.brand.name}</Text>
              </View>
            )}
            {item.category?.name && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category.name}</Text>
              </View>
            )}
            {item.moq > 1 && (
              <View style={styles.moqBadge}>
                <Text style={styles.moqBadgeText}>MOQ:{item.moq}</Text>
              </View>
            )}
            {/* Sale Badge for list view */}
            {isSaleWarehouse && (
              <View style={styles.saleBadgeSmall}>
                <Text style={styles.saleBadgeSmallText}>-50%</Text>
              </View>
            )}
          </HStack>
        </VStack>

        {/* Price & Stock */}
        <VStack style={{ alignItems: 'flex-end', gap: 4 }}>
          {/* Price with discount indicator */}
          {isSaleWarehouse && (
            <Text style={styles.listPriceOriginal}>₮{item.price?.toLocaleString()}</Text>
          )}
          <Text style={[styles.listPrice, isSaleWarehouse && styles.listPriceDiscounted]}>
            {formatPrice(item.price)}
          </Text>
          <View style={styles.stockBadgeSmall}>
            <Text style={styles.stockTextSmall}>{formatStock(item.stock || 0)} ш</Text>
          </View>
          {/* Add button */}
          <TouchableOpacity
            style={[styles.listAddButton, isInCart && styles.listAddButtonInCart]}
            onPress={() => handleProductPress(item)}
          >
            {isInCart ? (
              <Check size={16} color="#FFFFFF" />
            ) : (
              <Plus size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </VStack>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#2563EB" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, isTemplateMode && styles.headerTemplate]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <VStack style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {isTemplateMode ? 'Загварт бараа нэмэх' : 'Барааны жагсаалт'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isTemplateMode
              ? `${selectedPartner?.name || ''} - ${templates.filter(t => t.partnerId === selectedPartner?.id).length} загвар`
              : `${totalCount.toLocaleString()} бараа`
            }
          </Text>
        </VStack>
        <HStack style={{ gap: 8 }}>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'grid' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('grid')}
          >
            <Grid3X3 size={18} color={viewMode === 'grid' ? '#FFFFFF' : '#6B7280'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <List size={18} color={viewMode === 'list' ? '#FFFFFF' : '#6B7280'} />
          </TouchableOpacity>
          {/* Cart Button - hide in template mode */}
          {!isTemplateMode && (
            <TouchableOpacity
              style={styles.cartButton}
              onPress={() => router.push('/cart')}
            >
              <ShoppingCart size={20} color="#2563EB" />
              {cartItemCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </HStack>
      </View>

      {/* Selected Partner Info Bar */}
      {selectedPartner && (
        <TouchableOpacity
          style={styles.partnerBar}
          onPress={() => router.push(`/partner/${selectedPartner.id}`)}
        >
          <User size={16} color="#2563EB" />
          <Text style={styles.partnerBarText} numberOfLines={1}>
            {selectedPartner.name}
          </Text>
          {cartItemCount > 0 && (
            <View style={styles.partnerCartInfo}>
              <ShoppingCart size={12} color="#e17100" />
              <Text style={styles.partnerCartText}>{cartItemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Search size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Бараа хайх..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Button */}
          <TouchableOpacity
            style={[styles.filterButton, activeFiltersCount > 0 && styles.filterButtonActive]}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter size={18} color={activeFiltersCount > 0 ? '#FFFFFF' : '#6B7280'} />
            {activeFiltersCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.activeFiltersContainer}
            contentContainerStyle={styles.activeFiltersContent}
          >
            {selectedCategories.map(catId => {
              const cat = categories.find(c => c.uuid === catId);
              return cat ? (
                <TouchableOpacity
                  key={catId}
                  style={styles.activeFilterChip}
                  onPress={() => toggleCategory(catId)}
                >
                  <Text style={styles.activeFilterChipText} numberOfLines={1}>{cat.name}</Text>
                  <X size={12} color="#92400E" />
                </TouchableOpacity>
              ) : null;
            })}
            {selectedBrands.map(brandId => {
              const brand = allBrands.find(b => b.uuid === brandId);
              return brand ? (
                <TouchableOpacity
                  key={brandId}
                  style={[styles.activeFilterChip, styles.activeFilterChipBrand]}
                  onPress={() => toggleBrand(brandId)}
                >
                  <Text style={styles.activeFilterChipText} numberOfLines={1}>{brand.name}</Text>
                  <X size={12} color="#92400E" />
                </TouchableOpacity>
              ) : null;
            })}
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={clearAllFilters}
            >
              <Text style={styles.clearFiltersText}>Цэвэрлэх</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* Filter Modal - Full Screen from Right */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <SafeAreaView style={styles.filterModalContainer}>
          {/* Modal Header */}
          <View style={styles.filterModalHeader}>
            <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.filterBackButton}>
              <ChevronLeft size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.filterModalTitle}>Шүүлтүүр</Text>
            <TouchableOpacity onPress={clearAllFilters} style={styles.filterClearAllButton}>
              <Text style={styles.filterClearAllText}>Цэвэрлэх</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Content - Categories and Brands in one scroll */}
          <ScrollView style={styles.filterScrollView} showsVerticalScrollIndicator={false}>
            {/* Categories Section */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>
                Ангилал {selectedCategories.length > 0 && `(${selectedCategories.length})`}
              </Text>
              {filtersLoading ? (
                <View style={styles.filterLoadingContainer}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.filterLoadingText}>Ачаалж байна...</Text>
                </View>
              ) : categories.length === 0 ? (
                <View style={styles.filterEmptyContainer}>
                  <Text style={styles.filterEmptyText}>Ангилал олдсонгүй</Text>
                </View>
              ) : (
                <View style={styles.filterChipsContainer}>
                  {categories.map(cat => (
                    <TouchableOpacity
                      key={cat.uuid}
                      style={[styles.filterChip, selectedCategories.includes(cat.uuid) && styles.filterChipSelected]}
                      onPress={() => toggleCategory(cat.uuid)}
                    >
                      <Text style={[styles.filterChipText, selectedCategories.includes(cat.uuid) && styles.filterChipTextSelected]}>
                        {cat.name}
                      </Text>
                      {selectedCategories.includes(cat.uuid) && (
                        <Check size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Brands Section */}
            <View style={styles.filterSection}>
              <View style={styles.filterSectionHeader}>
                <Text style={styles.filterSectionTitle}>
                  Брэнд {selectedBrands.length > 0 && `(${selectedBrands.length})`}
                </Text>
                {selectedCategories.length > 0 && (
                  <Text style={styles.filterSectionSubtitle}>
                    {selectedCategories.length === 1
                      ? `${categories.find(c => c.uuid === selectedCategories[0])?.name || ''} ангиллын`
                      : `${selectedCategories.length} ангиллын`
                    }
                  </Text>
                )}
              </View>
              {filtersLoading ? (
                <View style={styles.filterLoadingContainer}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.filterLoadingText}>Ачаалж байна...</Text>
                </View>
              ) : filteredBrands.length === 0 ? (
                <View style={styles.filterEmptyContainer}>
                  <Text style={styles.filterEmptyText}>
                    {selectedCategories.length > 0 ? 'Энэ ангилалд брэнд олдсонгүй' : 'Брэнд олдсонгүй'}
                  </Text>
                </View>
              ) : (
                <View style={styles.filterChipsContainer}>
                  {filteredBrands.map(brand => (
                    <TouchableOpacity
                      key={brand.uuid}
                      style={[styles.filterChip, styles.filterChipBrand, selectedBrands.includes(brand.uuid) && styles.filterChipBrandSelected]}
                      onPress={() => toggleBrand(brand.uuid)}
                    >
                      <Text style={[styles.filterChipText, styles.filterChipBrandText, selectedBrands.includes(brand.uuid) && styles.filterChipBrandTextSelected]}>
                        {brand.name}
                      </Text>
                      {selectedBrands.includes(brand.uuid) && (
                        <Check size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.filterModalFooter}>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={applyFilters}
            >
              <Filter size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.applyButtonText}>
                Хэрэглэх {activeFiltersCount > 0 && `(${activeFiltersCount})`}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Ачаалж байна...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Package size={48} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchProducts(1)}>
            <Text style={styles.retryButtonText}>Дахин оролдох</Text>
          </TouchableOpacity>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.centerContainer}>
          <Package size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>Бараа олдсонгүй</Text>
        </View>
      ) : viewMode === 'grid' ? (
        <FlatList
          key="grid"
          data={products}
          renderItem={renderGridItem}
          keyExtractor={(item) => item.uuid}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
        />
      ) : (
        <FlatList
          key="list"
          data={products}
          renderItem={renderListItem}
          keyExtractor={(item) => item.uuid}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
        />
      )}

      {/* NumberPad Modal */}
      <NumberPad
        visible={showNumberPad}
        onClose={() => {
          setShowNumberPad(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onAddToCart={handleAddToCart}
        currentStocks={
          selectedProduct
            ? cartItems.find(i => i.productId === selectedProduct.uuid)?.stocks
            : undefined
        }
        discountedPrice={
          selectedProduct && isSaleWarehouse
            ? getDiscountedPrice(selectedProduct.price)
            : undefined
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
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
  headerTemplate: {
    backgroundColor: '#EEF2FF', // Light purple for template mode
    borderBottomColor: '#C7D2FE',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  viewModeButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  viewModeButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  // Cart button in header
  cartButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    fontSize: 10,
    fontFamily: 'GIP-Bold',
    color: '#FFFFFF',
  },
  // Partner info bar
  partnerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  partnerBarText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#2563EB',
  },
  partnerCartInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  partnerCartText: {
    fontSize: 11,
    fontFamily: 'GIP-Bold',
    color: '#e17100',
  },
  searchContainer: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    fontFamily: 'GIP-Regular',
    color: '#111827',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: '#2563EB',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 10,
    fontFamily: 'GIP-Bold',
    color: '#FFFFFF',
  },
  activeFiltersContainer: {
    marginTop: 10,
  },
  activeFiltersContent: {
    gap: 8,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(254, 243, 199, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    maxWidth: 150,
  },
  activeFilterChipBrand: {
    backgroundColor: 'rgba(251, 191, 36, 0.25)',
  },
  activeFilterChipText: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#92400E',
  },
  clearFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearFiltersText: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#DC2626',
  },
  // Filter Modal Styles - Full Screen
  filterModalContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterBackButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterModalTitle: {
    fontSize: 17,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
  },
  filterClearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterClearAllText: {
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#DC2626',
  },
  filterModalFooter: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  // Old modal styles (keeping for reference, can be removed later)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
  },
  filterScrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  filterLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  filterLoadingText: {
    fontSize: 13,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  filterEmptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  filterEmptyText: {
    fontSize: 13,
    fontFamily: 'GIP-Regular',
    color: '#9CA3AF',
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#F9FAFB',
  },
  filterItemSelected: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  filterItemText: {
    fontSize: 14,
    fontFamily: 'GIP-Regular',
    color: '#374151',
  },
  filterItemTextSelected: {
    fontFamily: 'GIP-Medium',
    color: '#2563EB',
  },
  // Filter Chips Styles
  filterSection: {
    marginBottom: 20,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterSectionTitle: {
    fontSize: 15,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  filterSectionSubtitle: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  filterChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#374151',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  filterChipBrand: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  filterChipBrandSelected: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  filterChipBrandText: {
    color: '#92400E',
  },
  filterChipBrandTextSelected: {
    color: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  clearButtonText: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#6B7280',
  },
  applyButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  applyButtonText: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#DC2626',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#FFFFFF',
  },
  // Grid Styles
  gridContainer: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  gridItem: {
    width: GRID_ITEM_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  gridIndexText: {
    fontSize: 12,
    fontFamily: 'GIP-Bold',
    color: '#2563EB',
  },
  gridImageContainer: {
    width: '100%',
    height: GRID_ITEM_WIDTH * 0.7,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridStockBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  gridStockText: {
    fontSize: 10,
    fontFamily: 'GIP-SemiBold',
    color: '#78350F',
  },
  gridBrandBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(254, 243, 199, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: '55%',
  },
  gridBrandText: {
    fontSize: 9,
    fontFamily: 'GIP-Medium',
    color: '#92400E',
  },
  gridInfo: {
    padding: 10,
  },
  gridProductCode: {
    fontSize: 9,
    fontFamily: 'GIP-Regular',
    color: '#9CA3AF',
    marginBottom: 2,
  },
  gridProductName: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#111827',
    lineHeight: 16,
    minHeight: 32,
  },
  gridPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  gridPrice: {
    fontSize: 14,
    fontFamily: 'GIP-Bold',
    color: '#e17100',
  },
  gridAddButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridAddButtonInCart: {
    backgroundColor: '#e17100',
  },
  gridItemInCart: {
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  gridItemInTemplate: {
    borderWidth: 2,
    borderColor: '#7C3AED',
    backgroundColor: '#FAF5FF',
  },
  gridTemplateBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCartBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  gridCartBadgeText: {
    fontSize: 11,
    fontFamily: 'GIP-Bold',
    color: '#FFFFFF',
  },
  gridMoqText: {
    fontSize: 10,
    fontFamily: 'GIP-Medium',
    color: '#F59E0B',
    marginTop: 2,
  },
  stockBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 10,
    fontFamily: 'GIP-SemiBold',
    color: '#2563EB',
  },
  brandBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  brandText: {
    fontSize: 9,
    fontFamily: 'GIP-Medium',
    color: '#7C3AED',
  },
  // List Styles
  listContainer: {
    padding: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  listItemInCart: {
    borderColor: '#f59e0b',
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  listCartBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  listCartBadgeText: {
    fontSize: 10,
    fontFamily: 'GIP-Bold',
    color: '#FFFFFF',
  },
  listAddButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  listAddButtonInCart: {
    backgroundColor: '#e17100',
  },
  moqBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  moqBadgeText: {
    fontSize: 9,
    fontFamily: 'GIP-Medium',
    color: '#D97706',
  },
  listIndexText: {
    fontSize: 13,
    fontFamily: 'GIP-Bold',
    color: '#2563EB',
  },
  listImageContainer: {
    width: 56,
    height: 56,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  listProductName: {
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#111827',
    lineHeight: 18,
  },
  listProductCode: {
    fontSize: 11,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  listPrice: {
    fontSize: 14,
    fontFamily: 'GIP-Bold',
    color: '#e17100',
  },
  stockBadgeSmall: {
    backgroundColor: 'rgba(251, 191, 36, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockTextSmall: {
    fontSize: 10,
    fontFamily: 'GIP-SemiBold',
    color: '#92400E',
  },
  brandBadgeSmall: {
    backgroundColor: 'rgba(254, 243, 199, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  brandTextSmall: {
    fontSize: 9,
    fontFamily: 'GIP-Medium',
    color: '#92400E',
  },
  categoryBadge: {
    backgroundColor: 'rgba(254, 243, 199, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 9,
    fontFamily: 'GIP-Medium',
    color: '#92400E',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  // ============================================================================
  // ХЯМДРАЛТАЙ ҮНЭ STYLES (isSale = true, 50% хямдрал)
  // ============================================================================
  gridPriceOriginal: {
    fontSize: 11,
    fontFamily: 'GIP-Regular',
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  gridPriceDiscounted: {
    color: '#DC2626', // Улаан өнгө - хямдралтай үнэ
  },
  listPriceOriginal: {
    fontSize: 11,
    fontFamily: 'GIP-Regular',
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  listPriceDiscounted: {
    color: '#DC2626', // Улаан өнгө - хямдралтай үнэ
  },
  saleBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
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
  saleBadgeSmall: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  saleBadgeSmallText: {
    fontSize: 9,
    fontFamily: 'GIP-Bold',
    color: '#FFFFFF',
  },
});
