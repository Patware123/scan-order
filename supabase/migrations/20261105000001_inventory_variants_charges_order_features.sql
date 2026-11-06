-- ==============================================================================
-- 20261105000001_inventory_variants_charges_order_features.sql
-- Enterprise QR SaaS: Inventory, Variants, Charges, Table Security & Multi-Role Orders
-- ==============================================================================

-- 1. MENU ITEM VARIANTS
CREATE TABLE IF NOT EXISTS public.menu_item_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_paise INTEGER NOT NULL CHECK (price_paise >= 0),
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_variants_item ON public.menu_item_variants(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_variants_restaurant ON public.menu_item_variants(restaurant_id);

-- 2. INVENTORY ITEMS
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  current_stock NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  unit TEXT NOT NULL DEFAULT 'pcs', -- 'kg', 'g', 'l', 'ml', 'pcs', 'portion'
  low_stock_threshold NUMERIC(12,3) NOT NULL DEFAULT 5,
  purchase_price_paise INTEGER NOT NULL DEFAULT 0 CHECK (purchase_price_paise >= 0),
  supplier_name TEXT,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_restaurant ON public.inventory_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON public.inventory_items(restaurant_id, sku);

-- 3. INVENTORY STOCK MOVEMENTS (AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('PURCHASE', 'USAGE', 'WASTAGE', 'DAMAGED', 'ADJUSTMENT')),
  quantity NUMERIC(12,3) NOT NULL,
  stock_before NUMERIC(12,3) NOT NULL,
  stock_after NUMERIC(12,3) NOT NULL,
  reason TEXT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON public.inventory_movements(inventory_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_restaurant ON public.inventory_movements(restaurant_id, created_at DESC);

-- 4. MENU ITEM RECIPE / INGREDIENT MAPPING
CREATE TABLE IF NOT EXISTS public.menu_item_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.menu_item_variants(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  quantity_required NUMERIC(12,3) NOT NULL CHECK (quantity_required > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingredients_item ON public.menu_item_ingredients(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_variant ON public.menu_item_ingredients(variant_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_inventory ON public.menu_item_ingredients(inventory_item_id);

-- 5. OWNER-CONFIGURABLE TAXES AND ADDITIONAL CHARGES
CREATE TABLE IF NOT EXISTS public.restaurant_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  charge_type TEXT NOT NULL CHECK (charge_type IN ('PERCENTAGE', 'FIXED')),
  rate_or_amount NUMERIC(10,2) NOT NULL CHECK (rate_or_amount >= 0),
  applies_to TEXT NOT NULL DEFAULT 'ALL' CHECK (applies_to IN ('ALL', 'DINE_IN', 'PARCEL')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_charges ON public.restaurant_charges(restaurant_id, is_active);

-- 6. EXTEND RESTAURANT TABLES WITH SCANNER ACTIVATION & TABLE LOCK CONTROLS
ALTER TABLE public.restaurant_tables
  ADD COLUMN IF NOT EXISTS is_scanner_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tables_lock_status ON public.restaurant_tables(restaurant_id, is_locked);

-- 7. EXTEND ORDERS TABLE FOR MULTI-ORDER-TYPE, AUDIT, ARCHIVE & CHARGES
ALTER TABLE public.orders
  ALTER COLUMN table_id DROP NOT NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'DINE_IN',
  ADD COLUMN IF NOT EXISTS order_source TEXT NOT NULL DEFAULT 'CUSTOMER',
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS charges_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS additional_charges_paise INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inventory_deducted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_type_source ON public.orders(restaurant_id, order_type, order_source);
CREATE INDEX IF NOT EXISTS idx_orders_is_archived ON public.orders(restaurant_id, is_archived);

-- 8. EXTEND ORDER ITEMS TABLE FOR VARIANTS
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.menu_item_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_name_snapshot TEXT;

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.menu_item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_charges ENABLE ROW LEVEL SECURITY;

-- menu_item_variants: Public can read available; Staff can manage
DROP POLICY IF EXISTS "Public can view variants" ON public.menu_item_variants;
CREATE POLICY "Public can view variants"
  ON public.menu_item_variants FOR SELECT
  USING (is_available = true OR public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER', 'KITCHEN']::user_role[]) OR public.is_super_admin());

DROP POLICY IF EXISTS "Staff can manage variants" ON public.menu_item_variants;
CREATE POLICY "Staff can manage variants"
  ON public.menu_item_variants FOR ALL
  USING (public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER']::user_role[]) OR public.is_super_admin());

-- inventory_items: Staff can view; Owner & Manager can manage
DROP POLICY IF EXISTS "Staff can view inventory" ON public.inventory_items;
CREATE POLICY "Staff can view inventory"
  ON public.inventory_items FOR SELECT
  USING (public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER', 'KITCHEN']::user_role[]) OR public.is_super_admin());

DROP POLICY IF EXISTS "Owner and Manager can manage inventory" ON public.inventory_items;
CREATE POLICY "Owner and Manager can manage inventory"
  ON public.inventory_items FOR ALL
  USING (public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER']::user_role[]) OR public.is_super_admin());

-- inventory_movements: Staff can view history; Owner & Manager can insert/manage
DROP POLICY IF EXISTS "Staff can view movements" ON public.inventory_movements;
CREATE POLICY "Staff can view movements"
  ON public.inventory_movements FOR SELECT
  USING (public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER', 'KITCHEN']::user_role[]) OR public.is_super_admin());

DROP POLICY IF EXISTS "Owner and Manager can insert movements" ON public.inventory_movements;
CREATE POLICY "Owner and Manager can insert movements"
  ON public.inventory_movements FOR ALL
  USING (public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER']::user_role[]) OR public.is_super_admin());

-- menu_item_ingredients: Staff can view; Owner & Manager can manage
DROP POLICY IF EXISTS "Staff can view ingredients" ON public.menu_item_ingredients;
CREATE POLICY "Staff can view ingredients"
  ON public.menu_item_ingredients FOR SELECT
  USING (public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER', 'KITCHEN']::user_role[]) OR public.is_super_admin());

DROP POLICY IF EXISTS "Owner and Manager can manage ingredients" ON public.menu_item_ingredients;
CREATE POLICY "Owner and Manager can manage ingredients"
  ON public.menu_item_ingredients FOR ALL
  USING (public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER']::user_role[]) OR public.is_super_admin());

-- restaurant_charges: Public can view active charges; Staff can manage
DROP POLICY IF EXISTS "Public can view active charges" ON public.restaurant_charges;
CREATE POLICY "Public can view active charges"
  ON public.restaurant_charges FOR SELECT
  USING (is_active = true OR public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER']::user_role[]) OR public.is_super_admin());

DROP POLICY IF EXISTS "Owner and Manager can manage charges" ON public.restaurant_charges;
CREATE POLICY "Owner and Manager can manage charges"
  ON public.restaurant_charges FOR ALL
  USING (public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER']::user_role[]) OR public.is_super_admin());

