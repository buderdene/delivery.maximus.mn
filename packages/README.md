# Maximus Sales Packages

Monorepo shared packages for Web and Mobile apps.

## 📦 Package Structure

```
packages/
├── api/             # @sales/api - Shared API clients
│   └── src/
│       ├── config.ts          # API configuration
│       └── services/
│           ├── erp.ts         # ERP (1C) REST API client
│           └── graphql.ts     # GraphQL client (auth only)
│
├── commerce/        # @sales/commerce - Cart & Checkout logic
│   └── src/
│       ├── types/             # Shared types
│       │   └── index.ts       # CartItem, Order, Payment types
│       ├── logic/             # Pure business logic
│       │   └── index.ts       # Pricing, validation, calculations
│       └── stores/            # Zustand stores
│           ├── cart-store.ts      # Cart management
│           └── checkout-store.ts  # Order creation, payment
│
├── design/          # Design documentation
│   ├── ARCHITECTURE.md
│   ├── API_FLOWS.md
│   └── BUSINESS_LOGIC.md
│
└── shared/          # @sales/shared - Legacy shared code
    └── src/
        ├── services/          # API services
        ├── stores/            # Product, Partner stores
        └── types/             # Type definitions
```

## 🔧 Usage

### Install dependencies

```bash
pnpm install
```

### In apps/web

```typescript
// Import from @sales/commerce
import { 
  useCartStore, 
  useCheckoutStore,
  formatPrice,
  validateCart,
} from '@sales/commerce';

// Import from @sales/api
import { 
  ERPApiClient, 
  GraphQLClient,
  setApiConfig,
} from '@sales/api';
```

### In apps/mobile

```typescript
// Same imports work for mobile
import { useCartStore, calculateOrderSummary } from '@sales/commerce';
import { ERPApiClient } from '@sales/api';

// Configure for mobile (no proxy needed)
const client = new ERPApiClient();
```

## 📚 Package Details

### @sales/commerce

**Types:**
- `CartItem` - Cart item with product info
- `Order` - Complete order with items, amounts, status
- `OrderStatus` - draft | pending | confirmed | processing | shipped | delivered | cancelled
- `PaymentMethod` - cash | qpay | bank_transfer | credit
- `PaymentStatus` - unpaid | partial | paid | refunded

**Logic:**
- `formatPrice(1500)` → "1,500₮"
- `getStockStatus(5)` → "low_stock"
- `validateCart(items, total)` → { isValid, errors, warnings }
- `calculateOrderSummary(items, discount)` → OrderSummary
- `generateOrderNumber()` → "ORD-260102-A1B2"

**Stores:**
- `useCartStore` - Add/remove items, quantity, validation
- `useCheckoutStore` - Customer, payment, order creation

### @sales/api

**ERPApiClient:**
- `getProducts(params)` - Fetch products with warehouse/price
- `getPartners(params)` - Fetch partners by route
- `createOrder(payload)` - Create order in ERP
- Supports proxy URL for web (CORS)

**GraphQLClient:**
- `login(email, password)` - Authentication
- `logout()` - End session
- `me()` - Get current user

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        APPS                                  │
├──────────────────────┬──────────────────────────────────────┤
│    apps/web          │         apps/mobile                  │
│    (Next.js)         │         (Expo)                       │
└──────────────────────┴──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      PACKAGES                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐     ┌─────────────────────────────┐   │
│  │  @sales/api     │     │     @sales/commerce         │   │
│  │                 │     │                             │   │
│  │  • ERPApiClient │     │  • useCartStore             │   │
│  │  • GraphQLClient│     │  • useCheckoutStore         │   │
│  │                 │     │  • Business logic           │   │
│  └────────┬────────┘     └──────────────────────────────┘  │
│           │                                                  │
└───────────┼──────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND                                 │
├──────────────────────┬──────────────────────────────────────┤
│   GraphQL API        │           ERP (1C) REST API          │
│   (Auth only)        │           (All data)                 │
│                      │                                       │
│   cloud.maximus.mn   │   203.21.120.60:8080/maximus_trade   │
└──────────────────────┴──────────────────────────────────────┘
```

## 🛠️ Development

### Adding to cart

```typescript
const { addItem, items, getSummary } = useCartStore();

// Add product
addItem(product, 1);

// Get summary
const summary = getSummary();
console.log(summary.formattedTotal); // "150,000₮"
```

### Creating order

```typescript
const { 
  setCustomer, 
  setPaymentMethod, 
  createOrder 
} = useCheckoutStore();

const { items, clearCart } = useCartStore();

// Set customer
setCustomer('partner-123', 'Дэлгүүр ХХК', '99001122');

// Set payment
setPaymentMethod('cash');

// Create order
const order = await createOrder(items);

// Clear cart
clearCart();
```

---

*Last Updated: January 2026*
