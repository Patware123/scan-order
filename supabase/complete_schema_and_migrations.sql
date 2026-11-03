-- ==============================================================================
-- COMPLETE SCANORDER SAAS DATABASE SCHEMA, MIGRATIONS & SEEDS
-- Copy and run this in Supabase Dashboard -> SQL Editor
-- Project Ref: oofysmxqzrfrhlsckwnn
-- ==============================================================================

-- 1. ENUMS
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'KITCHEN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'PENDING',
    'ACCEPTED',
    'PREPARING',
    'READY',
    'COMPLETED',
    'CANCELLED',
    'REJECTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('UNPAID', 'PAID', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE actor_type AS ENUM ('CUSTOMER', 'STAFF', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. SUBSCRIPTION PLANS
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  max_tables INTEGER NOT NULL DEFAULT 5,
  price_paise INTEGER NOT NULL DEFAULT 0,
  billing_period TEXT NOT NULL DEFAULT 'MONTHLY',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. RESTAURANTS
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  gst_number TEXT,
  fssai_license TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_restaurants_is_active ON restaurants(is_active);

-- 4. RESTAURANT BRANDING
CREATE TABLE IF NOT EXISTS restaurant_branding (
  restaurant_id UUID PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
  logo_url TEXT,
  banner_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#0f172a',
  tagline TEXT,
  support_phone TEXT,
  support_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. RESTAURANT SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS restaurant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL UNIQUE REFERENCES restaurants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status subscription_status NOT NULL DEFAULT 'ACTIVE',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_subs_restaurant ON restaurant_subscriptions(restaurant_id);

-- 6. RESTAURANT USERS (STAFF & ROLES)
CREATE TABLE IF NOT EXISTS restaurant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_users_user ON restaurant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_users_rest_role ON restaurant_users(restaurant_id, role);

-- 7. RESTAURANT INVITATIONS
CREATE TABLE IF NOT EXISTS restaurant_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status invitation_status NOT NULL DEFAULT 'PENDING',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON restaurant_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON restaurant_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_rest_status ON restaurant_invitations(restaurant_id, status);

-- 8. RESTAURANT TABLES
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 4 CHECK (capacity > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, table_number)
);

CREATE INDEX IF NOT EXISTS idx_tables_restaurant ON restaurant_tables(restaurant_id);

-- 9. TABLE QR TOKENS
CREATE TABLE IF NOT EXISTS table_qr_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_tokens_token ON table_qr_tokens(token);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_table ON table_qr_tokens(table_id);

-- 10. MENU CATEGORIES
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_rest_order ON menu_categories(restaurant_id, sort_order);

