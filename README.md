# ScanOrder — Multi-Tenant QR Restaurant Ordering SaaS

A production-ready, white-label QR digital menu and ordering platform for restaurants, cafes, and hotels in India.

---

## 1. Technology Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS v4
- **Database & Auth**: Supabase PostgreSQL, Supabase Auth, Supabase Storage
- **Data Fetching & State**: TanStack React Query v5
- **Validation**: Zod
- **Architecture**: Domain-Driven Feature Modules with Strict Tenant Isolation

---

## 2. Directory Structure

```
scan-order-system/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # Backend API routes
│   │   │   └── health/         # System healthcheck endpoint
│   │   ├── layout.tsx          # Root layout with QueryProvider
│   │   ├── page.tsx            # Verification status page
│   │   └── globals.css         # Tailwind styles & theme variables
│   ├── components/             # Reusable UI components
│   │   ├── providers/          # React Query & Context providers
│   │   └── ui/                 # Atomic UI primitives (Button, Badge, etc.)
│   ├── config/                 # Configuration constants & validated environment
│   │   ├── env.ts              # Zod-validated environment schema
│   │   └── site.ts             # App config, roles, currency, and lifecycle rules
│   ├── features/               # Domain-Driven feature modules
│   │   ├── auth/               # User authentication & RBAC
│   │   ├── menu/               # Categories, items, and pricing
│   │   ├── orders/             # Order processing & snapshots
│   │   ├── restaurants/        # Tenancy & branding
│   │   └── tables/             # QR tokens & table management
│   ├── hooks/                  # Custom React hooks (e.g. usePolling)
│   │   └── use-polling.ts      # Non-overlapping polling with tab visibility handling
│   ├── lib/                    # Shared libraries & infrastructure
│   │   ├── supabase/           # Client, Server, and Admin Supabase connectors
│   │   │   ├── client.ts       # Browser client for client components
│   │   │   ├── server.ts       # Server client with App Router cookies
│   │   │   ├── admin.ts        # Service role client (server-side only)
│   │   │   └── middleware.ts   # Session update helper
│   │   ├── utils/              # Utilities (currency, errors, response formatting)
│   │   │   ├── currency.ts     # Integer paise calculation & INR formatting
│   │   │   ├── errors.ts       # AppError hierarchy & API error handling
│   │   │   ├── api-response.ts # Standardized API success response builder
│   │   │   └── cn.ts           # Classnames & Tailwind merge utility
│   │   └── validations/        # Zod validation schemas
│   │       ├── order.schema.ts # Order submission schemas
│   │       └── menu.schema.ts  # Category and menu schemas
│   ├── proxy.ts                # Next.js request proxy / middleware convention
│   ├── services/               # Core backend services layer
│   └── types/                  # Shared TypeScript interfaces & DB types
│       ├── database.types.ts   # PostgreSQL schema & table row types
│       ├── order.types.ts      # Order domain & state machine types
│       ├── restaurant.types.ts # Restaurant & tenant types
│       └── api.types.ts        # Standardized API response contracts
├── supabase/
│   └── migrations/             # SQL migration files
├── .env.example                # Template for required environment variables
├── .env.local                  # Local development environment file
└── package.json
```

---

## 3. Environment Variables

Copy `.env.example` to `.env.local` to configure your environment:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Application Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

---

## 4. Local Development

### Prerequisites
- Node.js `v20+` (tested with v24)
- npm `v10+`

### Installation & Run

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. **Verify type-checking & linting**:
   ```bash
   npm run lint
   ```

4. **Verify production build**:
   ```bash
   npm run build
   ```

---

## 5. Architectural Guardrails (Core Rules)

1. **Paise Monetary Precision**:
   - All amounts are computed and stored as integer paise (1 Rupee = 100 Paise).
   - Zero floating-point math in financial pipelines.
   - Format with `formatPaiseToINR(paise)` for display only.

2. **Strict Multi-Tenancy**:
   - `restaurant_id` is validated server-side.
   - Never trust tenant IDs supplied by client browsers.

3. **Idempotent Ordering**:
   - Client sends UUID `idempotencyKey` per checkout session.
   - Database enforces `UNIQUE(restaurant_id, idempotency_key)`.

4. **Smart Polling**:
   - Uses `usePolling` hook that pauses/reduces intervals when browser tabs are inactive or hidden.
