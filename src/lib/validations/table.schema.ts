import { z } from "zod";

export const createTableSchema = z.preprocess((val: unknown) => {
  if (val && typeof val === "object") {
    const raw = val as Record<string, unknown>;
    const tableNumber = raw.tableNumber ?? raw.label ?? raw.table_number;
    const capacity =
      typeof raw.capacity === "string" ? parseInt(raw.capacity, 10) : raw.capacity;
    const isActive = raw.isActive ?? raw.is_active ?? true;
    return {
      ...raw,
      tableNumber,
      capacity,
      isActive,
    };
  }
  return val;
}, z.object({
  tableNumber: z.string().trim().min(1, "Table number is required").max(30),
  capacity: z.number().int().min(1, "Capacity must be at least 1").max(50).default(4),
  isActive: z.boolean().default(true),
}));

export const updateTableSchema = z.preprocess((val: unknown) => {
  if (val && typeof val === "object") {
    const raw = val as Record<string, unknown>;
    const tableNumber = raw.tableNumber ?? raw.label ?? raw.table_number;
    const capacity =
      typeof raw.capacity === "string" ? parseInt(raw.capacity, 10) : raw.capacity;
    const isActive = raw.isActive ?? raw.is_active;
    return {
      ...raw,
      ...(tableNumber !== undefined ? { tableNumber } : {}),
      ...(capacity !== undefined ? { capacity } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    };
  }
  return val;
}, z.object({
  tableNumber: z.string().trim().min(1).max(30).optional(),
  capacity: z.number().int().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
}));

export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;

