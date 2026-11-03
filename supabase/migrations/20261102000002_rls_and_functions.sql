-- ==============================================================================
-- 20261102000002_rls_and_functions.sql
-- Row Level Security (RLS) Policies and Atomic Ordering Engine
-- ==============================================================================

-- 1. SECURITY HELPER FUNCTIONS
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

-- 2. ENABLE ROW LEVEL SECURITY
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

-- 3. RLS POLICIES

-- subscription_plans: Anyone can view active plans; only Super Admin can modify
DROP POLICY IF EXISTS "Public can view active subscription plans" ON subscription_plans;
CREATE POLICY "Public can view active subscription plans"
  ON subscription_plans FOR SELECT
  USING (is_active = true OR public.is_super_admin());

-- restaurants: Anyone can read active restaurant info; staff can view their own; super admin full access
DROP POLICY IF EXISTS "Public can view active restaurants" ON restaurants;
CREATE POLICY "Public can view active restaurants"
  ON restaurants FOR SELECT
  USING (is_active = true OR public.has_restaurant_role(id, ARRAY['OWNER', 'MANAGER', 'KITCHEN']::user_role[]) OR public.is_super_admin());

DROP POLICY IF EXISTS "Owners can update their restaurant" ON restaurants;
CREATE POLICY "Owners can update their restaurant"
  ON restaurants FOR UPDATE
  USING (public.has_restaurant_role(id, ARRAY['OWNER']::user_role[]) OR public.is_super_admin());

-- restaurant_branding: Public can view branding; Owner/Manager can modify
DROP POLICY IF EXISTS "Public can view restaurant branding" ON restaurant_branding;
CREATE POLICY "Public can view restaurant branding"
  ON restaurant_branding FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Staff can manage restaurant branding" ON restaurant_branding;
CREATE POLICY "Staff can manage restaurant branding"
  ON restaurant_branding FOR ALL
  USING (public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER']::user_role[]) OR public.is_super_admin());

-- restaurant_users: Staff can view their team; Owner can manage team
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

-- restaurant_invitations
DROP POLICY IF EXISTS "Owner and Manager can manage invitations" ON restaurant_invitations;
CREATE POLICY "Owner and Manager can manage invitations"
  ON restaurant_invitations FOR ALL
  USING (public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER']::user_role[]) OR public.is_super_admin());

-- restaurant_tables: Public can view active tables; Staff can manage
DROP POLICY IF EXISTS "Public can view active tables" ON restaurant_tables;
CREATE POLICY "Public can view active tables"
  ON restaurant_tables FOR SELECT
  USING (is_active = true OR public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER', 'KITCHEN']::user_role[]) OR public.is_super_admin());

DROP POLICY IF EXISTS "Staff can manage tables" ON restaurant_tables;
CREATE POLICY "Staff can manage tables"
  ON restaurant_tables FOR ALL
  USING (public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER']::user_role[]) OR public.is_super_admin());

-- table_qr_tokens: Public can view non-revoked; Staff can manage
DROP POLICY IF EXISTS "Public can view valid qr tokens" ON table_qr_tokens;
CREATE POLICY "Public can view valid qr tokens"
  ON table_qr_tokens FOR SELECT
  USING (is_revoked = false OR public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER']::user_role[]) OR public.is_super_admin());

DROP POLICY IF EXISTS "Staff can manage qr tokens" ON table_qr_tokens;
CREATE POLICY "Staff can manage qr tokens"
  ON table_qr_tokens FOR ALL
  USING (public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER']::user_role[]) OR public.is_super_admin());

-- menu_categories: Public can view active; Staff can manage
DROP POLICY IF EXISTS "Public can view active categories" ON menu_categories;
CREATE POLICY "Public can view active categories"
  ON menu_categories FOR SELECT
  USING (is_active = true OR public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER']::user_role[]) OR public.is_super_admin());

DROP POLICY IF EXISTS "Staff can manage categories" ON menu_categories;
CREATE POLICY "Staff can manage categories"
  ON menu_categories FOR ALL
  USING (public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER']::user_role[]) OR public.is_super_admin());

-- menu_items: Public can view active; Staff can manage
DROP POLICY IF EXISTS "Public can view available menu items" ON menu_items;
CREATE POLICY "Public can view available menu items"
  ON menu_items FOR SELECT
  USING (is_available = true OR public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER', 'KITCHEN']::user_role[]) OR public.is_super_admin());

DROP POLICY IF EXISTS "Staff can manage menu items" ON menu_items;
CREATE POLICY "Staff can manage menu items"
  ON menu_items FOR ALL
  USING (public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER']::user_role[]) OR public.is_super_admin());

-- orders: Staff can read and update; Public can create via atomic RPC and read via guest token
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

-- order_items
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

-- order_status_events
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

-- audit_logs: Owners and Super Admin only
DROP POLICY IF EXISTS "Owners can view audit logs" ON audit_logs;
CREATE POLICY "Owners can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    public.has_restaurant_role(restaurant_id, ARRAY['OWNER']::user_role[])
    OR public.is_super_admin()
  );

-- 4. ATOMIC ORDER CREATION STORED PROCEDURE
-- Ensures ACID transactional safety, idempotency uniqueness, server-side pricing in paise,
-- immutable snapshots, and status history creation.
CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_restaurant_id UUID,
  p_table_id UUID,
  p_idempotency_key UUID,
  p_request_hash TEXT,
  p_guest_tracking_token TEXT,
  p_items JSONB, -- Array of { "menu_item_id": UUID, "quantity": INT }
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
  -- A. CHECK IDEMPOTENCY KEY FIRST
  SELECT * INTO v_existing_idempotency
  FROM public.order_idempotency_keys
  WHERE restaurant_id = p_restaurant_id
    AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    -- Return existing order seamlessly without error
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

  -- D. VALIDATE ALL ITEMS AND CALCULATE TOTALS IN PAISE (SERVER-SIDE CALCULATION)
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

  -- G. INSERT INITIAL STATUS EVENT (LIFECYCLE AUDIT TRAIL)
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
