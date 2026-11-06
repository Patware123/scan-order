import { z } from "zod";

export const orderItemInputSchema = z.preprocess((val: any) => {
  if (typeof val === "object" && val !== null) {
    return {
      ...val,
      menuItemId: val.menuItemId ?? val.menu_item_id,
      variantId: val.variantId ?? val.variant_id ?? null,
    };
  }
  return val;
}, z.object({
  menuItemId: z.string().uuid("Invalid menu item ID"),
  variantId: z.string().uuid("Invalid variant ID").optional().nullable(),
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .min(1, "Quantity must be at least 1")
    .max(50, "Quantity cannot exceed 50 per item"),
}));

export const createOrderSchema = z.preprocess((val: any) => {
  if (typeof val === "object" && val !== null) {
    return {
      ...val,
      tableToken: val.tableToken ?? val.table_token,
      idempotencyKey: val.idempotencyKey ?? val.idempotency_key,
      specialInstructions: val.specialInstructions ?? val.special_instructions,
    };
  }
  return val;
}, z.object({
  tableToken: z.string().min(8, "Invalid or missing table QR token"),
  idempotencyKey: z.string().uuid("Invalid idempotency key format"),
  items: z
    .array(orderItemInputSchema)
    .min(1, "Order must contain at least one item")
    .max(100, "Order cannot contain more than 100 items"),
  specialInstructions: z
    .string()
    .max(500, "Special instructions cannot exceed 500 characters")
    .optional()
    .nullable(),
}));

export const createStaffOrderSchema = z.preprocess((val: any) => {
  if (typeof val === "object" && val !== null) {
    return {
      ...val,
      orderType: val.orderType ?? val.order_type ?? "DINE_IN",
      tableId: val.tableId ?? val.table_id ?? null,
      customerName: val.customerName ?? val.customer_name ?? null,
      customerPhone: val.customerPhone ?? val.customer_phone ?? null,
      specialInstructions: val.specialInstructions ?? val.special_instructions ?? null,
      idempotencyKey: val.idempotencyKey ?? val.idempotency_key ?? (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : undefined),
    };
  }
  return val;
}, z.object({
  orderType: z.enum(["DINE_IN", "PARCEL"]).default("DINE_IN"),
  tableId: z.string().uuid("Invalid table ID").optional().nullable(),
  customerName: z.string().max(100).optional().nullable(),
  customerPhone: z.string().max(20).optional().nullable(),
  specialInstructions: z.string().max(500).optional().nullable(),
  idempotencyKey: z.string().uuid().optional().nullable(),
  items: z
    .array(orderItemInputSchema)
    .min(1, "Order must contain at least one item")
    .max(100, "Order cannot contain more than 100 items"),
}));

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "ACCEPTED",
    "PREPARING",
    "READY",
    "COMPLETED",
    "CANCELLED",
    "REJECTED",
  ]),
  note: z.string().max(250).optional(),
});

export const updatePaymentStatusSchema = z.preprocess((val: any) => {
  if (typeof val === "object" && val !== null) {
    return {
      ...val,
      paymentStatus: val.paymentStatus ?? val.payment_status,
    };
  }
  return val;
}, z.object({
  paymentStatus: z.enum(["UNPAID", "PAID", "REFUNDED"]),
}));

export const orderQuerySchema = z.preprocess((val: any) => {
  if (typeof val === "object" && val !== null) {
    const rawStatus = val.status ? String(val.status).toUpperCase() : undefined;
    const cleanStatus = rawStatus && rawStatus !== "ALL" && rawStatus !== "" ? rawStatus : undefined;

    const rawTableId = val.tableId ? String(val.tableId).trim() : undefined;
    const cleanTableId = rawTableId && rawTableId !== "all" && rawTableId !== "" ? rawTableId : undefined;

    const rawOrderType = val.orderType ? String(val.orderType).toUpperCase() : undefined;
    const cleanOrderType = rawOrderType && rawOrderType !== "ALL" && rawOrderType !== "" ? rawOrderType : undefined;

    return {
      ...val,
      status: cleanStatus,
      tableId: cleanTableId,
      orderType: cleanOrderType,
      page: val.page || 1,
      limit: val.limit || 20,
      includeArchived: val.includeArchived === true || val.includeArchived === "true",
    };
  }
  return val;
}, z.object({
  status: z
    .enum([
      "PENDING",
      "ACCEPTED",
      "PREPARING",
      "READY",
      "COMPLETED",
      "CANCELLED",
      "REJECTED",
    ])
    .optional(),
  tableId: z.string().uuid().optional(),
  orderType: z.enum(["DINE_IN", "PARCEL"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  updatedAfter: z.string().datetime().optional(),
  includeArchived: z.coerce.boolean().default(false),
}));

export const deleteOrderSchema = z.object({
  reason: z.string().max(250).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateStaffOrderInput = z.infer<typeof createStaffOrderSchema>;
export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;
export type OrderQueryInput = z.infer<typeof orderQuerySchema>;
export type DeleteOrderInput = z.infer<typeof deleteOrderSchema>;
