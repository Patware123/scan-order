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
  imageUrl: z.string().url("Invalid image URL").optional().nullable(),
  isVeg: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  taxRatePercentage: z
    .number()
    .min(0, "Tax rate cannot be negative")
    .max(100, "Tax rate cannot exceed 100%")
    .default(5.0),
  sortOrder: z.number().int().default(0),
});

export const menuItemSchema = z.preprocess((val: any) => {
  if (typeof val === "object" && val !== null) {
    return {
      ...val,
      categoryId: val.categoryId ?? val.category_id,
      pricePaise: val.pricePaise ?? val.price_paise,
      imageUrl: val.imageUrl ?? val.image_url,
      isVeg: val.isVeg ?? val.is_veg ?? true,
      isAvailable: val.isAvailable ?? val.is_available ?? true,
      taxRatePercentage: val.taxRatePercentage ?? val.tax_rate_percentage ?? 5.0,
      sortOrder: val.sortOrder ?? val.sort_order ?? 0,
    };
  }
  return val;
}, baseMenuItemObject);

export const updateMenuItemSchema = z.preprocess((val: any) => {
  if (typeof val === "object" && val !== null) {
    return {
      ...val,
      categoryId: val.categoryId ?? val.category_id,
      pricePaise: val.pricePaise ?? val.price_paise,
      imageUrl: val.imageUrl ?? val.image_url,
      isVeg: val.isVeg ?? val.is_veg,
      isAvailable: val.isAvailable ?? val.is_available,
      taxRatePercentage: val.taxRatePercentage ?? val.tax_rate_percentage,
      sortOrder: val.sortOrder ?? val.sort_order,
    };
  }
  return val;
}, baseMenuItemObject.partial());

export const toggleAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

export const reorderItemsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int(),
    })
  ).min(1, "At least one item required for reordering"),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type MenuItemInput = z.infer<typeof menuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
export type ToggleAvailabilityInput = z.infer<typeof toggleAvailabilitySchema>;
export type ReorderItemsInput = z.infer<typeof reorderItemsSchema>;
