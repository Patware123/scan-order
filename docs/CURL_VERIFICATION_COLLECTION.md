# ScanOrder End-to-End API Verification Collection (cURL)

This document contains ready-to-run `curl` commands covering the full lifecycle: Super Admin, Restaurant Owner, Customer QR Ordering, Kitchen Workflow, Payment, and Daily Analytics.

---

## 0. Quick Automated Execution

To run the complete automated verification flow with real database assertions in one command:

```bash
npm run test:flow
```

---

## 1. System Healthcheck

Verify the Next.js API server is running:

```bash
curl -X GET "http://localhost:3000/api/health"
```

**Expected Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-11-03T...",
  "service": "scan-order-system"
}
```

---

## 2. Customer QR Scan & Digital Menu Flow

### 2.1 Customer Scans QR Code & Loads Menu
- **Table QR Token**: `token_9115fa09_t01` (Table T-01 at *The Royal Biryani House*)

```bash
curl -X GET "http://localhost:3000/api/public/menu/token_9115fa09_t01"
```

**What it verifies**:
- Validates the cryptographic QR token without requiring authentication.
- Returns restaurant details, branding (`#d97706`), active table `T-01`.
- Returns active categories (*Starters*, *Nizami Dum Biryani*, *Breads & Curries*, *Beverages*).
- Returns available menu items with prices in integer paise.

---

### 2.2 Customer Places an Order (Idempotent & Integer Paise)
- The customer adds items to their local cart and clicks **"Place Order"**.
- A client-generated UUID `idempotencyKey` is attached to prevent duplicate orders.

```bash
curl -X POST "http://localhost:3000/api/public/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "tableToken": "token_9115fa09_t01",
    "idempotencyKey": "a0000000-0000-0000-0000-000000000001",
    "items": [
      { "menuItemId": "REPLACE_WITH_MENU_ITEM_ID_1", "quantity": 2 },
      { "menuItemId": "REPLACE_WITH_MENU_ITEM_ID_2", "quantity": 1 }
    ],
    "specialInstructions": "Please make it mild spicy and crispy"
  }'
```

**What it verifies**:
- Server recalculates prices and taxes strictly in integer paise.
- Generates a human-readable order number (e.g. `ORD-20261103-0001`).
- Creates immutable item snapshots.
- Returns an unguessable `guest_tracking_token`.

---

### 2.3 Idempotency Duplicate Re-submission
Send the **exact same** request again with the same `idempotencyKey`:

```bash
curl -X POST "http://localhost:3000/api/public/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "tableToken": "token_9115fa09_t01",
    "idempotencyKey": "a0000000-0000-0000-0000-000000000001",
    "items": [
      { "menuItemId": "REPLACE_WITH_MENU_ITEM_ID_1", "quantity": 2 },
      { "menuItemId": "REPLACE_WITH_MENU_ITEM_ID_2", "quantity": 1 }
    ]
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "isDuplicate": true,
    "order": { ... },
    "items": [ ... ]
  },
  "message": "Existing order retrieved"
}
```

---

### 2.4 Guest Live Order Status Tracking
The customer tracks their order using the returned `guest_tracking_token`:

```bash
curl -X GET "http://localhost:3000/api/public/orders/REPLACE_WITH_GUEST_TRACKING_TOKEN"
```

**What it verifies**:
- Customer sees live status (`PENDING`, `ACCEPTED`, `PREPARING`, `READY`, `COMPLETED`).
- Status history events with timestamps.
- Zero private data from other tables or orders is leaked.

---

## 3. Restaurant Staff & Kitchen Order Queue Flow

### 3.1 Polling Active Orders Queue (Manager / KDS)
Retrieve active pending/preparing orders with pagination and polling support:

```bash
curl -X GET "http://localhost:3000/api/restaurant/REPLACE_WITH_RESTAURANT_ID/orders?status=PENDING&limit=10"
```

---

### 3.2 Accept Incoming Order (Manager)
Transition order from `PENDING` to `ACCEPTED`:

```bash
curl -X PATCH "http://localhost:3000/api/restaurant/REPLACE_WITH_RESTAURANT_ID/orders/REPLACE_WITH_ORDER_ID/status" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ACCEPTED",
    "note": "Manager accepted order"
  }'
```

---

### 3.3 Kitchen Starts Cooking (KDS)
Advance order from `ACCEPTED` to `PREPARING`:

```bash
curl -X PATCH "http://localhost:3000/api/restaurant/REPLACE_WITH_RESTAURANT_ID/orders/REPLACE_WITH_ORDER_ID/status" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PREPARING",
    "note": "Chef started cooking in tandoor"
  }'
```

---

### 3.4 Kitchen Marks Order Ready
Advance order from `PREPARING` to `READY`:

```bash
curl -X PATCH "http://localhost:3000/api/restaurant/REPLACE_WITH_RESTAURANT_ID/orders/REPLACE_WITH_ORDER_ID/status" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "READY",
    "note": "Order plated and ready for pickup"
  }'
```

---

### 3.5 Complete Order
Finalize order from `READY` to `COMPLETED`:

```bash
curl -X PATCH "http://localhost:3000/api/restaurant/REPLACE_WITH_RESTAURANT_ID/orders/REPLACE_WITH_ORDER_ID/status" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED",
    "note": "Served to table"
  }'
```

---

### 3.6 Settle Counter Payment (UNPAID -> PAID)
Update manual payment status:

```bash
curl -X PATCH "http://localhost:3000/api/restaurant/REPLACE_WITH_RESTAURANT_ID/orders/REPLACE_WITH_ORDER_ID/payment" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentStatus": "PAID"
  }'
```

---

## 4. Reports & Business Intelligence

### 4.1 Daily Metrics Report
Aggregated daily metrics (revenue in integer paise, ticket size, completed count):

```bash
curl -X GET "http://localhost:3000/api/restaurant/REPLACE_WITH_RESTAURANT_ID/reports/daily"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "date": "2026-11-03",
    "metrics": {
      "totalOrders": 5,
      "completedOrders": 2,
      "cancelledOrders": 0,
      "rejectedOrders": 0,
      "totalRevenuePaise": 184800,
      "paidRevenuePaise": 184800,
      "averageOrderValuePaise": 92400
    }
  }
}
```

---

### 4.2 Top Selling Items
Rank menu items by quantity sold and revenue generated:

```bash
curl -X GET "http://localhost:3000/api/restaurant/REPLACE_WITH_RESTAURANT_ID/reports/top-items?limit=5"
```

---

## 5. Security & Edge Case Defenses

### 5.1 Illegal State Machine Transition Block
Attempting to revert a `COMPLETED` order back to `PENDING`:

```bash
curl -X PATCH "http://localhost:3000/api/restaurant/REPLACE_WITH_RESTAURANT_ID/orders/REPLACE_WITH_ORDER_ID/status" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PENDING"
  }'
```

**Expected Response (`409 Conflict`)**:
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Illegal order status transition from 'COMPLETED' to 'PENDING'"
  }
}
```

---

### 5.2 Price Tampering Attempt Block
Client submits a modified unit price of ₹1.00 (`tamperedPricePaise: 100`):

```bash
curl -X POST "http://localhost:3000/api/public/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "tableToken": "token_9115fa09_t01",
    "idempotencyKey": "a0000000-0000-0000-0000-000000000099",
    "items": [
      { "menuItemId": "REPLACE_WITH_MENU_ITEM_ID_1", "quantity": 1, "tamperedPricePaise": 100 }
    ]
  }'
```

**What it verifies**:
- Server calculates subtotal strictly using the database price (`price_paise: 34000`), ignoring the client's attempted override.
