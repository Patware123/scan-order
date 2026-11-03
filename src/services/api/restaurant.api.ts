import { apiRequest } from "./client";

export interface RestaurantOrder {
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
  cancellation_reason?: string;
  created_at: string;
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

export interface RestaurantTable {
  id: string;
  label: string;
  table_number?: string;
  capacity: number;
  is_active: boolean;
  ordering_mode: "SELF_SERVICE" | "STAFF_SERVED";
  created_at: string;
  activeToken?: string | null;
  qr_token?: {
    token: string;
    is_revoked: boolean;
    expires_at?: string;
  } | null;
}

export interface MenuItemData {
  id: string;
  name: string;
  description?: string;
  price_paise: number;
  category_id: string;
  dietary_type: "VEG" | "NON_VEG" | "VEGAN" | "EGG";
  image_url?: string;
  is_available: boolean;
  is_featured: boolean;
  spice_level?: number;
  preparation_time_minutes?: number;
  display_order: number;
}

export interface CategoryData {
  id: string;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
}

export interface RestaurantStaffMember {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: "OWNER" | "MANAGER" | "KITCHEN";
  isActive: boolean;
  createdAt: string;
}

export const restaurantApi = {
  // Orders
  getOrders: (restaurantId: string, status?: string) => {
    const query = status && status !== "ALL" ? `?status=${status}` : "";
    return apiRequest<RestaurantOrder[]>(`/api/restaurant/${restaurantId}/orders${query}`);
  },

  getOrderById: (restaurantId: string, orderId: string) =>
    apiRequest<RestaurantOrder>(`/api/restaurant/${restaurantId}/orders/${orderId}`),

  updateOrderStatus: (
    restaurantId: string,
    orderId: string,
    status: RestaurantOrder["order_status"],
    reason?: string
  ) =>
    apiRequest<RestaurantOrder>(`/api/restaurant/${restaurantId}/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason }),
    }),

  updatePaymentStatus: (
    restaurantId: string,
    orderId: string,
    payment_status: RestaurantOrder["payment_status"]
  ) =>
    apiRequest<RestaurantOrder>(`/api/restaurant/${restaurantId}/orders/${orderId}/payment`, {
      method: "PATCH",
      body: JSON.stringify({ payment_status }),
    }),

  // Categories
  getCategories: (restaurantId: string) =>
    apiRequest<CategoryData[]>(`/api/restaurant/${restaurantId}/categories`),

  createCategory: (restaurantId: string, payload: { name: string; description?: string; display_order?: number }) =>
    apiRequest<CategoryData>(`/api/restaurant/${restaurantId}/categories`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateCategory: (restaurantId: string, categoryId: string, payload: Partial<CategoryData>) =>
    apiRequest<CategoryData>(`/api/restaurant/${restaurantId}/categories/${categoryId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteCategory: (restaurantId: string, categoryId: string) =>
    apiRequest<{ success: boolean }>(`/api/restaurant/${restaurantId}/categories/${categoryId}`, {
      method: "DELETE",
    }),

  // Menu Items
  getMenuItems: (restaurantId: string) =>
    apiRequest<MenuItemData[]>(`/api/restaurant/${restaurantId}/menu-items`),

  createMenuItem: (restaurantId: string, payload: Partial<MenuItemData>) =>
    apiRequest<MenuItemData>(`/api/restaurant/${restaurantId}/menu-items`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateMenuItem: (restaurantId: string, itemId: string, payload: Partial<MenuItemData>) =>
    apiRequest<MenuItemData>(`/api/restaurant/${restaurantId}/menu-items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  toggleItemAvailability: (restaurantId: string, itemId: string, is_available: boolean) =>
    apiRequest<MenuItemData>(`/api/restaurant/${restaurantId}/menu-items/${itemId}/availability`, {
      method: "PATCH",
      body: JSON.stringify({ is_available }),
    }),

  deleteMenuItem: (restaurantId: string, itemId: string) =>
    apiRequest<{ success: boolean }>(`/api/restaurant/${restaurantId}/menu-items/${itemId}`, {
      method: "DELETE",
    }),

  uploadMenuImage: async (restaurantId: string, file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const result = await apiRequest<{ url: string }>(`/api/restaurant/${restaurantId}/upload-image`, {
      method: "POST",
      body: formData,
    });
    return result.url;
  },

  // Tables & QR
  getTables: (restaurantId: string) =>
    apiRequest<RestaurantTable[]>(`/api/restaurant/${restaurantId}/tables`),

  createTable: (
    restaurantId: string,
    payload: {
      label?: string;
      tableNumber?: string;
      capacity?: number;
      ordering_mode?: string;
      isActive?: boolean;
    }
  ) => {
    const tableNumber = (payload.tableNumber || payload.label || "").trim();
    return apiRequest<RestaurantTable>(`/api/restaurant/${restaurantId}/tables`, {
      method: "POST",
      body: JSON.stringify({
        tableNumber,
        label: tableNumber,
        capacity: payload.capacity ?? 4,
        ordering_mode: payload.ordering_mode ?? "STAFF_SERVED",
        isActive: payload.isActive ?? true,
      }),
    });
  },

  updateTable: (restaurantId: string, tableId: string, payload: Partial<RestaurantTable>) =>
    apiRequest<RestaurantTable>(`/api/restaurant/${restaurantId}/tables/${tableId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  regenerateQR: (restaurantId: string, tableId: string) =>
    apiRequest<{ token: string }>(`/api/restaurant/${restaurantId}/tables/${tableId}/regenerate-qr`, {
      method: "POST",
    }),

  revokeQR: (restaurantId: string, tableId: string) =>
    apiRequest<{ success: boolean }>(`/api/restaurant/${restaurantId}/tables/${tableId}/revoke-qr`, {
      method: "POST",
    }),

  // Reports
  getDailyReports: (restaurantId: string, date?: string) => {
    const query = date ? `?date=${date}` : "";
    return apiRequest<{
      date: string;
      metrics: {
        total_orders: number;
        completed_orders: number;
        cancelled_orders: number;
        total_revenue_paise: number;
        total_revenue_rupees: number;
        average_order_value_rupees: number;
      };
      hourly_breakdown: Record<string, { order_count: number; revenue_paise: number }>;
    }>(`/api/restaurant/${restaurantId}/reports/daily${query}`);
  },

  getTopSellingItems: (restaurantId: string, limit = 5) =>
    apiRequest<Array<{
      menu_item_id: string;
      item_name: string;
      total_quantity: number;
      total_revenue_paise: number;
      total_revenue_rupees: number;
    }>>(`/api/restaurant/${restaurantId}/reports/top-items?limit=${limit}`),

  // Branding & Settings
  getBranding: (restaurantId: string) =>
    apiRequest<{
      id: string;
      name: string;
      slug: string;
      phone?: string;
      email?: string;
      address?: string;
      logo_url?: string;
      banner_url?: string;
      primary_color?: string;
      secondary_color?: string;
      currency: string;
      ordering_mode: "SELF_SERVICE" | "STAFF_SERVED";
    }>(`/api/restaurant/${restaurantId}/branding`),

  updateBranding: (restaurantId: string, payload: Record<string, unknown>) =>
    apiRequest(`/api/restaurant/${restaurantId}/branding`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  // Staff Management
  getStaff: (restaurantId: string) =>
    apiRequest<RestaurantStaffMember[]>(`/api/restaurant/${restaurantId}/users`),

  createStaff: (
    restaurantId: string,
    payload: {
      fullName: string;
      email: string;
      phone?: string | null;
      password: string;
      role: "OWNER" | "MANAGER" | "KITCHEN";
    }
  ) =>
    apiRequest(`/api/restaurant/${restaurantId}/users`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateStaffStatus: (restaurantId: string, userId: string, isActive: boolean) =>
    apiRequest(`/api/restaurant/${restaurantId}/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    }),

  resetStaffPassword: (restaurantId: string, userId: string, newPassword: string) =>
    apiRequest(`/api/restaurant/${restaurantId}/users/${userId}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ newPassword }),
    }),

  inviteStaff: (restaurantId: string, payload: { email: string; role: string }) =>
    apiRequest(`/api/restaurant/${restaurantId}/invitations`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
