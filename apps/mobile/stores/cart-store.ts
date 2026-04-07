/**
 * Cart Store
 * Сагсны бүх логикийг удирдах Zustand store
 * 
 * ============================================================================
 * БИЗНЕС ЛОГИК
 * ============================================================================
 * 
 * 1. ХАРИЛЦАГЧ СОНГОЛТ (REQUIRED)
 *    - Бараа сагслахын өмнө заавал харилцагч сонгосон байх ёстой
 *    - Partner Detail хуудаснаас "Захиалга үүсгэх" товч дарна
 *    - Coordinate range дотор байвал товч идэвхжинэ
 *    - coordinateRange = 1 үед GPS шалгахгүй, шууд идэвхжинэ
 *    - Харилцагч солиход сагс цэвэрлэгдэнэ (анхааруулга гарна)
 * 
 * 2. АГУУЛАХ ХОЛБООС
 *    - Сагс нь сонгосон агуулахтай холбоотой
 *    - Агуулах солиход сагс цэвэрлэгдэнэ (үнэ өөрчлөгддөг учир)
 * 
 * 3. STOCKTYPES (PCS, PACK, BOX)
 *    - Бараа бүр stockTypes жагсаалттай (API-с ирнэ)
 *    - pcs = 1 ширхэг, pack = N ширхэг, box = M ширхэг
 *    - onlyBoxSale = true бол зөвхөн BOX сонголт
 *    - Сагсанд stockType-р хадгална (uuid, name, pcs, count)
 * 
 * 4. MOQ (Minimum Order Quantity)
 *    - Бараа бүр moq талбартай
 *    - Захиалгын тоо >= moq байх ёстой
 *    - Validation: moq шалгаж, алдаа харуулна
 * 
 * 5. ORDER FLOW (2-Step)
 *    - Step 1: Draft үүсгэх → ERP руу илгээнэ → uuid буцаж ирнэ
 *    - Step 2: Finish → latitudeFinish, longitudeFinish, end_date, loan нэмж илгээнэ
 *    - Draft төлөвтэй үед бараа засаж болно
 *    - Finish болсны дараа засахгүй
 * 
 * 6. PERSIST
 *    - AsyncStorage-д хадгалагдана
 *    - App дахин нээхэд сагс хэвээр байна
 * 
 * ============================================================================
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * StockType: Барааны нэгж төрөл
 * 
 * БИЗНЕС ЛОГИК:
 * - PCS = ширхэг (pcs: 1)
 * - PACK = багц (pcs: varies)
 * - BOX = хайрцаг (pcs: 24 гэх мэт)
 */
export interface StockType {
  uuid: string;
  name: string; // PCS, PACK, BOX
  pcs: number;  // Энэ төрөлд хэдэн ширхэг байгаа
}

/**
 * CartItemStock: Сагсан дахь барааны нэгж мэдээлэл
 * 
 * БИЗНЕС ЛОГИК:
 * - typeId = stockType.uuid
 * - count = хэдэн нэгж захиалсан
 * - totalPcs = count * stockType.pcs (нийт ширхэг)
 */
export interface CartItemStock {
  typeId: string;    // stockType uuid
  typeName: string;  // PCS, PACK, BOX
  pcs: number;       // Нэгжийн ширхэг
  count: number;     // Захиалсан тоо
  totalPcs: number;  // Нийт ширхэг (count * pcs)
}

/**
 * CartItem: Сагсан дахь бараа
 * 
 * БИЗНЕС ЛОГИК:
 * - stocks: Олон төрлийн нэгжээр захиалж болно (PCS + BOX гэх мэт)
 * - moq: Хамгийн бага захиалгын тоо
 * - onlyBoxSale: true бол зөвхөн BOX
 */
export interface CartItem {
  id: string;           // cart item unique id
  productId: string;    // product uuid
  name: string;
  article: string | null;
  price: number;        // Нэгж үнэ (priceTypeId-р)
  formattedPrice: string;
  imageUrl: string | null;
  category: string | null;

  // Stock Types
  stockTypes: StockType[];      // Боломжит нэгжүүд
  stocks: CartItemStock[];      // Сонгосон нэгжүүд
  onlyBoxSale: boolean;         // Зөвхөн хайрцагаар

