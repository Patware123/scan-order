export const SITE_CONFIG = {
  name: "ScanOrder",
  description: "Production-ready Multi-Tenant QR Restaurant Ordering SaaS",
  currency: {
    code: "INR",
    symbol: "₹",
    subunit: "paise",
    subunitsPerUnit: 100,
  },
  roles: {
    SUPER_ADMIN: "SUPER_ADMIN",
    RESTAURANT_OWNER: "OWNER",
    RESTAURANT_MANAGER: "MANAGER",
    KITCHEN_STAFF: "KITCHEN",
    CUSTOMER: "CUSTOMER",
  } as const,
  orderStatus: {
    PENDING: "PENDING",
    ACCEPTED: "ACCEPTED",
    PREPARING: "PREPARING",
    READY: "READY",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
    REJECTED: "REJECTED",
  } as const,
  paymentStatus: {
    UNPAID: "UNPAID",
    PAID: "PAID",
    REFUNDED: "REFUNDED",
  } as const,
  polling: {
    kitchenIntervalMs: 5000,
    managerIntervalMs: 10000,
    customerIntervalMs: 8000,
    inactiveIntervalMs: 60000,
  },
} as const;

export type SiteConfig = typeof SITE_CONFIG;
