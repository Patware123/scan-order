/**
 * Global configuration constants.
 */

export const SUPER_ADMIN_EMAILS = [
  "superadmin@scanorder.com",
  "admin@scanorder.com",
  (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "").toLowerCase(),
].filter(Boolean);

export const DEFAULT_CURRENCY = {
  code: "INR",
  symbol: "₹",
  subunit: "paise",
  subunitsPerUnit: 100,
};

export const POLLING_INTERVALS = {
  KITCHEN_ACTIVE_MS: 5000,
  MANAGER_ACTIVE_MS: 6000,
  CUSTOMER_TRACKING_MS: 6000,
  BACKGROUND_THROTTLED_MS: 60000,
};
