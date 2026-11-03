# ScanOrder API Documentation

Comprehensive REST API reference for the ScanOrder Multi-Tenant QR Restaurant Ordering SaaS.

---

## Standard Response Envelope

All API endpoints return JSON in the following standard envelope format:

### Success Response (`200 OK` / `201 Created`)
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable confirmation message",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "hasMore": true
  }
}
```

### Error Response (`400`, `401`, `403`, `404`, `409`, `422`, `500`)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "items.0.quantity",
        "message": "Quantity must be at least 1"
      }
    ]
  }
}
```

---

## 1. Public Customer Endpoints (No Auth Required)

### 1.1 Fetch Digital Menu
- **Method**: `GET`
- **Endpoint**: `/api/public/menu/:tableToken`
- **Auth**: None (Guest)
- **Description**: Resolves table session from QR token and returns active categories, available menu items, and restaurant branding.
- **Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "table": {
      "id": "e3b0c442-98fc-1c14-9afb-4c72fe984123",
      "tableNumber": "T-12"
    },
    "restaurant": {
      "id": "7b5b5428-c114-46b3-a128-444455556666",
      "name": "Spice Garden Cafe",
      "slug": "spice-garden",
      "currency": "INR",
      "branding": {
        "logo_url": "https://...",
        "primary_color": "#0f172a"
      }
    },
    "categories": [
      { "id": "...", "name": "Starters", "sort_order": 1, "is_active": true }
    ],
    "items": [
      {
        "id": "...",
        "name": "Paneer Tikka",
        "description": "Clay-oven roasted cottage cheese",
        "price_paise": 28000,
        "is_veg": true,
        "is_available": true,
        "tax_rate_percentage": 5.0
      }
    ]
  }
}
```

### 1.2 Submit Customer Order
- **Method**: `POST`
- **Endpoint**: `/api/public/orders`
- **Auth**: None (Guest)
- **Safety Protections**:
  - Idempotency key uniqueness (`UNIQUE(restaurant_id, idempotency_key)`).
  - Server-side price calculation in integer paise.
  - Frozen order-item snapshots.
  - Atomic database commit.
- **Request Body**:
```json
{
  "tableToken": "7f8b9c2a1e3d4f5g6h7i8j9k0l1m2n3o",
  "idempotencyKey": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "items": [
    {
      "menuItemId": "6c2b1d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e",
      "quantity": 2
    }
  ],
  "specialInstructions": "Less spicy please"
}
```
- **Success Response (201 Created / 200 OK on Idempotent Re-submit)**:
```json
{
  "success": true,
  "data": {
    "isDuplicate": false,
    "order": {
      "id": "...",
      "order_number": "ORD-20261102-0001",
      "order_status": "PENDING",
      "payment_status": "UNPAID",
      "subtotal_paise": 56000,
      "tax_paise": 2800,
      "total_paise": 58800,
      "guest_tracking_token": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
    },
    "items": [
      {
        "item_name_snapshot": "Paneer Tikka",
        "unit_price_paise": 28000,
        "quantity": 2,
        "line_total_paise": 56000
      }
    ]
  },
  "message": "Order placed successfully"
}
```

### 1.3 Track Guest Order
- **Method**: `GET`
- **Endpoint**: `/api/public/orders/:trackingToken`
- **Auth**: None (Protected by unguessable UUID token)
- **Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "order_number": "ORD-20261102-0001",
    "order_status": "PREPARING",
    "payment_status": "UNPAID",
    "total_paise": 58800,
    "order_items": [...],
    "order_status_events": [
      { "previous_status": null, "new_status": "PENDING" },
      { "previous_status": "PENDING", "new_status": "ACCEPTED" },
      { "previous_status": "ACCEPTED", "new_status": "PREPARING" }
    ]
  }
}
```

---

## 2. Super Admin Endpoints

