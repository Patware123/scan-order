import { z } from "zod";

const baseChargeObject = z.object({
  name: z.string().min(1, "Charge name is required").max(100),
  chargeType: z.enum(["PERCENTAGE", "FIXED"]),
  rateOrAmount: z.coerce.number().min(0, "Rate or amount cannot be negative"),
  appliesTo: z.enum(["ALL", "DINE_IN", "PARCEL"]).default("ALL"),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

function preprocessCharge(val: any) {
  if (typeof val === "object" && val !== null) {
    return {
      ...val,
      chargeType: val.chargeType ?? val.charge_type,
      rateOrAmount: val.rateOrAmount ?? val.rate_or_amount,
      appliesTo: val.appliesTo ?? val.applies_to ?? "ALL",
      isActive: val.isActive ?? val.is_active ?? true,
      sortOrder: val.sortOrder ?? val.sort_order ?? 0,
    };
  }
  return val;
}

export const restaurantChargeSchema = z.preprocess(preprocessCharge, baseChargeObject);
export const updateRestaurantChargeSchema = z.preprocess(preprocessCharge, baseChargeObject.partial());

export type RestaurantChargeInput = z.infer<typeof restaurantChargeSchema>;
export type UpdateRestaurantChargeInput = z.infer<typeof updateRestaurantChargeSchema>;
