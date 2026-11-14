-- ==============================================================================
-- 20261113000001_payment_config_and_billing.sql
-- Enterprise QR SaaS: Multi-Payment Config (Counter, Razorpay, UPI),
-- Pay First vs Pay Later Policy, and Bill Printing / POS Receipt support
-- ==============================================================================

-- 1. RESTAURANT PAYMENT CONFIGURATIONS
CREATE TABLE IF NOT EXISTS public.restaurant_payment_configs (
  restaurant_id UUID PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  accept_counter BOOLEAN NOT NULL DEFAULT true,
  accept_razorpay BOOLEAN NOT NULL DEFAULT false,
  accept_upi BOOLEAN NOT NULL DEFAULT false,
  pay_policy TEXT NOT NULL DEFAULT 'PAY_LATER' CHECK (pay_policy IN ('PAY_FIRST', 'PAY_LATER')),
  razorpay_key_id TEXT,
  razorpay_key_secret TEXT,
  upi_id TEXT,
  upi_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_configs_policy 
  ON public.restaurant_payment_configs(restaurant_id, pay_policy);

-- 2. EXTEND ORDERS TABLE WITH PAYMENT MODE & AUDIT
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'COUNTER',
  ADD COLUMN IF NOT EXISTS payment_details JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_orders_payment_mode 
  ON public.orders(restaurant_id, payment_mode);

-- 3. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.restaurant_payment_configs ENABLE ROW LEVEL SECURITY;

-- Public can view active flags and public payment IDs (keys/secrets are omitted in public API)
DROP POLICY IF EXISTS "Public can view public payment flags" ON public.restaurant_payment_configs;
CREATE POLICY "Public can view public payment flags"
  ON public.restaurant_payment_configs FOR SELECT
  USING (true);

-- Restaurant Owners & Managers and Super Admins can manage payment configuration
DROP POLICY IF EXISTS "Staff and Admin can manage payment configs" ON public.restaurant_payment_configs;
CREATE POLICY "Staff and Admin can manage payment configs"
  ON public.restaurant_payment_configs FOR ALL
  USING (
    public.has_restaurant_role(restaurant_id, ARRAY['OWNER', 'MANAGER']::user_role[]) 
    OR public.is_super_admin()
  );

