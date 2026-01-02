# API Flow Diagrams

## 1. Login Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant A as App/Web
    participant G as GraphQL API
    participant E as ERP (1C)

    U->>A: Enter email & password
    A->>G: mutation login(email, password)
    G->>G: Validate credentials
    G->>E: Get user ERP details
    E-->>G: Return routeId, warehouses, priceTypeId
    G-->>A: Return access_token + erp_details
    A->>A: Store in localStorage
    A-->>U: Redirect to Dashboard
```

## 2. Products Fetch Flow

```mermaid
sequenceDiagram
    participant P as Products Page
    participant S as Product Store
    participant API as API Service
    participant PX as Next.js Proxy
    participant E as ERP API

    P->>S: useEffect → fetchProducts()
    S->>S: Get warehouseId, priceTypeId from localStorage
    S->>API: getProducts(page, filters)
    API->>PX: GET /api/erp/pr/Products?warehouseId=xxx&priceTypeId=yyy
    PX->>PX: Add Basic Auth header
    PX->>E: GET /hs/pr/Products?...
    E-->>PX: { data: [...], total: 1234 }
    PX-->>API: Forward response
    API->>API: Transform to Product[]
    API-->>S: Return products
    S->>S: Update state
    S-->>P: Re-render with products
```

## 3. Partners Fetch Flow

```mermaid
sequenceDiagram
    participant P as Partners Page
    participant S as Partner Store
    participant API as API Service
    participant PX as Next.js Proxy
    participant E as ERP API

    P->>S: useEffect → fetchPartners()
    S->>S: Get routeId from localStorage
    S->>API: getPartners(page, routeId)
    API->>PX: GET /api/erp/cl/Companies?routeId=xxx
    PX->>PX: Add Basic Auth header
    PX->>E: GET /hs/cl/Companies?...
    E-->>PX: { data: [...], total: 567 }
    PX-->>API: Forward response
    API-->>S: Return partners
    S-->>P: Re-render with partners
```

## 4. Order Creation Flow (Future)

```mermaid
sequenceDiagram
    participant C as Cart
    participant O as Order Store
    participant API as API Service
    participant PX as Next.js Proxy
    participant E as ERP API

    C->>O: createOrder(items, partnerId)
    O->>O: Build order payload
    O->>API: createOrder(orderData)
    API->>PX: POST /api/erp/ord/Orders
    PX->>E: POST /hs/ord/Orders (with Basic Auth)
    E->>E: Create order in 1C
    E-->>PX: { success: true, orderId: "123" }
    PX-->>API: Forward response
    API-->>O: Return orderId
    O->>O: Clear cart, update state
    O-->>C: Show success
```

## 5. Token Refresh Flow

```mermaid
sequenceDiagram
    participant A as App
    participant API as API Service
    participant G as GraphQL

    A->>API: Any API request
    API->>API: Check token expiry
    alt Token expired
        API->>G: mutation refreshToken
        G-->>API: New access_token
        API->>API: Update localStorage
    end
    API->>API: Continue with request
```

## 6. Logout Flow

```mermaid
sequenceDiagram
    participant U as User
    participant A as App
    participant G as GraphQL

    U->>A: Click Logout
    A->>G: mutation logout
    G-->>A: Success
    A->>A: Clear localStorage
    A->>A: Clear all stores
    A-->>U: Redirect to Login
```

---

## State Management Flow

```mermaid
flowchart TB
    subgraph Browser
        LP[Login Page]
        DP[Dashboard]
        PP[Products Page]
        PAP[Partners Page]
    end

    subgraph Stores[Zustand Stores]
        PS[Product Store]
        PAS[Partner Store]
    end

    subgraph Storage[localStorage]
        AT[auth_token]
        ED[erp_details]
        UI[user_info]
    end

    subgraph APIs
        GQL[GraphQL API]
        ERP[ERP REST API]
    end

    LP -->|login| GQL
    GQL -->|token + erp_details| Storage
    
    PP -->|useProductStore| PS
    PS -->|read warehouseId| ED
    PS -->|fetch| ERP
    
    PAP -->|usePartnerStore| PAS
    PAS -->|read routeId| ED
    PAS -->|fetch| ERP
```

---

## Error Handling Flow

```mermaid
flowchart TD
    A[API Request] --> B{Response OK?}
    B -->|Yes| C[Process Data]
    B -->|No| D{Status Code}
    
    D -->|401| E[Token Expired]
    E --> F[Try Refresh Token]
    F -->|Success| G[Retry Request]
    F -->|Fail| H[Logout & Redirect]
    
    D -->|403| I[Access Denied]
    I --> J[Show Error Message]
    
    D -->|404| K[Not Found]
    K --> J
    
    D -->|500| L[Server Error]
    L --> M[Show Retry Option]
    
    D -->|Network Error| N[Offline/Timeout]
    N --> M
```

---

## Data Transformation Flow

```mermaid
flowchart LR
    subgraph ERP[ERP Response]
        E1[nomenclatureId]
        E2[nomenclatureName]
        E3[basePrice]
        E4[remainCount]
        E5[photoUrl]
    end

    subgraph App[App Product]
        A1[id]
        A2[name]
        A3[price / formatted_price]
        A4[current_stock / stock_status]
        A5[main_image_url]
    end

    E1 --> A1
    E2 --> A2
    E3 --> A3
    E4 --> A4
    E5 --> A5
```

### Transformation Code

```typescript
function transformProduct(erpProduct: ERPProduct): Product {
  const stock = erpProduct.remainCount ?? 0;
  
  return {
    id: erpProduct.nomenclatureId,
    name: erpProduct.nomenclatureName,
    article: erpProduct.nomenclatureCode,
    price: erpProduct.basePrice,
    formatted_price: formatMNT(erpProduct.basePrice),
    current_stock: stock,
    stock_status: getStockStatus(stock),
    main_image_url: erpProduct.photoUrl || null,
    category: erpProduct.categoryName,
    category_id: erpProduct.categoryId,
  };
}
```

---

## Component Lifecycle

```mermaid
flowchart TD
    subgraph Mount
        A[Component Mount] --> B[useEffect]
        B --> C[Check Auth]
        C -->|Not Logged In| D[Redirect to Login]
        C -->|Logged In| E[Fetch Data]
    end

    subgraph Fetch
        E --> F[Show Loading]
        F --> G[Call Store Action]
        G --> H{Success?}
        H -->|Yes| I[Update State]
        H -->|No| J[Show Error]
        I --> K[Render Data]
    end

    subgraph Interaction
        K --> L[User Action]
        L --> M[Update Store]
        M --> N[Re-render]
    end
```

---

## File Dependencies

```mermaid
flowchart TB
    subgraph Pages
        LP[login/page.tsx]
        PP[products/page.tsx]
        PAP[partners/page.tsx]
    end

    subgraph Stores
        PS[product-store.ts]
        PAS[partner-store.ts]
    end

    subgraph Services
        API[api.ts]
        AUTH[auth.ts]
    end

    subgraph Types
        PT[product.ts]
        PAT[partner.ts]
    end

    LP --> AUTH
    PP --> PS
    PP --> PT
    PAP --> PAS
    PAP --> PAT
    
    PS --> API
    PS --> AUTH
    PAS --> API
    PAS --> AUTH
    
    API --> PT
    API --> PAT
```

---

*These diagrams can be rendered using Mermaid-compatible viewers like GitHub, VS Code with Mermaid extension, or mermaid.live*
