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
  order_type?: "DINE_IN" | "PARCEL";
  order_source?: "CUSTOMER" | "OWNER" | "MANAGER";
  table?: {
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
  is_scanner_active?: boolean;
  is_locked?: boolean;
  isScannerActive?: boolean;
  isLocked?: boolean;
  activeOrder?: any;
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
  is_veg?: boolean;
  isVeg?: boolean;
  dietary_type?: "VEG" | "NON_VEG" | "VEGAN" | "EGG";
  image_url?: string;
  is_available: boolean;
  is_featured?: boolean;
  spice_level?: number;
  preparation_time_minutes?: number;
  display_order?: number;
  tax_rate_percentage?: number;
  variants?: any[];
}

export interface CategoryData {
  id: string;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  menu_items?: MenuItemData[];
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

  createStaffOrder: (
    restaurantId: string,
    payload: {
      orderType: "DINE_IN" | "PARCEL";
      tableId?: string | null;
      customerName?: string | null;
      customerPhone?: string | null;
      specialInstructions?: string | null;
      items: Array<{ menuItemId: string; variantId?: string | null; quantity: number }>;
    }
  ) =>
    apiRequest<RestaurantOrder>(`/api/restaurant/${restaurantId}/orders`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteOrder: (restaurantId: string, orderId: string, reason?: string) =>
    apiRequest<{ success: boolean }>(`/api/restaurant/${restaurantId}/orders/${orderId}`, {
      method: "DELETE",
      body: reason ? JSON.stringify({ reason }) : undefined,
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
      body: JSON.stringify({ isAvailable: is_available, is_available }),
    }),

  deleteMenuItem: (restaurantId: string, itemId: string) =>
    apiRequest<{ success: boolean }>(`/api/restaurant/${restaurantId}/menu-items/${itemId}`, {
      method: "DELETE",
    }),

  getVariants: (restaurantId: string, itemId: string) =>
    apiRequest<Array<{
      id: string;
      restaurant_id: string;
      menu_item_id: string;
      name: string;
      price_paise: number;
      is_available: boolean;
      sort_order: number;
    }>>(`/api/restaurant/${restaurantId}/menu-items/${itemId}/variants`),

  createVariant: (
    restaurantId: string,
    itemId: string,
    payload: { name: string; pricePaise: number; isAvailable?: boolean; sortOrder?: number }
  ) =>
    apiRequest(`/api/restaurant/${restaurantId}/menu-items/${itemId}/variants`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateVariant: (
    restaurantId: string,
    itemId: string,
    variantId: string,
    payload: { name?: string; pricePaise?: number; isAvailable?: boolean; sortOrder?: number }
  ) =>
    apiRequest(`/api/restaurant/${restaurantId}/menu-items/${itemId}/variants/${variantId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteVariant: (restaurantId: string, itemId: string, variantId: string) =>
    apiRequest(`/api/restaurant/${restaurantId}/menu-items/${itemId}/variants/${variantId}`, {
      method: "DELETE",
    }),

  // Charges & Taxes
  getCharges: (restaurantId: string, appliesTo?: "ALL" | "DINE_IN" | "PARCEL") => {
    const q = appliesTo ? `?appliesTo=${appliesTo}` : "";
    return apiRequest<Array<{
      id: string;
      restaurant_id: string;
      name: string;
      charge_type: "PERCENTAGE" | "FIXED";
      rate_or_amount: number;
      applies_to: "ALL" | "DINE_IN" | "PARCEL";
      is_active: boolean;
      sort_order: number;
    }>>(`/api/restaurant/${restaurantId}/charges${q}`);
  },

  createCharge: (
    restaurantId: string,
    payload: {
      name: string;
      chargeType: "PERCENTAGE" | "FIXED";
      rateOrAmount: number;
      appliesTo?: "ALL" | "DINE_IN" | "PARCEL";
      isActive?: boolean;
      sortOrder?: number;
    }
  ) =>
    apiRequest(`/api/restaurant/${restaurantId}/charges`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateCharge: (
    restaurantId: string,
    chargeId: string,
    payload: Partial<{
      name: string;
      chargeType: "PERCENTAGE" | "FIXED";
      rateOrAmount: number;
      appliesTo: "ALL" | "DINE_IN" | "PARCEL";
      isActive: boolean;
      sortOrder: number;
    }>
  ) =>
    apiRequest(`/api/restaurant/${restaurantId}/charges/${chargeId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteCharge: (restaurantId: string, chargeId: string) =>
    apiRequest(`/api/restaurant/${restaurantId}/charges/${chargeId}`, {
      method: "DELETE",
    }),

  // Inventory Management
  getInventory: (restaurantId: string) =>
    apiRequest<Array<{
      id: string;
      restaurant_id: string;
      name: string;
      sku: string | null;
      current_stock: number;
      unit: string;
      low_stock_threshold: number;
      purchase_price_paise: number;
      supplier_name: string | null;
      expiry_date: string | null;
      isLowStock: boolean;
      isOutOfStock: boolean;
    }>>(`/api/restaurant/${restaurantId}/inventory`),

  createInventoryItem: (restaurantId: string, payload: Record<string, unknown>) =>
    apiRequest(`/api/restaurant/${restaurantId}/inventory`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateInventoryItem: (restaurantId: string, itemId: string, payload: Record<string, unknown>) =>
    apiRequest(`/api/restaurant/${restaurantId}/inventory/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteInventoryItem: (restaurantId: string, itemId: string) =>
    apiRequest(`/api/restaurant/${restaurantId}/inventory/${itemId}`, {
      method: "DELETE",
    }),

  recordStockMovement: (
    restaurantId: string,
    itemId: string,
    payload: { movementType: string; quantity: number; reason?: string }
  ) =>
    apiRequest(`/api/restaurant/${restaurantId}/inventory/${itemId}/movement`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getInventoryMovements: (restaurantId: string, itemId?: string) => {
    const q = itemId ? `?itemId=${itemId}` : "";
    return apiRequest<Array<{
      id: string;
      movement_type: string;
      quantity: number;
      stock_before: number;
      stock_after: number;
      reason: string | null;
      created_at: string;
      inventory_items?: { name: string; unit: string; sku: string };
    }>>(`/api/restaurant/${restaurantId}/inventory/movements${q}`);
  },

  getRecipeIngredients: (restaurantId: string, menuItemId?: string) => {
    const q = menuItemId ? `?menuItemId=${menuItemId}` : "";
    return apiRequest<Array<{
      id: string;
      menu_item_id: string;
      variant_id: string | null;
      inventory_item_id: string;
      quantity_required: number;
      menu_items?: { name: string };
      menu_item_variants?: { name: string };
      inventory_items?: { name: string; unit: string; current_stock: number };
    }>>(`/api/restaurant/${restaurantId}/inventory/recipes${q}`);
  },

  mapRecipeIngredient: (
    restaurantId: string,
    payload: {
      menuItemId: string;
      variantId?: string | null;
      inventoryItemId: string;
      quantityRequired: number;
    }
  ) =>
    apiRequest(`/api/restaurant/${restaurantId}/inventory/recipes`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteRecipeIngredient: (restaurantId: string, ingredientId: string) =>
    apiRequest(`/api/restaurant/${restaurantId}/inventory/recipes/${ingredientId}`, {
      method: "DELETE",
    }),

  uploadMenuImage: async (restaurantId: string, file: File, itemId?: string): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    if (itemId) {
      formData.append("itemId", itemId);
    }
    const result = await apiRequest<{ url?: string; imageUrl?: string }>(
      `/api/restaurant/${restaurantId}/upload-image`,
      {
        method: "POST",
        body: formData,
      }
    );
    return result.imageUrl || result.url || "";
  },

  uploadMultipleMenuImages: async (
    restaurantId: string,
    files: File[]
  ): Promise<string[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    const result = await apiRequest<{ images?: string[]; url?: string; imageUrl?: string }>(
      `/api/restaurant/${restaurantId}/upload-image`,
      {
        method: "POST",
        body: formData,
      }
    );
    if (result.images && result.images.length > 0) return result.images;
    const single = result.imageUrl || result.url;
    return single ? [single] : [];
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

  toggleTableScanner: (restaurantId: string, tableId: string, isScannerActive: boolean) =>
    apiRequest<{ id: string; is_scanner_active: boolean }>(
      `/api/restaurant/${restaurantId}/tables/${tableId}/scanner`,
      {
        method: "POST",
        body: JSON.stringify({ isScannerActive }),
      }
    ),

  toggleTableLock: (restaurantId: string, tableId: string, isLocked: boolean) =>
    apiRequest<{ id: string; is_locked: boolean }>(
      `/api/restaurant/${restaurantId}/tables/${tableId}/lock`,
      {
        method: "POST",
        body: JSON.stringify({ isLocked }),
      }
    ),

  // Reports
  getDailyReports: (restaurantId: string, date?: string) => {
    const query = date ? `?date=${date}` : "";
    return apiRequest<{
      date: string;
      metrics: {
        total_orders: number;
        completed_orders: number;
        cancelled_orders: number;
        active_orders?: number;
        total_revenue_paise: number;
        total_revenue_rupees: number;
        average_order_value_rupees: number;
        average_order_value_paise?: number;
        totalRevenuePaise?: number;
        totalOrders?: number;
        completedOrders?: number;
        cancelledOrders?: number;
        activeOrders?: number;
        averageOrderValuePaise?: number;
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
