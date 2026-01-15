'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Package, Search, Grid, List, Loader2, ShoppingCart, Check, Building2, Tag, Info, X, Boxes, PackageOpen, Hash, FileText, Layers, Bookmark, Scale, Gift, Percent, AlertTriangle, Barcode } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useProductStore } from '@/stores/product-store';
import { useCartStore } from '@/stores/cart-store';
import { useWarehouseStore } from '@/stores/warehouse-store';
import { useTranslation } from '@/hooks/useTranslation';
import { QuantityKeypad } from '@/components/cart/QuantityKeypad';
import { toast } from 'sonner';
import type { Product } from '@/types';
import { CategorySidebar } from '@/components/products/CategorySidebar';

// Product detail type from API
interface ProductDetail {
  uuid: string;
  name: string;
  article: string;
  price: number;
  barcode?: string;
  brand?: { uuid: string; name: string };
  category?: { uuid: string; name: string };
  uom?: { uuid: string; name: string };
  imgUrl?: string;
  image?: string;
  imageUrl?: string;
  main_image_url?: string;
  stock?: Array<{ typeId: string; count: number }>;
  stockTypes?: Array<{ uuid: string; name: string; pcs: number }>;
  description?: string;
  moq?: number;
  isUnderStock?: boolean;
  promotions?: Array<{ uuid: string; name: string }>;
  discountPoint?: Array<{ discountPointID: string; discountPointName: string; discountPointAmount: number }>;
  expireDates?: Array<{ serialNumber: string | null; expireDate: string }>;
}

