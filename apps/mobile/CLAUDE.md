# Delivery Mobile App - Development Guide

## Overview
Энэ нь MAXIMUS системийн хүргэлтийн ажилтнуудад (жолооч, түгээгч, нярав) зориулсан React Native Expo mobile application юм.

## Tech Stack
- **Framework**: React Native with Expo SDK 54
- **Router**: expo-router (file-based routing)
- **State Management**: Zustand
- **Styling**: React Native StyleSheet
- **Icons**: lucide-react-native
- **API**: REST API (cloud.maximus.mn/api/delivery)

---

## Бизнес логик

### 1. Агуулахын тулгалт (Warehouse Checking) - "Хайрцагаар тулгах"

#### Зорилго
Агуулахаас машинд бараа ачих үед **нярав** болон **түгээгч/жолооч** хоёр талаас бараа тулгаж баталгаажуулах систем.

#### Оролцогчид
| Оролцогч | Үүрэг | Чек төрөл |
|----------|-------|-----------|
| **Нярав** (warehouse) | Агуулахаас бараа гаргаж өгөх | `warehouse_checked` |
| **Түгээгч/Жолооч** (driver) | Бараа хүлээн авах | `driver_checked` |

#### Процессын урсгал

```
┌─────────────────────────────────────────────────────────────────┐
│                    WAREHOUSE CHECKING FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Захиалгууд бэлтгэгдсэн (assigned_to_driver)                 │
│           ↓                                                      │
│  2. Нярав бараа тулгаж эхэлнэ (warehouse_checking)              │
│           ↓                                                      │
│  3. Түгээгч бараа хүлээн авч тулгана (driver_checking)          │
│           ↓                                                      │
│  4. Хоёулаа тулгасан бол → LOADED (ачигдсан)                    │
│           ↓                                                      │
│  5. Машин хөдөлнө (in_progress)                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Database Schema (erp_order_products)

```sql
-- Бараа тус бүр дээр хоёр талын чек хадгалагдана
warehouse_checked           BOOLEAN     -- Нярав тулгасан эсэх
warehouse_checked_at        TIMESTAMP   -- Нярав тулгасан цаг
warehouse_checked_quantity  INTEGER     -- Нярав тулгасан тоо ширхэг

driver_checked              BOOLEAN     -- Түгээгч тулгасан эсэх  
driver_checked_at           TIMESTAMP   -- Түгээгч тулгасан цаг
driver_checked_quantity     INTEGER     -- Түгээгч тулгасан тоо ширхэг
```

#### Статус тодорхойлолт

| Статус | Тайлбар |
|--------|---------|
| `pending` | Аль ч тал тулгаагүй |
| `checking` | Нэг тал тулгасан (warehouse_checked XOR driver_checked) |
| `loaded` | Хоёулаа тулгасан (warehouse_checked AND driver_checked) |

#### UI/UX Шийдэл

1. **Realtime Polling (3 секунд)**
   - Нярав, түгээгч хоёр нэгэн зэрэг ажиллах тул 3 секунд тутамд data шинэчлэгдэнэ
   - Silent refresh - алдаа харуулахгүй, loading indicator үзүүлэхгүй

2. **Optimistic UI Update**
   - Check товч дарахад UI шууд шинэчлэгдэнэ (API хүлээхгүй)
   - API алдаа гарвал өмнөх төлөвт буцна

3. **Dual Progress Bars**
   - Нярав (ногоон): warehouse_checked_quantity / total_quantity
   - Түгээгч (цэнхэр): driver_checked_quantity / total_quantity

4. **Visual States**
   | Төлөв | Харагдах байдал |
   |-------|-----------------|
   | Аль ч тал тулгаагүй | Цагаан дэвсгэр |
   | Нэг тал тулгасан | Хэвийн харагдана |
   | Хоёулаа тулгасан | Бүдэг саарал, opacity: 0.8 |

5. **Check Indicators**
   - `Н` - Нярав (ногоон ✓ эсвэл саарал ○)
   - `Т` - Түгээгч (цэнхэр ✓ эсвэл саарал ○)

#### API Endpoints

```
POST /api/delivery/warehouse/toggle-check
Body: {
  order_uuid: string,
  product_id: number,
  checker_type: 'warehouse' | 'driver',
  checked: boolean,
  quantity?: number
}

POST /api/delivery/warehouse/bulk-check
Body: {
  order_uuid: string,
  product_ids: number[],
  checker_type: 'warehouse' | 'driver',
  checked: boolean
}
```

#### Checker Type Сонголт
- App дотор "Нярав" эсвэл "Түгээгч" товч дээр дарж checker төрөл сольж болно
- Идэвхтэй төрөл цэнхэр хүрээтэй харагдана
- Default: 'driver' (delivery app учраас)

---

### 2. Бараа бүлэглэлт (Product Aggregation)

#### Зорилго
Олон захиалгад давтагдсан ижил барааг нэгтгэж, брэндээр бүлэглэн харуулах.

#### Бүлэглэх логик
```
Product Key = product_uuid + "_" + (serial_number || "no_serial")
```

- Ижил product_uuid-тай ч **өөр serial number**-тай бараа = **өөр мөр**
- Ижил product_uuid + ижил serial = **нэгтгэгдэнэ**

#### Эрэмбэлэх сонголтууд
| Сонголт | Тайлбар |
|---------|---------|
| `brand` | Брэндээр бүлэглэж, А-Я дарааллаар |
| `name` | Барааны нэрээр А-Я дарааллаар |
| `quantity_desc` | Их → Бага |
| `quantity_asc` | Бага → Их |

---

### 3. Захиалгын төлөв (Delivery Status Flow)

```
pending → assigned_to_driver → warehouse_checking → warehouse_checked 
       → driver_checking → loaded → in_progress → delivered
                                              ↘ failed
                                              ↘ cancelled
```

---

## File Structure

```
app/package/[id]/
├── index.tsx      # Package details & navigation
├── orders.tsx     # Orders list in package
└── box.tsx        # Box checking (warehouse checking) ← MAIN FEATURE
```

---

## Code Conventions

1. **State Management**
   - Local state: `useState`
   - Global auth: `useAuthStore` (Zustand)

2. **API Calls**
   - Use functions from `services/delivery-api.ts`
   - Always handle loading, error states

3. **Styling**
   - Use `StyleSheet.create()` at bottom of file
   - Font family: 'GIP-Regular', 'GIP-Medium', 'GIP-SemiBold', 'GIP-Bold'
   - Colors: Follow existing color scheme (primary: #e17100 (orange), secondary: #f59e0b)

4. **TypeScript**
   - Define interfaces for all data types
   - Use strict typing for API responses
