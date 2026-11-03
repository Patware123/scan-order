import { z } from "zod";

export const createRestaurantSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase alphanumeric characters and hyphens"),
  currency: z.string().length(3).default("INR"),
  gstNumber: z.string().trim().max(20).optional().nullable(),
  fssaiLicense: z.string().trim().max(20).optional().nullable(),
  ownerEmail: z.string().email("Valid owner email required").optional(),
});

export const updateRestaurantSchema = z.preprocess((val: any) => {
  if (typeof val === "object" && val !== null) {
    return {
      ...val,
      contactEmail: val.contactEmail ?? val.email,
      contactPhone: val.contactPhone ?? val.phone,
      logoUrl: val.logoUrl ?? val.logo_url,
    };
  }
  return val;
}, z.object({
  name: z.string().trim().min(2).max(100).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase alphanumeric characters and hyphens")
    .optional(),
  isActive: z.boolean().optional(),
  currency: z.string().length(3).optional(),
  gstNumber: z.string().trim().max(20).optional().nullable(),
  fssaiLicense: z.string().trim().max(20).optional().nullable(),
  contactEmail: z.string().email().optional().nullable().or(z.literal("")),
  email: z.string().email().optional().nullable().or(z.literal("")),
  contactPhone: z.string().trim().max(20).optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(20).optional().nullable().or(z.literal("")),
  address: z.string().trim().max(255).optional().nullable().or(z.literal("")),
  logoUrl: z.string().url().optional().nullable().or(z.literal("")),
}));

export const updateBrandingSchema = z.object({
  logoUrl: z.string().url("Invalid logo URL").optional().nullable(),
  bannerUrl: z.string().url("Invalid banner URL").optional().nullable(),
  primaryColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Primary color must be a valid hex color code"),
  tagline: z.string().trim().max(200).optional().nullable(),
  supportPhone: z.string().trim().max(20).optional().nullable(),
  supportEmail: z.string().email("Invalid support email").optional().nullable(),
});

export const createRestaurantOnboardingSchema = z.preprocess((val: any) => {
  if (typeof val === "object" && val !== null) {
    return {
      ...val,
      contactEmail: val.contactEmail ?? val.contact_email ?? val.email,
      contactPhone: val.contactPhone ?? val.contact_phone ?? val.phone,
      logoUrl: val.logoUrl ?? val.logo_url,
      planCode: val.planCode ?? val.plan_code ?? "MONTHLY",
      maxTables: val.maxTables ?? val.max_tables ?? 10,
      ownerName: val.ownerName ?? val.owner_name ?? "Restaurant Owner",
      ownerEmail: val.ownerEmail ?? val.owner_email,
      ownerPhone: val.ownerPhone ?? val.owner_phone ?? val.contactPhone ?? val.contact_phone,
      ownerPassword: val.ownerPassword ?? val.owner_password,
    };
  }
  return val;
}, z.object({
  name: z.string().trim().min(2, "Restaurant name must be at least 2 characters").max(100),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase alphanumeric characters and hyphens"),
  currency: z.string().length(3).default("INR"),
  contactEmail: z.string().email("Valid contact email required"),
  contactPhone: z.string().trim().max(20).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  logoUrl: z.string().url("Invalid logo URL").optional().nullable(),
  planCode: z.enum(["MONTHLY", "SIX_MONTH", "ANNUAL", "FREE", "PRO", "ENTERPRISE"]).default("MONTHLY"),
  maxTables: z.coerce.number().int().min(1, "Table limit must be at least 1 table").max(1000),
  ownerName: z.string().trim().min(2, "Owner name must be at least 2 characters").max(100),
  ownerEmail: z.string().email("Valid owner email required"),
  ownerPhone: z.string().trim().max(20).optional().nullable(),
  ownerPassword: z.string().min(8, "Owner initial password must be at least 8 characters"),
  gstNumber: z.string().trim().max(20).optional().nullable(),
  fssaiLicense: z.string().trim().max(20).optional().nullable(),
}));

export const updateTableLimitSchema = z.object({
  maxTables: z.coerce.number().int().min(1, "Table limit must be at least 1 table").max(1000),
});

export const updateSubscriptionSchema = z.object({
  planCode: z.enum(["MONTHLY", "SIX_MONTH", "ANNUAL", "FREE", "PRO", "ENTERPRISE"]),
  extendMonths: z.coerce.number().int().min(1).max(36).optional(),
});

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type CreateRestaurantOnboardingInput = z.infer<typeof createRestaurantOnboardingSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
export type UpdateBrandingInput = z.infer<typeof updateBrandingSchema>;
export type UpdateTableLimitInput = z.infer<typeof updateTableLimitSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