  // Quantities
  moq: number;                  // Minimum order quantity
  maxQuantity: number;          // Үлдэгдэл
  totalQuantity: number;        // Нийт ширхэг (бүх stocks-н totalPcs нийлбэр)

  // Calculated
  totalPrice: number;           // price * totalQuantity
  formattedTotalPrice: string;

  // Promotion
  promoPoint: number | null;    // Урамшууллын оноо

  addedAt: string;
}

/**
 * SelectedPartner: Захиалгын харилцагч
 * 
 * БИЗНЕС ЛОГИК:
 * - Сагслахын өмнө заавал сонгосон байх
 * - coordinateRange: GPS шалгалтын радиус (= 1 бол шалгахгүй)
 * - priceTypeId: Харилцагчийн гэрээний үнийн төрөл (Products API-д ашиглана)
 * - contract: Харилцагчийн гэрээний мэдээлэл (contractId, priceTypeId, isLoan)
 */
export interface SelectedPartner {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  coordinateRange: number | null;
  totalDiscountAmount: number | null; // Урамшууллын үлдэгдэл оноо
  priceTypeId: string | null;        // Харилцагчийн гэрээний үнийн төрөл
  contract: {
    contractId: string;
    priceTypeId: string;
    isLoan: string;
  } | null;                          // Харилцагчийн гэрээний мэдээлэл
}

/**
 * CartValidation: Сагсны validation үр дүн
 */
export interface CartValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * formatPrice: Мөнгөн дүн форматлах
 */
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('mn-MN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price) + '₮';
};

/**
 * calculateItemTotals: Нэг барааны нийт тоо, дүн тооцоолох
 */
const calculateItemTotals = (item: Omit<CartItem, 'totalQuantity' | 'totalPrice' | 'formattedTotalPrice'>): {
  totalQuantity: number;
  totalPrice: number;
  formattedTotalPrice: string;
} => {
  const totalQuantity = item.stocks.reduce((sum, s) => sum + s.totalPcs, 0);
  const totalPrice = item.price * totalQuantity;
  return {
    totalQuantity,
    totalPrice,
    formattedTotalPrice: formatPrice(totalPrice),
  };
};

/**
 * calculateCartTotals: Сагсны нийт тоо, дүн тооцоолох
 */
