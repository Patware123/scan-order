-- ==============================================================================
-- 20261102000003_seed_plans.sql
-- Seed Default SaaS Subscription Plans
-- ==============================================================================

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
    149900, -- ₹1,499.00
    'MONTHLY',
    '["Up to 25 tables", "Custom branding & logo", "Full KDS workflow", "Manager shift reports", "Priority support"]'::jsonb,
    true
  ),
  (
    'Enterprise Unlimited',
    'ENTERPRISE',
    'For hotel chains, food courts and high-volume dining',
    100,
    399900, -- ₹3,999.00
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
