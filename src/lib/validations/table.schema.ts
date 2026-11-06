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

export const toggleScannerSchema = z.preprocess((val: any) => {
  if (typeof val === "object" && val !== null) {
    return {
      isScannerActive: val.isScannerActive ?? val.is_scanner_active ?? val.isActive ?? val.is_active,
    };
  }
  return val;
}, z.object({
  isScannerActive: z.boolean(),
}));

export const toggleLockSchema = z.preprocess((val: any) => {
  if (typeof val === "object" && val !== null) {
    return {
      isLocked: val.isLocked ?? val.is_locked,
    };
  }
  return val;
}, z.object({
  isLocked: z.boolean(),
}));

export type ToggleScannerInput = z.infer<typeof toggleScannerSchema>;
export type ToggleLockInput = z.infer<typeof toggleLockSchema>;


