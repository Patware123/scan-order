import { z } from "zod";

const baseCategoryObject = z.object({
  name: z.string().trim().min(1, "Category name is required").max(100),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const categorySchema = z.preprocess((val: any) => {
  if (typeof val === "object" && val !== null) {
    return {
      ...val,
      sortOrder: val.sortOrder ?? val.sort_order ?? val.display_order ?? 0,
      isActive: val.isActive ?? val.is_active ?? true,
    };
  }
  return val;
}, baseCategoryObject);

export const updateCategorySchema = z.preprocess((val: any) => {
  if (typeof val === "object" && val !== null) {
    return {
      ...val,
      sortOrder: val.sortOrder ?? val.sort_order ?? val.display_order,
      isActive: val.isActive ?? val.is_active,
    };
  }
  return val;
}, baseCategoryObject.partial());

const baseMenuItemObject = z.object({
  categoryId: z.string().uuid("Invalid category ID"),
  name: z.string().trim().min(1, "Item name is required").max(150),
  description: z.string().trim().max(1000).optional().nullable(),
  pricePaise: z
    .number()
    .int("Price must be an integer in paise")
    .min(0, "Price cannot be negative"),
  imageUrl: z.string().trim().optional().nullable().or(z.literal("")),
  isVeg: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  taxRatePercentage: z
    .number()
    .min(0, "Tax rate cannot be negative")
    .max(100, "Tax rate cannot exceed 100%")
    .default(5.0),
  sortOrder: z.number().int().default(0),
});

function resolveIsVeg(val: any): boolean | undefined {
  if (typeof val.isVeg === "boolean") return val.isVeg;
  if (typeof val.is_veg === "boolean") return val.is_veg;
  if (typeof val.isVeg === "string") return val.isVeg === "true" || val.isVeg === "1";
  if (typeof val.is_veg === "string") return val.is_veg === "true" || val.is_veg === "1";

  const dtype = (val.dietaryType || val.dietary_type || "").toString().toUpperCase();
  if (dtype === "NON_VEG" || dtype === "NON-VEG" || dtype === "EGG") return false;
  if (dtype === "VEG" || dtype === "VEGAN") return true;

  return undefined;
}

export const menuItemSchema = z.preprocess((val: any) => {
  if (typeof val === "object" && val !== null) {
    const rawImage = val.imageUrl ?? val.image_url;
    return {
      ...val,
      categoryId: val.categoryId ?? val.category_id,
      pricePaise: val.pricePaise ?? val.price_paise,
      imageUrl: typeof rawImage === "string" ? (rawImage.trim() || null) : (rawImage ?? null),
      isVeg: resolveIsVeg(val) ?? true,
      isAvailable: val.isAvailable ?? val.is_available ?? true,
      taxRatePercentage: val.taxRatePercentage ?? val.tax_rate_percentage ?? 0,
      sortOrder: val.sortOrder ?? val.sort_order ?? 0,
    };
  }
  return val;
}, baseMenuItemObject);

export const updateMenuItemSchema = z.preprocess((val: any) => {
  if (typeof val === "object" && val !== null) {
    const rawImage = val.imageUrl ?? val.image_url;
    return {
      ...val,
      categoryId: val.categoryId ?? val.category_id,
      pricePaise: val.pricePaise ?? val.price_paise,
      imageUrl: rawImage !== undefined
        ? (typeof rawImage === "string" ? (rawImage.trim() || null) : (rawImage ?? null))
        : undefined,
      isVeg: resolveIsVeg(val),
      isAvailable: val.isAvailable ?? val.is_available,
      taxRatePercentage: val.taxRatePercentage ?? val.tax_rate_percentage,
      sortOrder: val.sortOrder ?? val.sort_order,
    };
  }
  return val;
}, baseMenuItemObject.partial());

export const toggleAvailabilitySchema = z.preprocess((val: any) => {
  if (typeof val === "object" && val !== null) {
    const raw = val.isAvailable ?? val.is_available ?? val.available;
    if (raw !== undefined) {
      return {
        isAvailable:
          typeof raw === "string" ? raw === "true" || raw === "1" : Boolean(raw),
      };
    }
  }
  return val;
}, z.object({
  isAvailable: z.boolean().default(true),
}));

export const reorderItemsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int(),
    })
  ).min(1, "At least one item required for reordering"),
});

const baseVariantObject = z.object({
  name: z.string().trim().min(1, "Variant name is required").max(100),
  pricePaise: z.coerce
    .number()
    .int("Price must be an integer in paise")
    .min(0, "Price cannot be negative"),
  isAvailable: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

function preprocessVariant(val: any) {
  if (typeof val === "object" && val !== null) {
    return {
      ...val,
      pricePaise: val.pricePaise ?? val.price_paise,
      isAvailable: val.isAvailable ?? val.is_available ?? true,
      sortOrder: val.sortOrder ?? val.sort_order ?? 0,
    };
  }
  return val;
}

export const menuItemVariantSchema = z.preprocess(preprocessVariant, baseVariantObject);
export const updateMenuItemVariantSchema = z.preprocess(preprocessVariant, baseVariantObject.partial());

export type CategoryInput = z.infer<typeof categorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type MenuItemInput = z.infer<typeof menuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
export type ToggleAvailabilityInput = z.infer<typeof toggleAvailabilitySchema>;
export type ReorderItemsInput = z.infer<typeof reorderItemsSchema>;
export type MenuItemVariantInput = z.infer<typeof menuItemVariantSchema>;
export type UpdateMenuItemVariantInput = z.infer<typeof updateMenuItemVariantSchema>;
