import { z } from "zod";

export const orderItemInputSchema = z.preprocess((val: any) => {
  if (typeof val === "object" && val !== null) {
    return {
      ...val,
      menuItemId: val.menuItemId ?? val.menu_item_id,
    };
  }
  return val;
}, z.object({
  menuItemId: z.string().uuid("Invalid menu item ID"),
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

export const orderQuerySchema = z.object({
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
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  updatedAfter: z.string().datetime().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;
export type OrderQueryInput = z.infer<typeof orderQuerySchema>;
