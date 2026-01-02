# Maximus Sales System Architecture

## 📊 System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              MAXIMUS SALES SYSTEM                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌─────────────┐         ┌─────────────┐         ┌─────────────────────────┐  │
│   │   Mobile    │         │     Web     │         │      Backend APIs       │  │
│   │  (Expo/RN)  │         │  (Next.js)  │         │                         │  │
│   │             │         │             │         │  ┌─────────────────┐    │  │
│   │  apps/      │         │  apps/      │         │  │   GraphQL API   │    │  │
│   │  mobile/    │         │  web/       │         │  │  (Auth Only)    │    │  │
│   │             │         │             │         │  │                 │    │  │
│   └──────┬──────┘         └──────┬──────┘         │  │ cloud.maximus.mn│    │  │
│          │                       │                │  └────────┬────────┘    │  │
│          │                       │                │           │             │  │
│          │    ┌──────────────────┘                │  ┌────────▼────────┐    │  │
│          │    │                                   │  │    ERP (1C)     │    │  │
│          │    │     ┌─────────────────────┐       │  │   REST API      │    │  │
│          └────┴────►│  packages/shared/   │◄──────┤  │                 │    │  │
│                     │  - stores           │       │  │ 203.21.120.60   │    │  │
│                     │  - services         │       │  │ :8080           │    │  │
│                     │  - types            │       │  └─────────────────┘    │  │
│                     └─────────────────────┘       │                         │  │
│                                                   └─────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

### Login Process

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              AUTHENTICATION FLOW                                  │
└──────────────────────────────────────────────────────────────────────────────────┘

  User                    App/Web                    GraphQL                  ERP
   │                         │                          │                      │
   │  1. Enter credentials   │                          │                      │
   │  ──────────────────────>│                          │                      │
   │                         │                          │                      │
   │                         │  2. POST /graphql        │                      │
   │                         │  mutation login {        │                      │
   │                         │    login(email, pass) {  │                      │
   │                         │      access_token        │                      │
   │                         │      erp_details {       │                      │
   │                         │        routeId           │                      │
   │                         │        warehouses[]      │                      │
   │                         │        priceTypeId       │                      │
   │                         │      }                   │                      │
   │                         │    }                     │                      │
   │                         │  }                       │                      │
   │                         │  ─────────────────────────>                     │
   │                         │                          │                      │
   │                         │  3. Response:            │                      │
   │                         │  {                       │                      │
   │                         │    access_token: "xxx",  │                      │
   │                         │    erp_details: {        │                      │
   │                         │      routeId: "abc-123", │                      │
   │                         │      warehouses: [...],  │                      │
   │                         │      priceTypeId: "def"  │                      │
   │                         │    }                     │                      │
   │                         │  }                       │                      │
   │                         │  <─────────────────────────                     │
   │                         │                          │                      │
   │                         │  4. Store in localStorage:                      │
   │                         │  - auth_token                                   │
   │                         │  - erp_details                                  │
   │                         │  - user_info                                    │
   │                         │                          │                      │
   │  5. Redirect Dashboard  │                          │                      │
   │  <──────────────────────│                          │                      │
   │                         │                          │                      │
```

### Token Storage

```typescript
// localStorage keys
{
  "auth_token": "eyJhbGciOiJIUzI1NiIs...",
  "erp_details": {
    "routeId": "5a811d4a-6dc5-11e6-9c23-3085a97c20be",
    "warehouses": [
      {
        "id": "5a811d4a-6dc5-11e6-9c23-3085a97c20be",
        "name": "Үндсэн агуулах",
        "isDefault": true
      }
    ],
    "priceTypeId": "ee731f38-6e58-11e6-9c23-3085a97c20be"
  },
  "user_info": {
    "id": "123",
    "name": "Борлуулагч",
    "email": "sales@maximus.mn"
  }
}
```

---

## 🔄 API Workflow

### Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              API REQUEST FLOW                                     │
└──────────────────────────────────────────────────────────────────────────────────┘

                         ONLY for Auth
  ┌─────────────┐         │
  │   GraphQL   │◄────────┘
  │   cloud.    │
  │ maximus.mn  │
  │  /graphql   │
  └─────────────┘
                                    
                          ┌──────────────────────────────────────────────────┐
                          │                                                  │
  ┌─────────────┐         │    ┌─────────────┐        ┌──────────────────┐  │
  │  Browser    │  ───────┼───>│ Next.js API │ ──────>│    ERP (1C)      │  │
  │  (Client)   │         │    │   Proxy     │        │   REST API       │  │
  │             │  <──────┼────│ /api/erp/*  │ <──────│                  │  │
  └─────────────┘         │    └─────────────┘        └──────────────────┘  │
                          │                                                  │
                          │    Proxy adds:                                   │
                          │    - Basic Auth header                          │
                          │    - Handles CORS                               │
                          └──────────────────────────────────────────────────┘

```