-- 11. MENU ITEMS
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  price_paise INTEGER NOT NULL CHECK (price_paise >= 0),
  image_url TEXT,
  is_veg BOOLEAN NOT NULL DEFAULT true,
  is_available BOOLEAN NOT NULL DEFAULT true,
  tax_rate_percentage NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (tax_rate_percentage >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_rest_avail ON menu_items(restaurant_id, is_available);

-- 12. MENU ITEM IMAGES
CREATE TABLE IF NOT EXISTS menu_item_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_item_images_item ON menu_item_images(menu_item_id);

-- 13. ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES restaurant_tables(id) ON DELETE RESTRICT,
  order_number TEXT NOT NULL,
  order_status order_status NOT NULL DEFAULT 'PENDING',
  payment_status payment_status NOT NULL DEFAULT 'UNPAID',
  subtotal_paise INTEGER NOT NULL CHECK (subtotal_paise >= 0),
  tax_paise INTEGER NOT NULL CHECK (tax_paise >= 0),
  total_paise INTEGER NOT NULL CHECK (total_paise >= 0),
  guest_tracking_token TEXT NOT NULL UNIQUE,
  special_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders(restaurant_id, order_status);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created ON orders(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_guest_token ON orders(guest_tracking_token);
CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders(restaurant_id, updated_at DESC);

-- 14. ORDER ITEMS (IMMUTABLE PURCHASE SNAPSHOTS)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name_snapshot TEXT NOT NULL,
  unit_price_paise INTEGER NOT NULL CHECK (unit_price_paise >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total_paise INTEGER NOT NULL CHECK (line_total_paise >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item ON order_items(menu_item_id);

-- 15. ORDER IDEMPOTENCY KEYS
CREATE TABLE IF NOT EXISTS order_idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  idempotency_key UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  request_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_lookup ON order_idempotency_keys(restaurant_id, idempotency_key);

-- 16. ORDER STATUS EVENTS (LIFECYCLE AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS order_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  previous_status order_status,
  new_status order_status NOT NULL,
  actor_type actor_type NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_events_order ON order_status_events(order_id, created_at);

-- 17. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_restaurant ON audit_logs(restaurant_id, created_at DESC);

-- 18. HELPER SECURITY FUNCTIONS
CREATE OR REPLACE FUNCTION public.has_restaurant_role(
  p_restaurant_id UUID,
  p_allowed_roles user_role[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurant_users
    WHERE restaurant_id = p_restaurant_id
      AND user_id = auth.uid()
      AND is_active = true
      AND role = ANY(p_allowed_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurant_users
    WHERE user_id = auth.uid()
      AND role = 'SUPER_ADMIN'
      AND is_active = true
  ) OR (auth.jwt() ->> 'role' = 'super_admin');
$$;

-- 19. ENABLE ROW LEVEL SECURITY
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 20. RLS POLICIES
DROP POLICY IF EXISTS "Public can view active subscription plans" ON subscription_plans;
CREATE POLICY "Public can view active subscription plans"
  ON subscription_plans FOR SELECT
  USING (is_active = true OR public.is_super_admin());

DROP POLICY IF EXISTS "Public can view active restaurants" ON restaurants;
CREATE POLICY "Public can view active restaurants"
  ON restaurants FOR SELECT
  USING (is_active = true OR public.has_restaurant_role(id, ARRAY['OWNER', 'MANAGER', 'KITCHEN']::user_role[]) OR public.is_super_admin());

DROP POLICY IF EXISTS "Owners can update their restaurant" ON restaurants;
CREATE POLICY "Owners can update their restaurant"
  ON restaurants FOR UPDATE
  USING (public.has_restaurant_role(id, ARRAY['OWNER']::user_role[]) OR public.is_super_admin());

DROP POLICY IF EXISTS "Public can view restaurant branding" ON restaurant_branding;
CREATE POLICY "Public can view restaurant branding"
  ON restaurant_branding FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Staff can manage restaurant branding" ON restaurant_branding;
CREATE POLICY "Staff can manage restaurant branding"
  ON restaurant_branding FOR ALL
  USING (public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER']::user_role[]) OR public.is_super_admin());

DROP POLICY IF EXISTS "Staff can view restaurant users" ON restaurant_users;
CREATE POLICY "Staff can view restaurant users"
  ON restaurant_users FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER', 'KITCHEN']::user_role[])
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Owners can manage restaurant users" ON restaurant_users;
CREATE POLICY "Owners can manage restaurant users"
  ON restaurant_users FOR ALL
  USING (public.has_restaurant_role(restaurant_id, ARRAY['OWNER']::user_role[]) OR public.is_super_admin());

DROP POLICY IF EXISTS "Owner and Manager can manage invitations" ON restaurant_invitations;
CREATE POLICY "Owner and Manager can manage invitations"
  ON restaurant_invitations FOR ALL
  USING (public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER']::user_role[]) OR public.is_super_admin());

DROP POLICY IF EXISTS "Public can view active tables" ON restaurant_tables;
CREATE POLICY "Public can view active tables"
  ON restaurant_tables FOR SELECT
  USING (is_active = true OR public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER', 'KITCHEN']::user_role[]) OR public.is_super_admin());

DROP POLICY IF EXISTS "Staff can manage tables" ON restaurant_tables;
CREATE POLICY "Staff can manage tables"
  ON restaurant_tables FOR ALL
  USING (public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER']::user_role[]) OR public.is_super_admin());

DROP POLICY IF EXISTS "Public can view valid qr tokens" ON table_qr_tokens;
CREATE POLICY "Public can view valid qr tokens"
  ON table_qr_tokens FOR SELECT
  USING (is_revoked = false OR public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER']::user_role[]) OR public.is_super_admin());

DROP POLICY IF EXISTS "Staff can manage qr tokens" ON table_qr_tokens;
CREATE POLICY "Staff can manage qr tokens"
  ON table_qr_tokens FOR ALL
  USING (public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER']::user_role[]) OR public.is_super_admin());

DROP POLICY IF EXISTS "Public can view active categories" ON menu_categories;
CREATE POLICY "Public can view active categories"
  ON menu_categories FOR SELECT
  USING (is_active = true OR public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER']::user_role[]) OR public.is_super_admin());

DROP POLICY IF EXISTS "Staff can manage categories" ON menu_categories;
CREATE POLICY "Staff can manage categories"
  ON menu_categories FOR ALL
  USING (public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER']::user_role[]) OR public.is_super_admin());

DROP POLICY IF EXISTS "Public can view available menu items" ON menu_items;
CREATE POLICY "Public can view available menu items"
  ON menu_items FOR SELECT
  USING (is_available = true OR public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER', 'KITCHEN']::user_role[]) OR public.is_super_admin());

DROP POLICY IF EXISTS "Staff can manage menu items" ON menu_items;
CREATE POLICY "Staff can manage menu items"
  ON menu_items FOR ALL
  USING (public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER']::user_role[]) OR public.is_super_admin());

DROP POLICY IF EXISTS "Staff can view restaurant orders" ON orders;
CREATE POLICY "Staff can view restaurant orders"
  ON orders FOR SELECT
  USING (
    public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER', 'KITCHEN']::user_role[])
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Staff can update restaurant orders" ON orders;
CREATE POLICY "Staff can update restaurant orders"
  ON orders FOR UPDATE
  USING (
    public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER', 'KITCHEN']::user_role[])
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Staff can view restaurant order items" ON order_items;
CREATE POLICY "Staff can view restaurant order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND (
          public.has_restaurant_role(orders.restaurant_id, ARRAY['OWNER', 'MANAGER', 'KITCHEN']::user_role[])
          OR public.is_super_admin()
        )
    )
  );

DROP POLICY IF EXISTS "Staff can view status events" ON order_status_events;
CREATE POLICY "Staff can view status events"
  ON order_status_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_status_events.order_id
        AND (
          public.has_restaurant_role(orders.restaurant_id, ARRAY['OWNER', 'MANAGER', 'KITCHEN']::user_role[])
          OR public.is_super_admin()
        )
    )
  );

DROP POLICY IF EXISTS "Owners can view audit logs" ON audit_logs;
CREATE POLICY "Owners can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    public.has_restaurant_role(restaurant_id, ARRAY['OWNER']::user_role[])
    OR public.is_super_admin()
  );

-- 21. ATOMIC ORDER CREATION STORED PROCEDURE
CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_restaurant_id UUID,
  p_table_id UUID,
  p_idempotency_key UUID,
  p_request_hash TEXT,
  p_guest_tracking_token TEXT,
  p_items JSONB,
  p_special_instructions TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_idempotency RECORD;
  v_existing_order RECORD;
  v_existing_items JSONB;
  v_order_id UUID;
  v_order_number TEXT;
  v_item JSONB;
  v_menu_item RECORD;
  v_unit_price INTEGER;
  v_quantity INTEGER;
  v_line_total INTEGER;
  v_tax_rate NUMERIC;
  v_subtotal_paise INTEGER := 0;
  v_tax_paise INTEGER := 0;
  v_total_paise INTEGER := 0;
  v_order_record RECORD;
  v_created_items JSONB := '[]'::jsonb;
  v_today_date TEXT;
  v_seq_num INTEGER;
BEGIN
  -- A. CHECK IDEMPOTENCY KEY
  SELECT * INTO v_existing_idempotency
  FROM public.order_idempotency_keys
  WHERE restaurant_id = p_restaurant_id
    AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    SELECT * INTO v_existing_order
    FROM public.orders
    WHERE id = v_existing_idempotency.order_id;

    SELECT jsonb_agg(
      jsonb_build_object(
        'id', oi.id,
        'menu_item_id', oi.menu_item_id,
        'item_name_snapshot', oi.item_name_snapshot,
        'unit_price_paise', oi.unit_price_paise,
        'quantity', oi.quantity,
        'line_total_paise', oi.line_total_paise
      )
    ) INTO v_existing_items
    FROM public.order_items oi
    WHERE oi.order_id = v_existing_order.id;

    RETURN jsonb_build_object(
      'is_duplicate', true,
      'order', to_jsonb(v_existing_order),
      'items', COALESCE(v_existing_items, '[]'::jsonb)
    );
  END IF;

  -- B. VERIFY TABLE IS ACTIVE AND BELONGS TO RESTAURANT
  IF NOT EXISTS (
    SELECT 1 FROM public.restaurant_tables
    WHERE id = p_table_id
      AND restaurant_id = p_restaurant_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Table is inactive or does not belong to this restaurant' USING ERRCODE = 'P0002';
  END IF;

  -- C. GENERATE HUMAN-READABLE ORDER NUMBER
  v_today_date := to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO v_seq_num
  FROM public.orders
  WHERE restaurant_id = p_restaurant_id
    AND created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata');

  v_order_number := 'ORD-' || v_today_date || '-' || lpad(v_seq_num::text, 4, '0');

  -- D. VALIDATE ALL ITEMS AND CALCULATE TOTALS IN PAISE
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_quantity := (v_item->>'quantity')::INTEGER;
    IF v_quantity <= 0 OR v_quantity > 50 THEN
      RAISE EXCEPTION 'Invalid item quantity: %', v_quantity USING ERRCODE = '22003';
    END IF;

    SELECT id, name, price_paise, tax_rate_percentage, is_available
    INTO v_menu_item
    FROM public.menu_items
    WHERE id = (v_item->>'menu_item_id')::UUID
      AND restaurant_id = p_restaurant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Menu item not found or does not belong to restaurant: %', v_item->>'menu_item_id' USING ERRCODE = 'P0002';
    END IF;

    IF NOT v_menu_item.is_available THEN
      RAISE EXCEPTION 'Menu item is currently unavailable: %', v_menu_item.name USING ERRCODE = 'P0001';
    END IF;

    v_unit_price := v_menu_item.price_paise;
    v_line_total := v_unit_price * v_quantity;
    v_tax_rate := v_menu_item.tax_rate_percentage;

    v_subtotal_paise := v_subtotal_paise + v_line_total;
    v_tax_paise := v_tax_paise + round((v_line_total::NUMERIC * v_tax_rate) / 100.0)::INTEGER;
  END LOOP;

  v_total_paise := v_subtotal_paise + v_tax_paise;

  -- E. INSERT ORDER RECORD
  v_order_id := gen_random_uuid();

  INSERT INTO public.orders (
    id,
    restaurant_id,
    table_id,
    order_number,
    order_status,
    payment_status,
    subtotal_paise,
    tax_paise,
    total_paise,
    guest_tracking_token,
    special_instructions
  ) VALUES (
    v_order_id,
    p_restaurant_id,
    p_table_id,
    v_order_number,
    'PENDING',
    'UNPAID',
    v_subtotal_paise,
    v_tax_paise,
    v_total_paise,
    p_guest_tracking_token,
    p_special_instructions
  )
  RETURNING * INTO v_order_record;

  -- F. INSERT IMMUTABLE ORDER ITEM SNAPSHOTS
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_quantity := (v_item->>'quantity')::INTEGER;

    SELECT name, price_paise
    INTO v_menu_item
    FROM public.menu_items
    WHERE id = (v_item->>'menu_item_id')::UUID;

    v_unit_price := v_menu_item.price_paise;
    v_line_total := v_unit_price * v_quantity;

    INSERT INTO public.order_items (
      order_id,
      menu_item_id,
      item_name_snapshot,
      unit_price_paise,
      quantity,
      line_total_paise
    ) VALUES (
      v_order_id,
      (v_item->>'menu_item_id')::UUID,
      v_menu_item.name,
      v_unit_price,
      v_quantity,
      v_line_total
    );

    v_created_items := v_created_items || jsonb_build_object(
      'menu_item_id', v_item->>'menu_item_id',
      'item_name_snapshot', v_menu_item.name,
      'unit_price_paise', v_unit_price,
      'quantity', v_quantity,
      'line_total_paise', v_line_total
    );
  END LOOP;

  -- G. INSERT INITIAL STATUS EVENT
  INSERT INTO public.order_status_events (
    order_id,
    previous_status,
    new_status,
    actor_type,
    note
  ) VALUES (
    v_order_id,
    NULL,
    'PENDING',
    'CUSTOMER',
    'Order placed via QR code'
  );

  -- H. RECORD IDEMPOTENCY KEY
  INSERT INTO public.order_idempotency_keys (
    restaurant_id,
    idempotency_key,
    order_id,
    request_hash
  ) VALUES (
    p_restaurant_id,
    p_idempotency_key,
    v_order_id,
    p_request_hash
  );

  -- I. RETURN STRUCTURED RESULT
  RETURN jsonb_build_object(
    'is_duplicate', false,
    'order', to_jsonb(v_order_record),
    'items', v_created_items
  );
END;
$$;

-- 22. SEED SUBSCRIPTION PLANS
INSERT INTO public.subscription_plans (name, code, description, max_tables, price_paise, billing_period, features, is_active)
VALUES
  (
    'Starter / Free',
    'FREE',
    'Ideal for small cafes and quick test setups',
    5,
    0,
    'MONTHLY',
    '["Up to 5 tables", "Standard digital QR menu", "Kitchen display view", "Basic daily analytics"]'::jsonb,
    true
  ),
  (
    'Pro Growth',
    'PRO',
    'Designed for busy restaurants and casual dining',
    25,
    149900,
    'MONTHLY',
    '["Up to 25 tables", "Custom branding & logo", "Full KDS workflow", "Manager shift reports", "Priority support"]'::jsonb,
    true
  ),
  (
    'Enterprise Unlimited',
    'ENTERPRISE',
    'For hotel chains, food courts and high-volume dining',
    100,
    399900,
    'MONTHLY',
    '["Up to 100 tables", "Multi-brand support", "Custom domain & branding", "Advanced sales analytics", "Dedicated account manager"]'::jsonb,
    true
  )
ON CONFLICT (code) DO UPDATE
SET
  max_tables = EXCLUDED.max_tables,
  price_paise = EXCLUDED.price_paise,
  features = EXCLUDED.features,
  updated_at = now();

-- 23. GRANT PRIVILEGES TO POSTGREST ROLES
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