| Method | Endpoint | Required Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/restaurants` | `SUPER_ADMIN` | List all platform restaurants with pagination and subscription info |
| `POST` | `/api/admin/restaurants` | `SUPER_ADMIN` | Onboard a new restaurant tenant with default branding and subscription |
| `GET` | `/api/admin/restaurants/:id` | `SUPER_ADMIN` | View restaurant details and subscription status |
| `PATCH` | `/api/admin/restaurants/:id` | `SUPER_ADMIN` | Update restaurant status or details |
| `GET` | `/api/admin/plans` | Public / Admin | List available subscription tiers and table limits |

---

## 3. Restaurant Staff & Management Endpoints

All endpoints require authentication and verified role membership in `restaurant_users`.

### 3.1 Restaurant Details & Branding
- `GET /api/restaurant/:id`: Allowed: `OWNER`, `MANAGER`, `KITCHEN`
- `PATCH /api/restaurant/:id`: Allowed: `OWNER`
- `PATCH /api/restaurant/:id/branding`: Allowed: `OWNER`, `MANAGER`
- `GET /api/restaurant/:id/users`: Allowed: `OWNER`, `MANAGER`

### 3.2 Staff Invitations
- `GET /api/restaurant/:id/invitations`: Allowed: `OWNER`, `MANAGER`
- `POST /api/restaurant/:id/invitations`: Allowed: `OWNER`, `MANAGER`
  - Body: `{ "email": "chef@restaurant.com", "role": "KITCHEN" }`
- `DELETE /api/restaurant/:id/invitations/:invitationId`: Allowed: `OWNER`
- `POST /api/invitations/accept`: Authenticated user accepts via `{ "token": "..." }`

### 3.3 Menu & Categories
- `GET /api/restaurant/:id/categories`: Allowed: `OWNER`, `MANAGER`, `KITCHEN`
- `POST /api/restaurant/:id/categories`: Allowed: `OWNER`, `MANAGER`
- `PATCH /api/restaurant/:id/categories/:categoryId`: Allowed: `OWNER`, `MANAGER`
- `DELETE /api/restaurant/:id/categories/:categoryId`: Allowed: `OWNER`, `MANAGER`
- `POST /api/restaurant/:id/categories/reorder`: Allowed: `OWNER`, `MANAGER`
- `GET /api/restaurant/:id/menu-items`: Allowed: `OWNER`, `MANAGER`, `KITCHEN`
- `POST /api/restaurant/:id/menu-items`: Allowed: `OWNER`, `MANAGER`
  - Body: `{ "categoryId": "...", "name": "...", "pricePaise": 25000, "isVeg": true, "taxRatePercentage": 5.0 }`
- `PATCH /api/restaurant/:id/menu-items/:itemId`: Allowed: `OWNER`, `MANAGER`
- `DELETE /api/restaurant/:id/menu-items/:itemId`: Allowed: `OWNER`, `MANAGER`
- `PATCH /api/restaurant/:id/menu-items/:itemId/availability`: Allowed: `OWNER`, `MANAGER`, `KITCHEN`
  - Body: `{ "isAvailable": false }`
- `POST /api/restaurant/:id/menu-items/upload-image`: Multipart image upload to Supabase Storage

### 3.4 Tables & QR Tokens
- `GET /api/restaurant/:id/tables`: Allowed: `OWNER`, `MANAGER`, `KITCHEN`
- `POST /api/restaurant/:id/tables`: Allowed: `OWNER`, `MANAGER`
  - Enforces subscription plan `max_tables` constraint!
- `PATCH /api/restaurant/:id/tables/:tableId`: Allowed: `OWNER`, `MANAGER`
- `DELETE /api/restaurant/:id/tables/:tableId`: Allowed: `OWNER`, `MANAGER` (blocks if active orders exist)
- `POST /api/restaurant/:id/tables/:tableId/regenerate-qr`: Allowed: `OWNER`, `MANAGER`
- `POST /api/restaurant/:id/tables/:tableId/revoke-qr`: Allowed: `OWNER`, `MANAGER`

### 3.5 Orders & Polling Engine
- `GET /api/restaurant/:id/orders`: Allowed: `OWNER`, `MANAGER`, `KITCHEN`
  - Query Parameters:
    - `status`: Filter by `PENDING`, `ACCEPTED`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED`, `REJECTED`
    - `tableId`: Filter by specific table
    - `updatedAfter`: ISO timestamp for delta polling (returns only orders changed after this time)
    - `page`, `limit`: Pagination parameters
- `GET /api/restaurant/:id/orders/:orderId`: Full order breakdown, items, and status event logs
- `PATCH /api/restaurant/:id/orders/:orderId/status`:
  - Body: `{ "status": "PREPARING", "note": "Kitchen started cooking" }`
  - Lifecycle: `PENDING` -> `ACCEPTED` -> `PREPARING` -> `READY` -> `COMPLETED`
  - Kitchen staff permitted only for `PREPARING` and `READY`.
- `PATCH /api/restaurant/:id/orders/:orderId/payment`:
  - Allowed: `OWNER`, `MANAGER`
  - Body: `{ "paymentStatus": "PAID" | "UNPAID" | "REFUNDED" }`

### 3.6 Reports & Analytics
- `GET /api/restaurant/:id/reports/daily?date=YYYY-MM-DD`: Order volume, completed vs rejected counts, revenue in paise, average order value.
- `GET /api/restaurant/:id/reports/top-items?limit=10&startDate=...&endDate=...`: Best selling items by volume and revenue.
- `GET /api/restaurant/:id/reports/range?startDate=...&endDate=...`: Daily aggregated trend breakdown.
