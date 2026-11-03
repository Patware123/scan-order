import { apiRequest } from "./client";

export interface AdminRestaurant {
  id: string;
  name: string;
  slug: string;
  phone?: string;
  email?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  tableLimit?: number;
  restaurant_branding?: {
    logo_url?: string | null;
    tagline?: string | null;
    support_email?: string | null;
    support_phone?: string | null;
    primary_color?: string;
  };
  restaurant_subscriptions?: Array<{
    status: string;
    current_period_start: string;
    current_period_end: string;
    subscription_plans?: {
      name: string;
      code: string;
      price_paise: number;
      billing_period: string;
      max_tables: number;
    } | null;
  }>;
}

export interface OnboardRestaurantPayload {
  name: string;
  slug: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  logoUrl?: string;
  planCode: "MONTHLY" | "SIX_MONTH" | "ANNUAL" | "FREE" | "PRO" | "ENTERPRISE";
  maxTables: number;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  ownerPassword: string;
}

export interface OnboardingConfirmation {
  id: string;
  name: string;
  slug: string;
  tableLimit: number;
  subscription: {
    planId: string;
    planName: string;
    planCode: string;
    pricePaise: number;
    startDate: string;
    expiryDate: string;
    status: string;
  } | null;
  owner: {
    id: string;
    email: string;
    fullName: string;
    phone?: string | null;
  } | null;
  loginUrl: string;
}

export const adminApi = {
  getRestaurants: () =>
    apiRequest<AdminRestaurant[]>("/api/admin/restaurants"),

  getRestaurantById: (id: string) =>
    apiRequest<AdminRestaurant>(`/api/admin/restaurants/${id}`),

  updateRestaurantDetails: (
    id: string,
    payload: {
      name?: string;
      slug?: string;
      currency?: string;
      contactEmail?: string;
      contactPhone?: string;
      address?: string;
      logoUrl?: string;
      isActive?: boolean;
    }
  ) =>
    apiRequest<AdminRestaurant>(`/api/admin/restaurants/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  createRestaurant: (payload: {
    name: string;
    slug: string;
    email: string;
    phone?: string;
    plan_code?: string;
  }) =>
    apiRequest<AdminRestaurant>("/api/admin/restaurants", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  onboardRestaurant: (payload: OnboardRestaurantPayload) =>
    apiRequest<OnboardingConfirmation>("/api/admin/restaurants", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateRestaurantStatus: (id: string, is_active: boolean) =>
    apiRequest<AdminRestaurant>(`/api/admin/restaurants/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active }),
    }),

  updateTableLimit: (id: string, maxTables: number) =>
    apiRequest<{ restaurantId: string; maxTables: number }>(
      `/api/admin/restaurants/${id}/table-limit`,
      {
        method: "PATCH",
        body: JSON.stringify({ maxTables }),
      }
    ),

  updateSubscription: (id: string, payload: { planCode: string; extendMonths?: number }) =>
    apiRequest(`/api/admin/restaurants/${id}/subscription`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  getPlans: () =>
    apiRequest<Array<{
      id: string;
      code: string;
      name: string;
      max_tables: number;
      price_paise: number;
      billing_period: string;
      features: string[];
    }>>("/api/admin/plans"),
};
