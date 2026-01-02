'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Package, Search, Grid, List, Loader2, ShoppingCart, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useProductStore } from '@/stores/product-store';
import { useCartStore } from '@/stores/cart-store';
import { QuantityKeypad } from '@/components/cart/QuantityKeypad';
import { toast } from 'sonner';
import type { Category, Product } from '@/types';

// Category Grid Component - 9 items per row
function CategoryGrid({ 
  categories, 
  selectedId, 
  onSelect 
}: { 
  categories: Category[]; 
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3">Ангилал</h3>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-3">
          <Button
            variant={selectedId === null ? "default" : "outline"}
            size="sm"
            onClick={() => onSelect(null)}
            className="shrink-0"
          >
            Бүгд
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedId === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => onSelect(cat.id)}
              className="shrink-0"
            >
              {cat.name}
              {cat.productsCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {cat.productsCount}
                </Badge>
              )}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

// Product Card Component
function ProductCard({ product, onProductClick }: { product: Product; onProductClick: (product: Product) => void }) {
  const { isInCart, getItemQuantity } = useCartStore();
  const inCart = isInCart(product.id);
  const cartQuantity = getItemQuantity(product.id);
  
  const stockColors = {
    in_stock: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    low_stock: 'bg-amber-100 text-amber-700 border-amber-200',
    out_of_stock: 'bg-red-100 text-red-700 border-red-200',
  };

  const stockLabels = {
    in_stock: 'Байгаа',
    low_stock: 'Цөөн',
    out_of_stock: 'Дууссан',
  };

  // Format stock number with thousands separator
  const formatStock = (stock: number) => {
    return new Intl.NumberFormat('mn-MN').format(stock);
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
        <div className="aspect-square flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg sm:rounded-xl overflow-hidden relative">
          {product.main_image_url ? (
            <Image
              src={product.main_image_url}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
              className="object-contain p-2 sm:p-4 group-hover:scale-105 transition-transform duration-300"
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
            {product.category || 'Ангилалгүй'}
          </p>
          
          {/* Product Name */}
          <h4 className="font-bold text-gray-900 line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] text-xs sm:text-sm leading-tight">
            {product.name}
          </h4>
          
          {/* Article Code */}
          {product.article && (
            <p className="text-[10px] sm:text-xs text-gray-500 truncate">
              Код: <span className="font-semibold text-gray-600">{product.article}</span>
            </p>
          )}
          
          {/* Price & Stock Row */}
          <div className="flex items-center justify-between pt-0.5 sm:pt-1">
            <div>
              <span className="text-base sm:text-lg font-bold text-gray-900">{product.formatted_price}</span>
            </div>
            <div className="text-right">
              <p className="text-[8px] sm:text-[10px] text-gray-400">Үлдэгдэл:</p>
              <p className="text-xs sm:text-sm font-bold text-gray-600">{formatStock(product.current_stock)}</p>
            </div>
          </div>

          {/* Add to Cart Button */}
          <Button 
            onClick={handleAddToCart}
            size="sm"
            className={`w-full mt-1.5 sm:mt-2 text-white rounded-lg sm:rounded-xl h-8 sm:h-9 text-xs sm:text-sm font-medium transition-all duration-200 ${
              inCart 
                ? 'bg-blue-500 hover:bg-blue-600' 
                : 'bg-emerald-500 hover:bg-emerald-600'
            }`}
            disabled={product.stock_status === 'out_of_stock'}
          >
            {inCart ? (
              <>
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">Сагсанд байна ({cartQuantity})</span>
                <span className="sm:hidden">+1</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">Сагсанд нэмэх</span>
                <span className="sm:hidden">Нэмэх</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// List View Card Component
function ProductListCard({ product, onProductClick }: { product: Product; onProductClick: (product: Product) => void }) {
  const { isInCart, getItemQuantity } = useCartStore();
  const inCart = isInCart(product.id);
  const cartQuantity = getItemQuantity(product.id);
  
  const stockLabels = {
    in_stock: 'Байгаа',
    low_stock: 'Цөөн',
    out_of_stock: 'Дууссан',
  };
  
  const stockColors = {
    in_stock: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    low_stock: 'bg-amber-50 text-amber-700 border-amber-200',
    out_of_stock: 'bg-red-50 text-red-700 border-red-200',
  };

  const formatStock = (stock: number | null) => {
    if (stock === null || stock === undefined) return '-';
    return stock.toLocaleString();
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
      className="group hover:shadow-md transition-all duration-200 border border-gray-100 bg-white rounded-xl cursor-pointer"
    >
      <div className="flex items-center p-3 sm:p-4 gap-3 sm:gap-4">
        {/* Product Image */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 relative bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg overflow-hidden">
          {product.main_image_url ? (
            <Image
              src={product.main_image_url}
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
                {product.category || 'Ангилалгүй'}
              </p>
              <h4 className="font-bold text-gray-900 text-sm sm:text-base line-clamp-1 mt-0.5">
                {product.name}
              </h4>
              {product.article && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Код: <span className="font-semibold">{product.article}</span>
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
        <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-gray-400">Үлдэгдэл</p>
            <p className="text-sm font-bold text-gray-600">{formatStock(product.current_stock)}</p>
          </div>
          <div className="text-right">
            <p className="text-base sm:text-lg font-bold text-gray-900">{product.formatted_price}</p>
            {inCart && (
              <p className="text-xs text-blue-600 font-medium">Сагсанд: {cartQuantity}</p>
            )}
          </div>
          <Button 
            onClick={handleAddToCart}
            size="icon"
            className={`text-white rounded-lg h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 ${
              inCart 
                ? 'bg-blue-500 hover:bg-blue-600' 
                : 'bg-emerald-500 hover:bg-emerald-600'
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
  
  const { addItem } = useCartStore();
  
  const {
    products,
    categories,
    isLoading,
    categoriesLoading,
    error,
    filters,
    paginatorInfo,
    fetchProducts,
    fetchCategories,
    setSearch,
    setCategory,
    loadMore,
  } = useProductStore();

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, [fetchCategories, fetchProducts]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetchProducts(1);
  };

  const handleProductClick = (product: Product) => {
    if (product.stock_status === 'out_of_stock' || product.current_stock <= 0) {
      toast.error('Бараа дууссан байна');
      return;
    }
    setSelectedProduct(product);
    setKeypadKey(prev => prev + 1); // Increment to reset keypad
    setIsKeypadOpen(true);
  };

  const handleQuantityConfirm = (quantity: number) => {
    if (selectedProduct) {
      addItem(selectedProduct, quantity);
      toast.success(`"${selectedProduct.name}" сагсанд нэмэгдлээ`, {
        description: `${quantity} ширхэг`,
        duration: 2000,
      });
    }
  };

  return (
    <div className="min-h-screen">
      <div className="px-3 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">Бараа материал</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {paginatorInfo ? `Нийт ${paginatorInfo.total.toLocaleString()} бараа` : 'Уншиж байна...'}
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
        <form onSubmit={handleSearch} className="mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Бараа хайх..."
              value={filters.search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 sm:h-11 rounded-xl border-gray-200 bg-white shadow-sm w-full sm:max-w-md"
            />
          </div>
        </form>

        {/* Categories */}
        {!categoriesLoading && categories.length > 0 && (
          <CategoryGrid
            categories={categories}
            selectedId={filters.categoryId}
            onSelect={setCategory}
          />
        )}

        {/* Error */}
        {error && (
          <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Products Grid */}
        {isLoading && products.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <Package className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Бараа олдсонгүй</h3>
            <p className="text-gray-500">Хайлтын үр дүн олдсонгүй</p>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} onProductClick={handleProductClick} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:gap-3">
                {products.map((product) => (
                  <ProductListCard key={product.id} product={product} onProductClick={handleProductClick} />
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
                      Уншиж байна...
                    </>
                  ) : (
                    'Цааш үзэх'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
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
    </div>
  );
}