### Why Proxy?

```
Browser ──X──> ERP Server (CORS Blocked!)
                      │
                      ▼
Browser ───> Next.js API ───> ERP Server (OK!)
             (Same Origin)    (Server-to-Server)
```

---

## 📦 Products API Flow

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           PRODUCTS API WORKFLOW                                   │
└──────────────────────────────────────────────────────────────────────────────────┘

  Products Page              Product Store           API Service            ERP
       │                          │                      │                   │
       │  1. useEffect()          │                      │                   │
       │  ──────────────────────> │                      │                   │
       │                          │                      │                   │
       │                          │  2. Get auth params: │                   │
       │                          │  - warehouseId       │                   │
       │                          │  - priceTypeId       │                   │
       │                          │  from localStorage   │                   │
       │                          │                      │                   │
       │                          │  3. api.getProducts()│                   │
       │                          │  ─────────────────────>                  │
       │                          │                      │                   │
       │                          │                      │  4. GET /api/erp/ │
       │                          │                      │  pr/Products?     │
       │                          │                      │  warehouseId=xxx& │
       │                          │                      │  priceTypeId=yyy& │
       │                          │                      │  page=1&          │
       │                          │                      │  pageSize=20      │
       │                          │                      │  ────────────────>│
       │                          │                      │                   │
       │                          │                      │  5. Response:     │
       │                          │                      │  {                │
       │                          │                      │    data: [...],   │
       │                          │                      │    total: 1234,   │
       │                          │                      │    page: 1,       │
       │                          │                      │    pageSize: 20   │
       │                          │                      │  }                │
       │                          │                      │  <────────────────│
       │                          │                      │                   │
       │                          │  6. Transform data   │                   │
       │                          │  <─────────────────────                  │
       │                          │                      │                   │
       │  7. Update UI            │                      │                   │
       │  <────────────────────── │                      │                   │
       │                          │                      │                   │
```

---

## 👥 Partners API Flow

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           PARTNERS API WORKFLOW                                   │
└──────────────────────────────────────────────────────────────────────────────────┘

  Partners Page              Partner Store           API Service            ERP
       │                          │                      │                   │
       │  1. useEffect()          │                      │                   │
       │  ──────────────────────> │                      │                   │
       │                          │                      │                   │
       │                          │  2. Get routeId      │                   │
       │                          │  from localStorage   │                   │
       │                          │                      │                   │
       │                          │  3. api.getPartners()│                   │
       │                          │  ─────────────────────>                  │
       │                          │                      │                   │
       │                          │                      │  4. GET /api/erp/ │
       │                          │                      │  cl/Companies?    │
       │                          │                      │  routeId=xxx&     │
       │                          │                      │  page=1&          │
       │                          │                      │  pageSize=20      │
       │                          │                      │  ────────────────>│
       │                          │                      │                   │
       │                          │                      │  5. Response      │
       │                          │                      │  <────────────────│
       │                          │                      │                   │
       │                          │  6. Transform data   │                   │
       │                          │  <─────────────────────                  │
       │                          │                      │                   │
       │  7. Update UI            │                      │                   │
       │  <────────────────────── │                      │                   │
       │                          │                      │                   │
```

---

## 🛒 Order Creation Flow (Future)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           ORDER CREATION WORKFLOW                                 │
└──────────────────────────────────────────────────────────────────────────────────┘

  Cart Page                  Order Store            API Service            ERP
       │                          │                      │                   │
       │  1. Submit Order         │                      │                   │
       │  ──────────────────────> │                      │                   │
       │                          │                      │                   │
       │                          │  2. Prepare order:   │                   │
       │                          │  {                   │                   │
       │                          │    partnerId: "xxx", │                   │
       │                          │    warehouseId: "yy",│                   │
       │                          │    items: [          │                   │
       │                          │      {               │                   │
       │                          │        productId,    │                   │
       │                          │        quantity,     │                   │
       │                          │        price         │                   │
       │                          │      }               │                   │
       │                          │    ]                 │                   │
       │                          │  }                   │                   │
       │                          │                      │                   │
       │                          │  3. POST /api/erp/   │                   │
       │                          │  ord/Orders          │                   │
       │                          │  ─────────────────────>                  │
       │                          │                      │  ────────────────>│
       │                          │                      │                   │
       │                          │                      │  4. Response:     │
       │                          │                      │  { orderId: "123"}│
       │                          │                      │  <────────────────│
       │                          │                      │                   │
       │  5. Show success         │                      │                   │
       │  <────────────────────── │                      │                   │
       │                          │                      │                   │
