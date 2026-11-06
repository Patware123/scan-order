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
      isActive: val.isActive ?? val.is_active,
      is_active: val.is_active ?? val.isActive,
      contactEmail: val.contactEmail ?? val.email,
      contactPhone: val.contactPhone ?? val.phone,
      logoUrl: val.logoUrl ?? val.logo_url,
      gstNumber: val.gstNumber ?? val.gst_number,
      fssaiLicense: val.fssaiLicense ?? val.fssai_license,
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
  is_active: z.boolean().optional(),
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

export const updateBrandingSchema = z.preprocess((val: any) => {
  if (typeof val === "object" && val !== null) {
    return {
      ...val,
      name: val.name,
      phone: val.phone ?? val.supportPhone ?? val.support_phone,
      email: val.email ?? val.supportEmail ?? val.support_email,
      address: val.address,
      logoUrl: val.logoUrl ?? val.logo_url ?? null,
      bannerUrl: val.bannerUrl ?? val.banner_url ?? null,
      primaryColor: val.primaryColor ?? val.primary_color ?? "#783F24",
      secondaryColor: val.secondaryColor ?? val.secondary_color ?? "#FAF8F4",
      tagline: val.tagline ?? null,
      supportPhone: val.supportPhone ?? val.support_phone ?? val.phone ?? null,
      supportEmail: val.supportEmail ?? val.support_email ?? val.email ?? null,
      orderingMode: val.orderingMode ?? val.ordering_mode ?? "STAFF_SERVED",
    };
  }
  return val;
}, z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().optional().nullable().or(z.literal("")),
  email: z.string().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable().or(z.literal("")),
  logoUrl: z.string().optional().nullable().or(z.literal("")),
  bannerUrl: z.string().optional().nullable().or(z.literal("")),
  primaryColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Primary color must be a valid hex color code")
    .default("#783F24"),
  secondaryColor: z.string().optional().nullable(),
  tagline: z.string().trim().max(200).optional().nullable(),
  supportPhone: z.string().trim().max(20).optional().nullable(),
  supportEmail: z.string().optional().nullable().or(z.literal("")),
  orderingMode: z.enum(["SELF_SERVICE", "STAFF_SERVED"]).optional(),
}));

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
