import { z } from "zod";

function preprocessPaymentConfig(val: any) {
  if (typeof val === "object" && val !== null) {
    return {
      ...val,
      acceptCounter: val.acceptCounter ?? val.accept_counter,
      acceptRazorpay: val.acceptRazorpay ?? val.accept_razorpay,
      acceptUpi: val.acceptUpi ?? val.accept_upi,
      payPolicy: val.payPolicy ?? val.pay_policy ?? "PAY_LATER",
      razorpayKeyId: val.razorpayKeyId ?? val.razorpay_key_id,
      razorpayKeySecret: val.razorpayKeySecret ?? val.razorpay_key_secret,
      upiId: val.upiId ?? val.upi_id,
      upiName: val.upiName ?? val.upi_name,
    };
  }
  return val;
}

export const updatePaymentConfigSchema = z.preprocess(
  preprocessPaymentConfig,
  z.object({
    acceptCounter: z.boolean().default(true),
    acceptRazorpay: z.boolean().default(false),
    acceptUpi: z.boolean().default(false),
    payPolicy: z.enum(["PAY_FIRST", "PAY_LATER"]).default("PAY_LATER"),
    razorpayKeyId: z.string().trim().max(150).optional().nullable(),
    razorpayKeySecret: z.string().trim().max(150).optional().nullable(),
    upiId: z.string().trim().max(100).optional().nullable(),
    upiName: z.string().trim().max(100).optional().nullable(),
  })
  .refine(
    (data) => data.acceptCounter || data.acceptRazorpay || data.acceptUpi,
    {
      message: "At least one payment option (Pay at counter, Razorpay, or UPI) must be enabled.",
      path: ["acceptCounter"],
    }
  )
  .refine(
    (data) => {
      if (data.acceptRazorpay && !data.razorpayKeyId) {
        return false;
      }
      return true;
    },
    {
      message: "Razorpay Key ID is required when Razorpay is enabled.",
      path: ["razorpayKeyId"],
    }
  )
  .refine(
    (data) => {
      if (data.acceptUpi && !data.upiId) {
        return false;
      }
      return true;
    },
    {
      message: "UPI ID is required when Pay by UPI is enabled.",
      path: ["upiId"],
    }
  )
);

export type UpdatePaymentConfigInput = z.infer<typeof updatePaymentConfigSchema>;

