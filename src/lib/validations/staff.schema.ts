import { z } from "zod";

export const createStaffSchema = z.preprocess((val: any) => {
  if (typeof val === "object" && val !== null) {
    let normalizedRole = val.role;
    if (normalizedRole === "KITCHEN_STAFF" || normalizedRole === "CHEF") {
      normalizedRole = "KITCHEN";
    }
    return {
      ...val,
      fullName: val.fullName ?? val.full_name ?? val.name,
      phone: val.phone ?? val.phoneNumber ?? val.phone_number,
      role: normalizedRole ?? "MANAGER",
    };
  }
  return val;
}, z.object({
  fullName: z.string().trim().min(2, "Staff name must be at least 2 characters").max(100),
  email: z.string().email("Valid email address is required"),
  phone: z.string().trim().max(20).optional().nullable(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["OWNER", "MANAGER", "KITCHEN"]),
}));

export const updateStaffStatusSchema = z.preprocess((val: any) => {
  if (typeof val === "object" && val !== null) {
    return {
      ...val,
      isActive: val.isActive ?? val.is_active,
    };
  }
  return val;
}, z.object({
  isActive: z.boolean(),
}));

export const resetStaffPasswordSchema = z.preprocess((val: any) => {
  if (typeof val === "object" && val !== null) {
    return {
      ...val,
      newPassword: val.newPassword ?? val.new_password ?? val.password,
    };
  }
  return val;
}, z.object({
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
}));

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffStatusInput = z.infer<typeof updateStaffStatusSchema>;
export type ResetStaffPasswordInput = z.infer<typeof resetStaffPasswordSchema>;
