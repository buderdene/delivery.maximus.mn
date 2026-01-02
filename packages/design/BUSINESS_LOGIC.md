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

## 🛒 Cart & Order Logic (Future)

### Cart Structure

```typescript
interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Cart {
  partnerId: string;
  partner: Partner;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
}
```

### Order Validation Rules

```typescript
const validationRules = {
  // Хамгийн бага захиалгын дүн
  minOrderAmount: 50000,  // 50,000₮
  
  // Нэг барааны хамгийн их тоо
  maxItemQuantity: 1000,
  
  // Нийт барааны төрөл
  maxItemCount: 100,
  
  // Үлдэгдэл шалгах
  checkStock: true,
};
```

### Order Creation Flow

```
1. Validate cart items
   - Check stock availability
   - Check min order amount
   - Check partner status

2. Create order in ERP
   - POST /ord/Orders
   - Include all items
   - Include partner info

3. On Success:
   - Clear cart
   - Show confirmation
   - Generate order number

4. On Error:
   - Show error message
   - Keep cart items
   - Allow retry
```

### Order Statuses

| Status | Description | Color |
|--------|-------------|-------|
| pending | Хүлээгдэж буй | Yellow |
| confirmed | Баталгаажсан | Blue |
| processing | Бэлтгэж буй | Orange |
| shipped | Хүргэгдэж буй | Purple |
| delivered | Хүргэгдсэн | Green |
| cancelled | Цуцлагдсан | Red |

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

*Last Updated: January 2026*