```

---

## 📁 Project Structure

```
sales.maximus.mn/
├── apps/
│   ├── mobile/                    # React Native (Expo)
│   │   ├── App.tsx
│   │   ├── app.json
│   │   └── package.json
│   │
│   └── web/                       # Next.js
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx
│       │   │   ├── login/
│       │   │   │   └── page.tsx
│       │   │   ├── dashboard/
│       │   │   │   ├── layout.tsx     # Sidebar + Header
│       │   │   │   ├── page.tsx       # Dashboard home
│       │   │   │   ├── products/
│       │   │   │   │   └── page.tsx   # Products list
│       │   │   │   ├── partners/
│       │   │   │   │   └── page.tsx   # Partners list
│       │   │   │   └── orders/
│       │   │   │       └── page.tsx   # Orders (future)
│       │   │   │
│       │   │   └── api/
│       │   │       └── erp/
│       │   │           └── [...path]/
│       │   │               └── route.ts  # ERP Proxy
│       │   │
│       │   ├── components/
│       │   │   ├── ui/                # shadcn/ui
│       │   │   └── auth/
│       │   │       └── AuthGuard.tsx
│       │   │
│       │   ├── hooks/
│       │   │   └── useAuth.ts
│       │   │
│       │   ├── lib/
│       │   │   ├── auth.ts            # Token management
│       │   │   └── utils.ts
│       │   │
│       │   ├── services/
│       │   │   └── api.ts             # API service
│       │   │
│       │   ├── stores/
│       │   │   ├── product-store.ts   # Zustand store
│       │   │   └── partner-store.ts   # Zustand store
│       │   │
│       │   └── types/
│       │       ├── index.ts
│       │       ├── product.ts
│       │       └── partner.ts
│       │
│       └── .env.local                 # Environment vars
│
└── packages/
    └── shared/                        # Shared code
        └── src/
            ├── services/
            ├── stores/
            └── types/
```

---

## 🌐 API Endpoints

### GraphQL (cloud.maximus.mn/graphql)

| Operation | Purpose |
|-----------|---------|
| `mutation login` | User authentication |
| `mutation logout` | End session |
| `query me` | Get current user |

### ERP REST API (203.21.120.60:8080)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/hs/pr/Products` | GET | List products |
| `/hs/pr/Products/{id}` | GET | Product detail |
| `/hs/cl/Companies` | GET | List partners |
| `/hs/cl/Companies/{id}` | GET | Partner detail |
| `/hs/ord/Orders` | POST | Create order |
| `/hs/ord/Orders` | GET | List orders |

### Query Parameters

```
Products:
  - page: number
  - pageSize: number
  - warehouseId: string (required)
  - priceTypeId: string (required)
  - search: string (optional)
  - categoryId: string (optional)

Partners:
  - page: number
  - pageSize: number
  - routeId: string (required)
  - search: string (optional)
```

---

## 🔧 Environment Variables

```env
# .env.local

# GraphQL API (Auth only)
NEXT_PUBLIC_GRAPHQL_URL=https://cloud.maximus.mn/graphql

# ERP API (via proxy)
ERP1C_BASE_URL=http://203.21.120.60:8080/maximus_trade/hs
ERP1C_USERNAME=TestAPI
ERP1C_PASSWORD=jI9da0zu
```

---

## 🔒 Security

### Authentication Headers

```typescript
// GraphQL requests
headers: {
  'Authorization': `Bearer ${access_token}`,
  'Content-Type': 'application/json'
}

// ERP requests (server-side proxy)
headers: {
  'Authorization': `Basic ${btoa('TestAPI:jI9da0zu')}`,
  'Content-Type': 'application/json'
}
```

### CORS Solution

```
┌─────────────────────────────────────────────────────────┐
│                    CORS SOLUTION                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Browser (localhost:3000)                               │
│       │                                                 │
│       │  Same-origin request                            │
│       ▼                                                 │
│  Next.js API (/api/erp/*)                              │
│       │                                                 │
│       │  Server-to-server (no CORS)                     │
│       │  + Basic Auth header                            │
│       ▼                                                 │
│  ERP Server (203.21.120.60:8080)                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📱 Mobile vs Web

| Feature | Web (Next.js) | Mobile (Expo) |
|---------|---------------|---------------|
| Auth Storage | localStorage | AsyncStorage |
| API Proxy | /api/erp/* | Direct (no CORS) |
| State | Zustand | Zustand |
| UI | shadcn/ui | React Native |
| Routing | App Router | Expo Router |

---

## 🚀 Future Improvements

1. **Offline Support** - Cache products/partners locally
2. **Push Notifications** - Order status updates
3. **Barcode Scanner** - Quick product lookup (mobile)
4. **GPS Tracking** - Route optimization (mobile)
5. **Analytics Dashboard** - Sales reports
6. **Multi-language** - EN/MN support

---

*Last Updated: January 2026*
