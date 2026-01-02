# Business Logic Documentation

## 📋 Overview

Maximus Sales System нь борлуулагчдад зориулсан B2B худалдааны систем юм.

---

## 👤 User Roles

### Борлуулагч (Sales Representative)
- Харилцагчдыг үзэх, хайх
- Бараа бүтээгдэхүүн үзэх
- Захиалга үүсгэх
- Өөрийн маршрутын харилцагчдыг л харна

### Админ (Future)
- Бүх борлуулагчдын мэдээлэл
- Тайлан, статистик
- Тохиргоо

---

## 🔐 Authentication Logic

### Login Process

```
1. User enters email + password
2. GraphQL validates credentials
3. If valid:
   - Generate JWT access_token
   - Fetch user's ERP details:
     - routeId (маршрут)
     - warehouses (агуулахууд)
     - priceTypeId (үнийн төрөл)
   - Return all to client
4. Client stores in localStorage
5. Redirect to dashboard
```

### Session Management

| Item | Storage | Expiry |
|------|---------|--------|
| access_token | localStorage | 24 hours |
| erp_details | localStorage | Until logout |
| user_info | localStorage | Until logout |

### Route Protection

```typescript
// AuthGuard component
if (!token) {
  redirect('/login');
}

// On each page load
if (tokenExpired) {
  logout();
  redirect('/login');
}
```

---

## 📦 Products Business Logic

### Data Requirements

Бараа бүрийн мэдээлэл:
- **ID** - ERP nomenclatureId
- **Name** - Барааны нэр
- **Article/Code** - Барааны код
- **Price** - Үнэ (priceTypeId-с хамаарна)
- **Stock** - Үлдэгдэл (warehouseId-с хамаарна)
- **Image** - Зураг
- **Category** - Ангилал

### Stock Status Logic

```typescript
function getStockStatus(stock: number): StockStatus {
  if (stock <= 0) return 'out_of_stock';    // Дууссан
  if (stock < 10) return 'low_stock';        // Цөөн
  return 'in_stock';                          // Байгаа
}
```

### Price Formatting

```typescript
function formatMNT(price: number): string {
  return new Intl.NumberFormat('mn-MN').format(price) + '₮';
}

// Examples:
// 1500 → "1,500₮"
// 25000 → "25,000₮"
```

### Filtering Rules

| Filter | Type | Description |
|--------|------|-------------|
| search | string | Нэр, код дээр хайна |
| categoryId | string | Ангилалаар шүүх |
| page | number | Хуудаслалт |
| pageSize | number | Default: 20 |

### Warehouse Priority

```
1. User's assigned warehouses (from erp_details)
2. Default warehouse (isDefault: true)
3. First warehouse in list
```

---

## 👥 Partners Business Logic

### Data Requirements

Харилцагч бүрийн мэдээлэл:
- **ID** - ERP companyId
- **Name** - Нэр
- **TIN** - Регистрийн дугаар
- **Phone** - Утас
- **Address** - Хаяг
- **Location** - GPS координат
- **Balance** - Өрийн үлдэгдэл

### Route-based Access

```
Борлуулагч зөвхөн өөрийн маршрутын 
харилцагчдыг л харах боломжтой.

routeId = erp_details.routeId
```

### Balance Display

```typescript
function formatBalance(balance: number): string {
  const abs = Math.abs(balance);
  const formatted = formatMNT(abs);
  
  if (balance < 0) return `-${formatted}`;  // Өртэй
  if (balance > 0) return `+${formatted}`;  // Авлагатай
  return formatted;                          // Тэнцсэн
}
```

### Partner Status

| Status | Description |
|--------|-------------|
| active | Идэвхтэй |
| inactive | Идэвхгүй |
| blocked | Блоклогдсон (өр ихтэй) |

---

## 🛒 Cart & Order Logic

### Partner-Based Ordering

Захиалга бүр нэг харилцагчид холбогдоно. Бараа сагслахын өмнө заавал харилцагч сонгосон байх ёстой.

```typescript
interface SelectedPartner {
  id: string;
  name: string;
  routeName: string | null;
  phone: string | null;
  balance: number | null;
  street1: string | null;
}
```

### Cart Structure

```typescript
interface CartItem {
  id: string;
  productId: string;
  name: string;
  article: string | null;
  price: number;
  formattedPrice: string;
  quantity: number;
  maxQuantity: number;
  imageUrl: string | null;
  category: string | null;
}

interface CartStore {
  items: CartItem[];
  selectedPartner: SelectedPartner | null;
  
  // Computed
  totalItems: number;
  totalPrice: number;
  formattedTotal: string;
  isEmpty: boolean;
  hasPartner: boolean;
  
  // Actions
  addItem: (product, quantity) => void;
  removeItem: (productId) => void;
  updateQuantity: (productId, quantity) => void;
  incrementQuantity: (productId) => void;
  decrementQuantity: (productId) => void;
  clearCart: () => void;
  setSelectedPartner: (partner) => void;
  clearSelectedPartner: () => void;
}
```

### Partner-Cart Relationship