// Product Loading Skeleton
function ProductSkeleton() {
  return (
    <Card className="overflow-hidden border border-gray-100 bg-white rounded-xl sm:rounded-2xl">
      <div className="p-2 sm:p-3 pb-1 sm:pb-2">
        <div className="aspect-square bg-gray-100 rounded-lg sm:rounded-xl animate-pulse" />
      </div>
      <CardContent className="px-2 sm:px-3 pb-2 sm:pb-3 pt-1">
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-20" />
          <div className="flex items-center justify-between pt-1">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-8 sm:h-9 w-full rounded-lg sm:rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

// Selected Partner Banner
function SelectedPartnerBanner() {
  const { selectedPartner, hasPartner } = useCartStore();
  const { t } = useTranslation();
  
  if (!hasPartner || !selectedPartner) {
    // Partner is being auto-selected, show loading state
    return (
      <div className="mb-4 p-3 rounded-lg bg-muted/50 border flex items-center gap-3 animate-pulse">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{t('partners.loading')}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Building2 className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{t('partners.selectedPartner')}:</p>
        <p className="font-medium truncate">{selectedPartner.name}</p>
      </div>
      <Button variant="outline" size="sm" asChild className="shrink-0">
        <Link href="/cart">
          <ShoppingCart className="h-4 w-4 mr-1.5" />
          {t('nav.cart')}
        </Link>
      </Button>
    </div>
  );
}

// Product Card Component
function ProductCard({ product, onProductClick, onDetailClick }: { 
  product: Product; 
  onProductClick: (product: Product) => void;
  onDetailClick: (productId: string) => void;
}) {
  const items = useCartStore((state) => state.items);
  const { t } = useTranslation();
  
  // Compute inCart and quantity from items array for reactivity
  const inCart = items.some((item) => item.productId === product.id);
  const cartQuantity = items.find((item) => item.productId === product.id)?.quantity || 0;
  
  const stockColors = {
    in_stock: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    low_stock: 'bg-amber-100 text-amber-700 border-amber-200',
    out_of_stock: 'bg-red-100 text-red-700 border-red-200',
  };

  const stockLabels = {
    in_stock: t('products.stockStatus.inStock'),
    low_stock: t('products.stockStatus.lowStock'),
    out_of_stock: t('products.stockStatus.outOfStock'),
  };

  // Format stock number - show 1000+ for large quantities
  const formatStock = (stock: number) => {
    if (stock >= 1000) return '1000+';
    return new Intl.NumberFormat('mn-MN').format(stock);
  };

  const handleDetailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDetailClick(product.id);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onProductClick(product);
  };

  const handleCardClick = () => {
    onProductClick(product);
  };

  return (
    <Card 
      onClick={handleCardClick}
      className="group overflow-hidden hover:shadow-lg transition-all duration-200 border border-gray-100 bg-white rounded-xl sm:rounded-2xl cursor-pointer"
    >
      {/* Image Section */}
      <div className="relative p-2 sm:p-3 pb-1 sm:pb-2">
        {/* Stock Badge - Top Right */}
        <Badge 
          className={`absolute top-2 right-2 sm:top-3 sm:right-3 ${stockColors[product.stock_status]} border font-medium px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] z-10`}
          variant="outline"
        >
          {stockLabels[product.stock_status]}
        </Badge>
        
        {/* Product Image */}
        <div className="aspect-square flex items-center justify-center bg-white rounded-lg sm:rounded-xl overflow-hidden relative">
          {(product.main_image_url || product.images?.[0]) ? (
            <Image
              src={product.main_image_url || product.images[0]}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
              className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300" />
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      <CardContent className="px-2 sm:px-3 pb-2 sm:pb-3 pt-1">
        <div className="space-y-1 sm:space-y-1.5">
          {/* Category */}
          <p className="text-[8px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate">
            {product.category || t('products.uncategorized')}
          </p>
          
          {/* Product Name */}
          <h4 className="font-bold text-gray-900 line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] text-xs sm:text-sm leading-tight">
            {product.name}
          </h4>
          
          {/* Article Code */}
          {product.article && (
            <p className="text-[10px] sm:text-xs text-gray-500 truncate">
              {t('products.code')}: <span className="font-semibold text-gray-600">{product.article}</span>
            </p>
          )}
          
          {/* Price & Stock Row */}
          <div className="flex items-center justify-between pt-0.5 sm:pt-1">
            <div>
              <span className="text-base sm:text-lg font-bold text-gray-900">{product.formatted_price}</span>
            </div>
            <div className="text-right">
              <p className="text-[8px] sm:text-[10px] text-gray-400">{t('products.stock')}:</p>
              <p className="text-xs sm:text-sm font-bold text-gray-600">{formatStock(product.current_stock)}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
            {/* Detail Button - Icon only */}
            <Button 
              onClick={handleDetailClick}
              size="icon"
              variant="outline"
              className="rounded-lg sm:rounded-xl h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0"
            >
              <Info className="w-4 h-4" />
            </Button>
            
            {/* Add to Cart Button */}
            <Button 
              onClick={handleAddToCart}
              size="sm"
              className={`flex-1 text-white rounded-lg sm:rounded-xl h-8 sm:h-9 text-xs sm:text-sm font-medium transition-all duration-200 ${
                inCart 
                  ? 'bg-blue-500 hover:bg-blue-600' 
                  : 'bg-primary hover:bg-primary/90'
              }`}
              disabled={product.stock_status === 'out_of_stock'}
            >
              {inCart ? (
                <>
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
                  <span className="hidden sm:inline">{t('products.inCart')} ({cartQuantity})</span>
                  <span className="sm:hidden">+1</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
                  <span className="hidden sm:inline">{t('products.addToCart')}</span>
                  <span className="sm:hidden">{t('common.add')}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// List View Card Component
function ProductListCard({ product, onProductClick, onDetailClick }: { 
  product: Product; 
  onProductClick: (product: Product) => void;
  onDetailClick: (productId: string) => void;
}) {
  const items = useCartStore((state) => state.items);
  const { t } = useTranslation();
  
  // Compute inCart and quantity from items array for reactivity
  const inCart = items.some((item) => item.productId === product.id);
  const cartQuantity = items.find((item) => item.productId === product.id)?.quantity || 0;
  
  const stockLabels = {
    in_stock: t('products.stockStatus.inStock'),
    low_stock: t('products.stockStatus.lowStock'),
    out_of_stock: t('products.stockStatus.outOfStock'),
  };
  
  const stockColors = {
    in_stock: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    low_stock: 'bg-amber-50 text-amber-700 border-amber-200',
    out_of_stock: 'bg-red-50 text-red-700 border-red-200',
  };

  const formatStock = (stock: number | null) => {
    if (stock === null || stock === undefined) return '-';
    if (stock >= 1000) return '1000+';
    return stock.toLocaleString();
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onProductClick(product);
  };

  const handleDetailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDetailClick(product.id);
  };

  const handleCardClick = () => {
    onProductClick(product);
  };

  return (
    <Card 
      onClick={handleCardClick}
      className="group hover:shadow-md transition-all duration-200 border border-gray-100 bg-white rounded-xl cursor-pointer"
    >
      <div className="flex items-center p-3 sm:p-4 gap-3 sm:gap-4">
        {/* Product Image */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 relative bg-white rounded-lg overflow-hidden border border-gray-100">
          {(product.main_image_url || product.images?.[0]) ? (
            <Image
              src={product.main_image_url || product.images[0]}
              alt={product.name}
              fill
              sizes="80px"
              className="object-contain p-1"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-8 h-8 text-gray-300" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate">
                {product.category || t('products.uncategorized')}
              </p>
              <h4 className="font-bold text-gray-900 text-sm sm:text-base line-clamp-1 mt-0.5">
                {product.name}
              </h4>
              {product.article && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('products.code')}: <span className="font-semibold">{product.article}</span>
                </p>
              )}
            </div>
            <Badge 
              className={`${stockColors[product.stock_status]} border font-medium px-2 py-0.5 rounded-full text-[10px] flex-shrink-0`}
              variant="outline"
            >
              {stockLabels[product.stock_status]}
            </Badge>
          </div>
        </div>

        {/* Price & Cart */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-gray-400">{t('products.stock')}</p>
            <p className="text-sm font-bold text-gray-600">{formatStock(product.current_stock)}</p>
          </div>
          <div className="text-right">
            <p className="text-base sm:text-lg font-bold text-gray-900">{product.formatted_price}</p>
            {inCart && (
              <p className="text-xs text-blue-600 font-medium">{t('products.inCart')}: {cartQuantity}</p>
            )}
          </div>
          <Button 
            onClick={handleDetailClick}
            size="icon"
            variant="outline"
            className="rounded-lg h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
          >
            <Info className="w-4 h-4" />
          </Button>
          <Button 
            onClick={handleAddToCart}
            size="icon"
            className={`text-white rounded-lg h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 ${
              inCart 
                ? 'bg-blue-500 hover:bg-blue-600' 
                : 'bg-primary hover:bg-primary/90'
            }`}
            disabled={product.stock_status === 'out_of_stock'}
          >
            {inCart ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function ProductsPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [keypadKey, setKeypadKey] = useState(0);
  
  // Product detail modal state
  const [detailProduct, setDetailProduct] = useState<ProductDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  
  const { t } = useTranslation();
  const { addItem, hasPartner, selectedPartner } = useCartStore();
  const { selectedWarehouse } = useWarehouseStore();
  
  const {
    products,
    categories,
    brands,
    isLoading,
    categoriesLoading,
    brandsLoading,
    error,
    filters,
    paginatorInfo,
    fetchProducts,
    fetchCategories,
    fetchBrands,
    setSearch,
    setCategories,
    setBrands,
    loadMore,
  } = useProductStore();

  // Fetch product detail from API
  const fetchProductDetail = useCallback(async (productId: string) => {
    if (!selectedWarehouse) {
      toast.error(t('products.warehouseNotSelected'));
      return;
    }
    
    // Find product in list to get image URL (API doesn't return image)
    const productFromList = products.find(p => p.id === productId);
    const productImageUrl = productFromList?.main_image_url || productFromList?.images?.[0];
    
    console.log('[ProductDetail] Product from list:', productFromList?.name, 'Image URL:', productImageUrl, 'main_image_url:', productFromList?.main_image_url, 'images:', productFromList?.images);
    
    setIsDetailLoading(true);
    setIsDetailOpen(true);
    
    try {
      const params = new URLSearchParams({
        warehouseId: selectedWarehouse.uuid,
        priceTypeId: selectedWarehouse.priceTypeId,
        uuid: productId,
      });
      
      const response = await fetch(`/api/products/detail?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch product detail');
      }
      
      const data = await response.json();
      console.log('[ProductDetail] API response imgUrl:', data.imgUrl, 'main_image_url:', data.main_image_url);
      
      // Add image URL from product list if API doesn't return one
      if (!data.imgUrl && !data.main_image_url && productImageUrl) {
        data.imgUrl = productImageUrl;
        console.log('[ProductDetail] Using image from list:', productImageUrl);
      }
      setDetailProduct(data);
    } catch (err) {
      console.error('Error fetching product detail:', err);
      toast.error(t('products.detailError'));
      setIsDetailOpen(false);
    } finally {
      setIsDetailLoading(false);
    }
  }, [selectedWarehouse, t, products]);

  useEffect(() => {
    fetchCategories();
    fetchBrands();
    fetchProducts();
  }, [fetchCategories, fetchBrands, fetchProducts]);

  // Handle category toggle in sidebar - single selection only
  const handleCategoryToggle = (categoryId: string) => {
    // If already selected, deselect it. Otherwise select only this one.
    const newCategories = filters.categoryIds.includes(categoryId)
      ? []
      : [categoryId];
    
    // setCategories will also clear brandIds and fetch products
    setCategories(newCategories);
  };

  // Handle brand toggle - single selection only
  const handleBrandToggle = (brandId: string) => {
    // If already selected, deselect it. Otherwise select only this one.
    const newBrands = filters.brandIds.includes(brandId)
      ? []
      : [brandId];
    
    setBrands(newBrands);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setCategories([]);
    setBrands([]);
    fetchBrands();
  };

  // Convert categories to filter format
  const filterCategories = categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    count: cat.productsCount
  }));

  // Convert brands to filter format - filter by selected categories if any
  const filterBrands = brands
    .filter(brand => {
      // If no category selected, show all brands
      if (filters.categoryIds.length === 0) return true;
      // If brand has categoryUID, check if it matches any selected category
      if (brand.categoryUID) {
        return filters.categoryIds.includes(brand.categoryUID);
      }
      // If brand has no categoryUID, show it anyway
      return true;
    })
    .map(brand => ({
      id: brand.id,
      name: brand.name
    }));

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetchProducts(1);
  };

  const handleProductClick = (product: Product) => {
    // Check if partner is selected
    if (!hasPartner) {
      toast.error(t('products.selectPartnerFirst'), {
        description: t('products.selectPartnerDescription'),
        action: {
          label: t('products.goToPartners'),
          onClick: () => window.location.href = '/partners'
        }
      });
      return;
    }
    
    if (product.stock_status === 'out_of_stock' || product.current_stock <= 0) {
      toast.error(t('products.outOfStock'));
      return;
    }
    setSelectedProduct(product);
    setKeypadKey(prev => prev + 1); // Increment to reset keypad
    setIsKeypadOpen(true);
  };

  const handleQuantityConfirm = (quantity: number) => {
    if (selectedProduct && hasPartner) {
      addItem(selectedProduct, quantity);
      toast.success(t('products.addedToCart', { name: selectedProduct.name }), {
        description: t('products.addedDescription', { quantity: quantity, partner: selectedPartner?.name || '' }),
        duration: 2000,
      });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Sidebar - Categories */}
      <CategorySidebar
        categories={filterCategories}
        categoriesLoading={categoriesLoading}
        selectedCategories={filters.categoryIds}
        onCategoryToggle={handleCategoryToggle}
        onClearAll={handleClearFilters}
      />

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="px-3 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
          {/* Selected Partner Banner */}
          <SelectedPartnerBanner />
          
          {/* Header */}
          <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{t('products.title')}</h1>
                {filters.categoryIds.length > 0 && (
                  <Badge variant="secondary" className="text-sm px-2.5 py-0.5 bg-primary/10 text-primary">
                    {categories.find(c => c.id === filters.categoryIds[0])?.name}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {isLoading ? (
                  t('products.loading')
                ) : paginatorInfo ? (
                  <>
                    <span className="font-semibold text-gray-700">{paginatorInfo.total.toLocaleString()}</span>
                    {' '}{t('products.productsFound')}
                    {filters.brandIds.length > 0 && (
                      <span className="text-primary ml-1">
                        • {brands.find(b => b.id === filters.brandIds[0])?.name}
                      </span>
                    )}
                  </>
                ) : (
                  t('products.noProducts')
                )}
              </p>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 bg-gray-100 p-1 rounded-lg">
              <Button 
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon" 
                className={`rounded-md h-8 w-8 ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon" 
                className={`rounded-md h-8 w-8 ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4 sm:mb-6">
            <form onSubmit={handleSearch} className="max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('products.searchPlaceholder')}
                  value={filters.search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10 sm:h-11 rounded-xl border-gray-200 bg-white shadow-sm w-full"
                />
              </div>
            </form>
          </div>

          {/* Brands Filter */}
          {(filterBrands.length > 0 || brandsLoading || filters.brandIds.length > 0) && (
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-gray-700">{t('products.filterSheet.brand')}</span>
                {filters.brandIds.length > 0 && (
                  <Badge variant="secondary" className="text-xs h-5 px-1.5">
                    {filters.brandIds.length}
                  </Badge>
                )}
                {/* Clear Brands Button */}
                {filters.brandIds.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBrands([])}
                    className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {t('products.filterSheet.clear')}
                  </Button>
                )}
              </div>
              {brandsLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t('products.loading')}</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {/* "All" option - selected when no brand is selected */}
                  <Badge
                    variant={filters.brandIds.length === 0 ? 'default' : 'outline'}
                    className={`cursor-pointer transition-all text-xs py-1 px-2.5 ${
                      filters.brandIds.length === 0
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'hover:bg-muted border-blue-200 text-blue-700'
                    }`}
                    onClick={() => setBrands([])}
                  >
                    {t('products.filterSheet.all') || 'Бүгд'}
                  </Badge>
                  {filterBrands.map(brand => {
                    const isSelected = filters.brandIds.includes(brand.id);
                    return (
                      <Badge
                        key={brand.id}
                        variant={isSelected ? 'default' : 'outline'}
                        className={`cursor-pointer transition-all text-xs py-1 px-2.5 ${
                          isSelected
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'hover:bg-muted border-blue-200 text-blue-700'
                        }`}
                        onClick={() => handleBrandToggle(brand.id)}
                      >
                        {brand.name}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-6">
              {error}
            </div>
          )}

          {/* Products Grid */}
          {isLoading && products.length === 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 12 }).map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <Package className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">{t('products.noProducts')}</h3>
              <p className="text-gray-500">{t('products.noSearchResults')}</p>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} onProductClick={handleProductClick} onDetailClick={fetchProductDetail} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:gap-3">
                  {products.map((product) => (
                    <ProductListCard key={product.id} product={product} onProductClick={handleProductClick} onDetailClick={fetchProductDetail} />
                  ))}
                </div>
              )}

              {/* Load More */}
              {paginatorInfo?.hasMorePages && (
                <div className="flex justify-center mt-10">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={loadMore}
                    disabled={isLoading}
                    className="px-8"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('products.loading')}
                      </>
                    ) : (
                      t('products.loadMore')
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Quantity Keypad Dialog */}
      <QuantityKeypad
        isOpen={isKeypadOpen}
        onClose={() => setIsKeypadOpen(false)}
        onConfirm={handleQuantityConfirm}
        maxQuantity={selectedProduct?.current_stock || 999}
        productName={selectedProduct?.name}
        resetKey={keypadKey}
      />
      
      {/* Product Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="!max-w-4xl !w-[90vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              {t('products.productDetail')}
            </DialogTitle>
          </DialogHeader>
          
          {isDetailLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">{t('products.loadingDetail')}</p>
            </div>
          ) : detailProduct ? (
            <div className="space-y-6">
              {/* Product Header */}
              <div className="flex gap-6">
                {/* Image - larger, check multiple possible image fields */}
                <div className="w-80 h-80 flex-shrink-0 relative bg-gray-50 rounded-2xl overflow-hidden border-2 border-gray-100">
                  {(() => {
                    const imageUrl = detailProduct.imgUrl || detailProduct.image || detailProduct.imageUrl || detailProduct.main_image_url;
                    console.log('[ProductDetail Modal] Rendering image URL:', imageUrl);
                    if (imageUrl) {
                      return (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt={detailProduct.name}
                          className="w-full h-full object-contain p-4"
                        />
                      );
                    }
                    return (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-28 h-28 text-gray-300" />
                      </div>
                    );
                  })()}
                </div>
                
                {/* Basic Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{detailProduct.name}</h3>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {detailProduct.article && (
                      <Badge variant="outline" className="font-mono text-sm px-3 py-1">
                        <Hash className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                        {detailProduct.article}
                      </Badge>
                    )}
                    {detailProduct.barcode && (
                      <Badge variant="outline" className="font-mono text-sm px-3 py-1">
                        <Barcode className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                        {detailProduct.barcode}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="bg-primary/5 rounded-xl p-4 inline-block mb-4">
                    <p className="text-3xl font-bold text-primary">
                      {new Intl.NumberFormat('mn-MN').format(detailProduct.price)}₮
                    </p>
                  </div>
                  
                  {/* Details - Category, Brand, UOM, MOQ */}
                  <div className="flex flex-wrap gap-2">
                    {/* Category */}
                    {detailProduct.category && (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 px-3 py-1.5 text-sm">
                        <Layers className="h-4 w-4 mr-1.5" />
                        {detailProduct.category.name}
                      </Badge>
                    )}
                    
                    {/* Brand */}
                    {detailProduct.brand && (
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200 px-3 py-1.5 text-sm">
                        <Bookmark className="h-4 w-4 mr-1.5" />
                        {detailProduct.brand.name}
                      </Badge>
                    )}
                    
                    {/* UOM */}
                    {detailProduct.uom && (
                      <Badge className="bg-teal-100 text-teal-700 border-teal-200 px-3 py-1.5 text-sm">
                        <Scale className="h-4 w-4 mr-1.5" />
                        {detailProduct.uom.name}
                      </Badge>
                    )}
                    
                    {/* MOQ */}
                    {detailProduct.moq && detailProduct.moq > 0 && (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 px-3 py-1.5 text-sm">
                        <PackageOpen className="h-4 w-4 mr-1.5" />
                        MOQ: {detailProduct.moq}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Stock Types - PCS, PACK, BOX on new line */}
                  {detailProduct.stockTypes && detailProduct.stockTypes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {detailProduct.stockTypes.map((stockType) => (
                        <Badge key={stockType.uuid} className="bg-gray-100 text-gray-700 border-gray-200 px-3 py-1.5 text-sm">
                          {stockType.name.toLowerCase().includes('box') && <Boxes className="h-4 w-4 mr-1.5" />}
                          {stockType.name.toLowerCase().includes('pack') && <PackageOpen className="h-4 w-4 mr-1.5" />}
                          {stockType.name.toLowerCase().includes('pcs') && <Package className="h-4 w-4 mr-1.5" />}
                          {!stockType.name.toLowerCase().includes('box') && !stockType.name.toLowerCase().includes('pack') && !stockType.name.toLowerCase().includes('pcs') && <Package className="h-4 w-4 mr-1.5" />}
                          {stockType.name}: <span className="font-bold ml-1">{stockType.pcs >= 1000 ? '1000+' : stockType.pcs}</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Promotions */}
              {detailProduct.promotions && detailProduct.promotions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {detailProduct.promotions.map((promo) => (
                    <Badge key={promo.uuid} className="bg-orange-100 text-orange-700 border-orange-200 px-3 py-1.5 text-sm">
                      <Gift className="h-4 w-4 mr-1.5" />
                      {promo.name}
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* Discount Points */}
              {detailProduct.discountPoint && detailProduct.discountPoint.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {detailProduct.discountPoint.map((dp) => (
                    <Badge key={dp.discountPointID} className="bg-green-100 text-green-700 border-green-200 px-3 py-1.5 text-sm">
                      <Percent className="h-4 w-4 mr-1.5" />
                      {dp.discountPointName}: {dp.discountPointAmount}%
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* Expire Dates */}
              {detailProduct.expireDates && detailProduct.expireDates.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-semibold text-blue-900">Дуусах хугацаа</span>
                  </div>
                  <div className="space-y-2">
                    {detailProduct.expireDates.map((item, index) => {
                      const expDate = new Date(item.expireDate);
                      const now = new Date();
                      const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      const isExpiringSoon = daysLeft <= 90;
                      const isExpired = daysLeft <= 0;
                      // Format date as YYYY-MM-DD
                      const formattedDate = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}-${String(expDate.getDate()).padStart(2, '0')}`;
                      return (
                        <div 
                          key={index} 
                          className={`rounded-lg px-4 py-2 border flex items-center justify-between ${
                            isExpired ? 'bg-red-100 border-red-300' : 
                            isExpiringSoon ? 'bg-amber-100 border-amber-300' : 
                            'bg-white border-gray-200'
                          }`}
                        >
                          <span className={`font-semibold ${
                            isExpired ? 'text-red-700' : 
                            isExpiringSoon ? 'text-amber-700' : 
                            'text-gray-900'
                          }`}>
                            {formattedDate}
                          </span>
                          <span className={`text-sm font-medium ${
                            isExpired ? 'text-red-600' : 
                            isExpiringSoon ? 'text-amber-600' : 
                            'text-gray-500'
                          }`}>
                            {isExpired ? 'Хугацаа дууссан' : `${daysLeft} хоног үлдсэн`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Description */}
              {detailProduct.description && (
                <div className="bg-gray-50 rounded-xl p-4 border flex gap-3">
                  <FileText className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-600">{detailProduct.description}</p>
                </div>
              )}
              
              {/* Under Stock Warning */}
              {detailProduct.isUnderStock && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <span className="text-amber-700 font-medium">{t('products.underStock')}</span>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
