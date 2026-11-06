import { apiRequest } from "./client";
import { CreateOrderInput } from "@/lib/validations/order.schema";

export interface PublicMenuCategory {
  id: string;
  name: string;
  description?: string;
  display_order?: number;
  sort_order?: number;
}

export interface MenuItemVariantOption {
  id: string;
  menu_item_id: string;
  name: string;
  price_paise: number;
  is_available: boolean;
  sort_order?: number;
}

export interface RestaurantChargeOption {
  id: string;
  name: string;
  charge_type: "PERCENTAGE" | "FIXED";
  rate_or_amount: number;
  applies_to: "ALL" | "DINE_IN" | "PARCEL";
  is_active: boolean;
  sort_order?: number;
}

export interface PublicMenuItem {
  id: string;
  name: string;
  description?: string;
  price_paise: number;
  category_id: string;
  is_veg?: boolean;
  dietary_type?: "VEG" | "NON_VEG" | "VEGAN" | "EGG";
  image_url?: string;
  is_available: boolean;
  spice_level?: number;
  preparation_time_minutes?: number;
  variants?: MenuItemVariantOption[];
}

export interface PublicMenuResponse {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    currency: string;
    logo_url?: string;
    banner_url?: string;
    primary_color?: string;
    secondary_color?: string;
    phone?: string;
    ordering_mode?: "SELF_SERVICE" | "STAFF_SERVED";
    branding?: {
      logo_url?: string;
      banner_url?: string;
      primary_color?: string;
      secondary_color?: string;
      ordering_mode?: "SELF_SERVICE" | "STAFF_SERVED";
    };
  };
  table: {
    id: string;
    tableNumber?: string;
    label?: string;
    capacity?: number;
    ordering_mode?: "SELF_SERVICE" | "STAFF_SERVED";
    isScannerActive?: boolean;
    isLocked?: boolean;
  };
  categories: PublicMenuCategory[];
  items: PublicMenuItem[];
  charges?: RestaurantChargeOption[];
  taxConfig?: {
    isGstEnabled: boolean;
    gstPercentage: number;
    gstNumber?: string | null;
  };
}

export interface PublicOrderStatusResponse {
  id: string;
  order_number: string;
  order_status: "PENDING" | "ACCEPTED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED" | "REJECTED";
  payment_status: "UNPAID" | "PAID" | "REFUNDED";
  total_paise: number;
  subtotal_paise: number;
  tax_paise: number;
  customer_name?: string;
  customer_phone?: string;
  special_notes?: string;
  created_at: string;
  restaurant: {
    id: string;
    name: string;
    phone?: string;
    ordering_mode: "SELF_SERVICE" | "STAFF_SERVED";
  };
  table: {
    id: string;
    label: string;
  };
  items: Array<{
    id: string;
    item_name_snapshot: string;
    unit_price_paise: number;
    quantity: number;
    line_total_paise: number;
    dietary_type_snapshot?: string;
  }>;
}

export const publicApi = {
  getMenuByTableToken: (tableToken: string) =>
    apiRequest<PublicMenuResponse>(`/api/public/menu/${tableToken}`),

  createOrder: (payload: CreateOrderInput) =>
    apiRequest<{ order: PublicOrderStatusResponse; tracking_token: string; isDuplicate?: boolean }>(
      "/api/public/orders",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  getOrderByTrackingToken: (trackingToken: string) =>
    apiRequest<PublicOrderStatusResponse>(`/api/public/orders/${trackingToken}`),
};