```
┌─────────────────────────────────────────────────────────────┐
│  Харилцагч сонгох → Бараа нэмэх → Сагс → Checkout → Захиалга│
└─────────────────────────────────────────────────────────────┘

1. Харилцагч сонгох (Partner Detail → "Захиалга үүсгэх")
   └── setSelectedPartner() → redirect /products

2. Бараа сагслах (Products page)
   └── hasPartner шалгах → addItem()

3. Сагс (Cart page)
   └── selectedPartner харуулах + items

4. Checkout
   └── Partner info + items → Create order

5. Захиалга амжилттай
   └── clearCart() + clearSelectedPartner()
```

### Partner Change Confirmation

Хэрвээ сагсанд бараа байхад өөр харилцагч сонгох гэвэл:

```typescript
// partners/[id]/page.tsx
if (selectedPartner && selectedPartner.id !== newPartnerId && totalItems > 0) {
  showConfirmDialog({
    title: 'Харилцагч солих уу?',
    description: `Одоогоор ${selectedPartner.name} дээр ${totalItems} бараа сонгогдсон байна.`,
    onConfirm: () => {
      clearCart();
      setSelectedPartner(newPartner);
    }
  });
}
```

### Partner Remove Confirmation

Харилцагч хасахад сагс хоосон эсэхийг шалгах:

```typescript
// layout.tsx, cart/page.tsx
if (totalItems > 0) {
  showConfirmDialog({
    title: 'Харилцагч хасах уу?',
    description: `${selectedPartner.name} хасахад ${totalItems} бараа устах болно.`,
    onConfirm: clearSelectedPartner  // clears cart too
  });
} else {
  clearSelectedPartner();
}
```

### Cart Item Remove Confirmation

```typescript
// cart/page.tsx - CartItemRow
showConfirmDialog({
  title: 'Бараа хасах уу?',
  description: `${item.name} (${item.quantity} ширхэг) барааг сагснаас хасах уу?`,
  onConfirm: () => removeItem(item.productId)
});
```

### Cart Clear Confirmation

```typescript
// cart/page.tsx - CartSummary
showConfirmDialog({
  title: 'Сагс хоослох уу?',
  description: `${totalItems} бараа устах болно. Мөн ${selectedPartner?.name} хасагдана.`,
  onConfirm: clearCart
});
```

### Product Add Validation

```typescript
// products/page.tsx
function handleProductClick(product: Product) {
  // 1. Partner check
  if (!hasPartner) {
    toast.error('Эхлээд харилцагч сонгоно уу');
    return;
  }
  
  // 2. Stock check
  if (product.stock_status === 'out_of_stock' || product.current_stock <= 0) {
    toast.error('Бараа дууссан байна');
    return;
  }
  
  // 3. Open quantity keypad
  openKeypad(product);
}
```

### Quantity Keypad

Тоо ширхэг оруулах интерфэйс:

```typescript
interface QuantityKeypadProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
  maxQuantity: number;
  productName: string;
  resetKey: number;  // Reset keypad on open
}

// Features:
// - 0-9 numpad
// - Backspace
// - Quick quantities: +1, +5, +10
// - Max quantity validation
// - Shake animation on invalid input
```

### Cart Validation Rules

```typescript
function validateCart(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Partner required
  if (!selectedPartner) {
    errors.push('Харилцагч сонгоогүй байна');
  }
  
  // Cart not empty
  if (items.length === 0) {
    errors.push('Сагс хоосон байна');
  }
  
  // Check each item
  items.forEach(item => {
    if (item.quantity > item.maxQuantity) {
      errors.push(`${item.name}: үлдэгдэл хүрэлцэхгүй`);
    }
    if (item.maxQuantity <= 5) {
      warnings.push(`${item.name}: үлдэгдэл цөөн (${item.maxQuantity})`);
    }
  });
  
  return { isValid: errors.length === 0, errors, warnings };
}
```

### LocalStorage Persistence

```typescript
// Cart and Partner persist to localStorage
const STORAGE_KEY = 'maximus-cart';

// On store init
const persisted = localStorage.getItem(STORAGE_KEY);
if (persisted) {
  const { items, selectedPartner } = JSON.parse(persisted);
  // Restore state
}

// On state change
localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, selectedPartner }));
```

### Order Creation Flow

```
1. Validate cart
   ├── Check selectedPartner exists
   ├── Check items not empty
   └── Check stock availability

2. Create order in ERP
   POST /ord/Orders
   {
     partnerId: selectedPartner.id,
     partnerName: selectedPartner.name,
     items: [...],
     subtotal,
     discount,
     total
   }

3. On Success:
   ├── clearCart()
   ├── clearSelectedPartner()
   ├── Show success message
   └── Redirect to order confirmation

4. On Error:
   ├── Show error message
   ├── Keep cart items
   └── Allow retry
```

### UI Flow Summary

