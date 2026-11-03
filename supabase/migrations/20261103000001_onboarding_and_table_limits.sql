-- =========================================================================
-- MIGRATION: 20261103000001_onboarding_and_table_limits.sql
-- Onboarding Enhancements, Custom Table Limits & 3 Standard Subscription Plans
-- =========================================================================

-- 1. ADD COLUMNS TO RESTAURANTS FOR CUSTOM TABLE LIMITS AND CONTACT INFO
ALTER TABLE public.restaurants 
  ADD COLUMN IF NOT EXISTS max_tables INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. SEED THE 3 PREDEFINED SUBSCRIPTION PLANS
INSERT INTO public.subscription_plans (
  name,
  code,
  description,
  max_tables,
  price_paise,
  billing_period,
  features,
  is_active
) VALUES 
(
  'Monthly Plan',
  'MONTHLY',
  'Standard monthly subscription with full QR ordering and KDS features',
  10,
  150000, -- ₹1,500.00
  'MONTHLY',
  '["1 Month Validity", "Digital QR Ordering", "Kitchen KDS Ticket Display", "Manager Active Order Dashboard", "Custom Table Limits", "Daily Revenue Reports"]'::jsonb,
  true
),
(
  '6-Month Plan',
  'SIX_MONTH',
  'Half-yearly subscription with extended savings and priority support',
  25,
  600000, -- ₹6,000.00
  'HALF_YEARLY',
  '["6 Months Validity", "Digital QR Ordering", "Kitchen KDS Ticket Display", "Manager Active Order Dashboard", "Custom Table Limits", "Daily Revenue Reports", "Priority Support"]'::jsonb,
  true
),
(
  'Annual Plan',
  'ANNUAL',
  'Full year enterprise-grade restaurant dining SaaS suite',
  50,
  1000000, -- ₹10,000.00
  'ANNUAL',
  '["12 Months Validity", "Digital QR Ordering", "Kitchen KDS Ticket Display", "Manager Active Order Dashboard", "Custom Table Limits", "Advanced Reporting & Analytics", "24/7 Dedicated Support"]'::jsonb,
  true
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_paise = EXCLUDED.price_paise,
  billing_period = EXCLUDED.billing_period,
  features = EXCLUDED.features,
  is_active = true,
  updated_at = now();