const calculateCartTotals = (items: CartItem[]) => {
  const itemCount = items.length;
  const totalItems = items.reduce((sum, item) => sum + item.totalQuantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return {
    itemCount,
    totalItems,
    totalAmount,
    formattedTotal: formatPrice(totalAmount),
    isEmpty: items.length === 0,
  };
};

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface CartState {
  // Data
  items: CartItem[];
  selectedPartner: SelectedPartner | null;
  warehouseId: string | null;       // Сагс үүсгэсэн агуулах
  warehouseName: string | null;

  // Order state
  draftOrderUuid: string | null;    // Step 1 дараа ERP-с ирсэн uuid
  orderStatus: 'idle' | 'draft' | 'submitting' | 'finished' | 'error';
  orderError: string | null;

  // Computed
  itemCount: number;
  totalItems: number;
  totalAmount: number;
  formattedTotal: string;
  isEmpty: boolean;
  hasPartner: boolean;

  // Partner Actions
  setSelectedPartner: (partner: SelectedPartner) => void;
  clearSelectedPartner: () => void;

  // Warehouse Actions
  setWarehouse: (warehouseId: string, warehouseName: string) => void;

  // Cart Item Actions
  addItem: (product: ProductForCart, stocks: CartItemStock[]) => void;
  removeItem: (productId: string) => void;
  updateItemStock: (productId: string, stockTypeId: string, count: number) => void;
  clearCart: () => void;

  // Helpers
  getItemByProductId: (productId: string) => CartItem | undefined;
  isInCart: (productId: string) => boolean;
  getItemQuantity: (productId: string) => number;
  getCartItemCount: () => number;

  // Validation
  validateCart: () => CartValidation;
  validateMOQ: (productId: string, totalPcs: number, moq: number) => boolean;

  // Order Actions
  setDraftOrderUuid: (uuid: string) => void;
  setOrderStatus: (status: CartState['orderStatus']) => void;
  setOrderError: (error: string | null) => void;
  resetOrder: () => void;
}

/**
 * ProductForCart: Сагсанд нэмэхэд шаардлагатай product мэдээлэл
 * 
 * Product API-с ирсэн мэдээллээс шаардлагатай талбаруудыг авна
 */
export interface ProductForCart {
  id: string;         // uuid
  name: string;
  code: string;       // article/code
  price: number;
  image: string | null;
  stock: number;      // Үлдэгдэл
  stockTypes: Array<{ uuid: string; name: string; pcs: number }>;
  moq: number;
  onlyBoxSale: boolean;
  promoPoint: number | null; // Урамшууллын оноо
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      // Initial state
      items: [],
      selectedPartner: null,
      warehouseId: null,
      warehouseName: null,
      draftOrderUuid: null,
      orderStatus: 'idle',
      orderError: null,

      // Computed (recalculated on rehydration)
      itemCount: 0,
      totalItems: 0,
      totalAmount: 0,
      formattedTotal: '0₮',
      isEmpty: true,
      hasPartner: false,

      // ========================================================================
      // PARTNER ACTIONS
      // ========================================================================

      /**
       * setSelectedPartner: Харилцагч сонгох
       * 
       * БИЗНЕС ЛОГИК:
       * - Өөр харилцагч сонгоход сагс цэвэрлэгдэнэ
       * - UI дээр анхааруулга харуулах (caller хийнэ)
       */
      setSelectedPartner: (partner: SelectedPartner) => {
        const current = get().selectedPartner;

        // Өөр харилцагч сонговол сагс цэвэрлэх
        if (current && current.id !== partner.id) {
          set({
            items: [],
            itemCount: 0,
            totalItems: 0,
            totalAmount: 0,
            formattedTotal: '0₮',
            isEmpty: true,
            draftOrderUuid: null,
            orderStatus: 'idle',
            orderError: null,
          });
        }

        set({
          selectedPartner: partner,
          hasPartner: true,
        });
      },

      /**
       * clearSelectedPartner: Харилцагч сонголт цэвэрлэх
       * Сагс мөн цэвэрлэгдэнэ
       */
      clearSelectedPartner: () => {
        set({
          selectedPartner: null,
          hasPartner: false,
          items: [],
          itemCount: 0,
          totalItems: 0,
          totalAmount: 0,
          formattedTotal: '0₮',
          isEmpty: true,
          draftOrderUuid: null,
          orderStatus: 'idle',
          orderError: null,
        });
      },

      // ========================================================================
      // WAREHOUSE ACTIONS
      // ========================================================================

      /**
       * setWarehouse: Агуулах тохируулах
       * 
       * БИЗНЕС ЛОГИК:
       * - Өөр агуулах сонгоход сагс цэвэрлэгдэнэ (үнэ өөрчлөгддөг)
       */
      setWarehouse: (warehouseId: string, warehouseName: string) => {
        const current = get().warehouseId;

        // Өөр агуулах сонговол сагс цэвэрлэх
        if (current && current !== warehouseId) {
          set({
            items: [],
            itemCount: 0,
            totalItems: 0,
            totalAmount: 0,
            formattedTotal: '0₮',
            isEmpty: true,
            draftOrderUuid: null,
            orderStatus: 'idle',
          });
        }

        set({ warehouseId, warehouseName });
      },

      // ========================================================================
      // CART ITEM ACTIONS
      // ========================================================================

      /**
       * addItem: Бараа сагсанд нэмэх
       * 
       * БИЗНЕС ЛОГИК:
       * - Харилцагч сонгоогүй бол нэмэхгүй
       * - Out of stock бол нэмэхгүй
       * - stocks параметр нь NumberPad-с ирнэ (stockType бүрийн тоо)
       * - Бараа аль хэдийн байвал stocks-г шинэчилнэ
       */
      addItem: (product: ProductForCart, stocks: CartItemStock[]) => {
        // Validation
        if (!get().selectedPartner) {
          console.warn('[Cart] Cannot add item without selected partner');
          return;
        }

        if (product.stock <= 0) {
          console.warn('[Cart] Cannot add out of stock product');
          return;
        }

        set((state) => {
          // Бараа аль хэдийн сагсанд байгаа эсэх
          const existingIndex = state.items.findIndex((item) => item.productId === product.id);

          if (existingIndex >= 0) {
            // Аль хэдийн байвал stocks-г шинэчлэнэ
            const newItems = [...state.items];
            const existingItem = newItems[existingIndex];

            const updatedBaseItem = {
              ...existingItem,
              stocks,
            };
            const totals = calculateItemTotals(updatedBaseItem);
            newItems[existingIndex] = { ...updatedBaseItem, ...totals };

            return {
              items: newItems,
              ...calculateCartTotals(newItems),
            };
          }

          // Шинэ бараа нэмэх
          const productStockTypes = product.stockTypes || [];
          const availableStockTypes = product.onlyBoxSale
            ? productStockTypes.filter(st => st.name === 'BOX' || st.pcs >= 12)
            : productStockTypes;

          const baseItem = {
            id: `cart-${product.id}-${Date.now()}`,
            productId: product.id,
            name: product.name,
            article: product.code,
            price: product.price,
            formattedPrice: formatPrice(product.price),
            imageUrl: product.image,
            category: null,
            stockTypes: availableStockTypes.length > 0
              ? availableStockTypes.map(st => ({
                uuid: st.uuid,
                name: st.name,
                pcs: st.pcs,
              }))
              : [{ uuid: 'default', name: 'PCS', pcs: 1 }],
            stocks,
            onlyBoxSale: product.onlyBoxSale,
            moq: product.moq,
            maxQuantity: product.stock,
            promoPoint: product.promoPoint,
            addedAt: new Date().toISOString(),
          };

          const totals = calculateItemTotals(baseItem);
          const newItem: CartItem = { ...baseItem, ...totals };
          const newItems = [...state.items, newItem];

          return {
            items: newItems,
            ...calculateCartTotals(newItems),
          };
        });
      },

      /**
       * removeItem: Бараа сагснаас хасах
       */
      removeItem: (productId: string) => {
        set((state) => {
          const newItems = state.items.filter((item) => item.productId !== productId);
          return {
            items: newItems,
            ...calculateCartTotals(newItems),
          };
        });
      },

      /**
       * updateItemStock: Барааны тоо хэмжээ шинэчлэх
       * 
       * БИЗНЕС ЛОГИК:
       * - stockTypeId-р аль нэгжийг шинэчлэхийг тодорхойлно
       * - count = 0 бол тухайн stockType устгана
       * - Бүх stocks хоосон бол бараа сагснаас устгана
       * - MOQ шалгалт: totalPcs >= moq
       */
      updateItemStock: (productId: string, stockTypeId: string, count: number) => {
        set((state) => {
          const itemIndex = state.items.findIndex((item) => item.productId === productId);
          if (itemIndex === -1) return state;

          const item = state.items[itemIndex];
          const stockType = item.stockTypes.find(st => st.uuid === stockTypeId);
          if (!stockType) return state;

          let newStocks: CartItemStock[];

          if (count <= 0) {
            // Устгах
            newStocks = item.stocks.filter(s => s.typeId !== stockTypeId);
          } else {
            const existingStockIndex = item.stocks.findIndex(s => s.typeId === stockTypeId);

            if (existingStockIndex >= 0) {
              // Шинэчлэх
              newStocks = [...item.stocks];
              newStocks[existingStockIndex] = {
                ...newStocks[existingStockIndex],
                count,
                totalPcs: count * stockType.pcs,
              };
            } else {
              // Нэмэх
              newStocks = [...item.stocks, {
                typeId: stockTypeId,
                typeName: stockType.name,
                pcs: stockType.pcs,
                count,
                totalPcs: count * stockType.pcs,
              }];
            }
          }

          // Бүх stocks хоосон бол бараа устгах
          if (newStocks.length === 0) {
            const newItems = state.items.filter((_, i) => i !== itemIndex);
            return {
              items: newItems,
              ...calculateCartTotals(newItems),
            };
          }

          // Барааг шинэчлэх
          const updatedItem = { ...item, stocks: newStocks };
          const totals = calculateItemTotals(updatedItem);
          const finalItem: CartItem = { ...updatedItem, ...totals };

          const newItems = [...state.items];
          newItems[itemIndex] = finalItem;

          return {
            items: newItems,
            ...calculateCartTotals(newItems),
          };
        });
      },

      /**
       * clearCart: Сагс цэвэрлэх
       */
      clearCart: () => {
        set({
          items: [],
          itemCount: 0,
          totalItems: 0,
          totalAmount: 0,
          formattedTotal: '0₮',
          isEmpty: true,
          draftOrderUuid: null,
          orderStatus: 'idle',
          orderError: null,
        });
      },

      // ========================================================================
      // HELPERS
      // ========================================================================

      getItemByProductId: (productId: string) => {
        return get().items.find((item) => item.productId === productId);
      },

      isInCart: (productId: string) => {
        return get().items.some((item) => item.productId === productId);
      },

      getItemQuantity: (productId: string) => {
        const item = get().getItemByProductId(productId);
        return item?.totalQuantity || 0;
      },

      getCartItemCount: () => {
        return get().items.length;
      },

      // ========================================================================
      // VALIDATION
      // ========================================================================

      /**
       * validateCart: Сагсыг checkout-н өмнө шалгах
       * 
       * БИЗНЕС ЛОГИК:
       * - Харилцагч сонгосон байх
       * - Сагс хоосон биш байх
       * - MOQ шалгах
       * - Stock шалгах
       */
      validateCart: () => {
        const { items, selectedPartner } = get();
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!selectedPartner) {
          errors.push('Харилцагч сонгоогүй байна');
        }

        if (items.length === 0) {
          errors.push('Сагс хоосон байна');
        }

        items.forEach((item) => {
          // MOQ шалгалт
          if (item.totalQuantity < item.moq) {
            errors.push(`"${item.name}" барааны хамгийн бага захиалга ${item.moq} ширхэг`);
          }

          // Stock шалгалт
          if (item.totalQuantity > item.maxQuantity) {
            errors.push(`"${item.name}" барааны үлдэгдэл хүрэлцэхгүй байна`);
          }

          // Low stock warning
          if (item.maxQuantity <= 5) {
            warnings.push(`"${item.name}" барааны үлдэгдэл цөөн байна (${item.maxQuantity})`);
          }
        });

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      },

      /**
       * validateMOQ: MOQ шалгалт
       */
      validateMOQ: (productId: string, totalPcs: number, moq: number) => {
        return totalPcs >= moq;
      },

      // ========================================================================
      // ORDER ACTIONS
      // ========================================================================

      setDraftOrderUuid: (uuid: string) => {
        set({ draftOrderUuid: uuid, orderStatus: 'draft' });
      },

      setOrderStatus: (status: CartState['orderStatus']) => {
        set({ orderStatus: status });
      },

      setOrderError: (error: string | null) => {
        set({ orderError: error, orderStatus: error ? 'error' : get().orderStatus });
      },

      resetOrder: () => {
        set({
          draftOrderUuid: null,
          orderStatus: 'idle',
          orderError: null,
        });
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        items: state.items,
        selectedPartner: state.selectedPartner,
        warehouseId: state.warehouseId,
        warehouseName: state.warehouseName,
        draftOrderUuid: state.draftOrderUuid,
        orderStatus: state.orderStatus,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const totals = calculateCartTotals(state.items);
          Object.assign(state, totals);
          state.hasPartner = !!state.selectedPartner;
        }
      },
    }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

export const selectCartItems = (state: CartState) => state.items;
export const selectCartItemCount = (state: CartState) => state.itemCount;
export const selectCartTotal = (state: CartState) => state.totalAmount;
export const selectCartIsEmpty = (state: CartState) => state.isEmpty;
export const selectSelectedPartner = (state: CartState) => state.selectedPartner;
export const selectHasPartner = (state: CartState) => state.hasPartner;