```
┌──────────────────────────────────────────────────────────────────┐
│                        SIDEBAR                                   │
│  ┌──────────────────────────────────────┐                       │
│  │ 📦 Захиалга: COMPANY_NAME            │ ← SelectedPartnerBadge │
│  │    Route: Маршрут нэр           [X]  │                       │
│  └──────────────────────────────────────┘                       │
│                                                                  │
│  - Хяналтын самбар                                              │
│  - Бараа материал                                                │
│  - Харилцагчид                                                   │
│  - Сагс (3)                                                      │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    PRODUCTS PAGE                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ ⚠️ Бараа сагслахын тулд эхлээд харилцагч сонгоно уу          ││
│  │                                    [Харилцагч сонгох]        ││
│  └──────────────────────────────────────────────────────────────┘│
│                            OR                                     │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ 🏢 Захиалга үүсгэж байна: COMPANY_NAME          [Сагс]       ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                      CART PAGE                                    │
│  ┌─────────────────────────────────────┐                        │
│  │ 🏢 Захиалах харилцагч          [X]  │                        │
│  │    COMPANY_NAME                      │                        │
│  │    📍 Route                          │                        │
│  │    📞 Phone                          │                        │
│  │    💰 Үлдэгдэл: 500,000₮            │                        │
│  └─────────────────────────────────────┘                        │
│                                                                  │
│  [CART ITEMS...]                                                 │
│                                                                  │
│  ┌─────────────────────────────────────┐                        │
│  │ Захиалгын дүн           3 бараа     │                        │
│  │ ─────────────────────────           │                        │
│  │ Дүн:                   125,000₮     │                        │
│  │ Хүргэлт:               Үнэгүй       │                        │
│  │ ─────────────────────────           │                        │
│  │ Нийт:                  125,000₮     │                        │
│  │ [Захиалга баталгаажуулах →]         │                        │
│  │ [Сагс хоослох]                      │                        │
│  └─────────────────────────────────────┘                        │
└──────────────────────────────────────────────────────────────────┘
```

### Confirmation Dialogs

| Action | Condition | Dialog Message |
|--------|-----------|----------------|
| Partner X (sidebar) | cart has items | "Харилцагч хасах уу?" + item count |
| Partner X (cart) | cart has items | "Харилцагч хасах уу?" + item count |
| Change partner | cart has items | "Харилцагч солих уу?" + old partner + item count |
| Remove cart item | always | "Бараа хасах уу?" + item name |
| Clear cart | always | "Сагс хоослох уу?" + item count + partner |

---

## 📱 Offline Logic (Future)

### Cached Data

| Data | Cache Duration | Priority |
|------|----------------|----------|
| Products | 24 hours | High |
| Partners | 24 hours | High |
| Categories | 7 days | Medium |
| Orders | Until synced | Critical |

### Sync Strategy

```
1. On app start:
   - Check network
   - If online: Sync pending orders
   - Fetch latest data

2. During use:
   - Save orders locally first
   - Background sync when online

3. Conflict resolution:
   - Server data wins
   - Notify user of changes
```

---

## 📊 Analytics Events (Future)

### Track Events

| Event | Data | Purpose |
|-------|------|---------|
| page_view | page_name | Usage analytics |
| product_view | product_id | Popular products |
| add_to_cart | product_id, qty | Cart analytics |
| order_created | order_id, amount | Sales tracking |
| search | query, results_count | Search improvement |

---

## 🔄 Data Refresh Rules

| Data | Auto Refresh | Manual Refresh |
|------|--------------|----------------|
| Products | On page visit | Pull-to-refresh |
| Partners | On page visit | Pull-to-refresh |
| Orders | Every 5 min | Pull-to-refresh |
| User info | On login only | - |

---

## ⚠️ Error Handling

### Error Types

| Code | Message | Action |
|------|---------|--------|
| 401 | Token expired | Logout, redirect to login |
| 403 | Access denied | Show error message |
| 404 | Not found | Show not found page |
| 500 | Server error | Show retry option |
| Network | No connection | Show offline mode |

### User-Friendly Messages

```typescript
const errorMessages = {
  'auth/invalid-credentials': 'Нэвтрэх нэр эсвэл нууц үг буруу байна',
  'auth/token-expired': 'Сешн дууссан байна, дахин нэвтэрнэ үү',
  'network/offline': 'Интернет холболт байхгүй байна',
  'order/insufficient-stock': 'Үлдэгдэл хүрэлцэхгүй байна',
  'order/min-amount': 'Хамгийн бага захиалгын дүн 50,000₮',
};
```

---

## 🎯 Performance Rules

### Pagination

- Default page size: 20 items
- Max page size: 100 items
- Infinite scroll for lists

### Image Optimization

- Thumbnail: 200x200px
- Product detail: 800x800px
- Lazy loading enabled

### API Caching

```typescript
// Cache configuration
const cacheConfig = {
  products: {
    ttl: 5 * 60 * 1000,  // 5 minutes
    staleWhileRevalidate: true,
  },
  partners: {
    ttl: 5 * 60 * 1000,
    staleWhileRevalidate: true,
  },
  categories: {
    ttl: 60 * 60 * 1000,  // 1 hour
    staleWhileRevalidate: true,
  },
};
```

---

*Last Updated: January 2, 2026*
*Version: 2.0 - Partner-Based Order Flow Implemented*
