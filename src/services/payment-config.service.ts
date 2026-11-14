import { createAdminClient } from "@/lib/supabase/admin";
import {
  RestaurantPaymentConfig,
  PublicPaymentConfig,
} from "@/types/payment-config.types";
import { UpdatePaymentConfigInput } from "@/lib/validations/payment-config.schema";
import { BadRequestError } from "@/lib/utils/errors";

const DEFAULT_CONFIG: Omit<RestaurantPaymentConfig, "restaurantId"> = {
  acceptCounter: true,
  acceptRazorpay: false,
  acceptUpi: false,
  payPolicy: "PAY_LATER",
  razorpayKeyId: null,
  razorpayKeySecret: null,
  upiId: null,
  upiName: null,
};

function maskSecret(secret?: string | null): string | null {
  if (!secret) return null;
  if (secret.length <= 4) return "••••••••";
  return `••••••••${secret.slice(-4)}`;
}

export async function getPaymentConfig(
  restaurantId: string,
  includeSecret = false
): Promise<RestaurantPaymentConfig> {
  const adminClient = createAdminClient();

  try {
    // 1. Try DB table restaurant_payment_configs
    const { data, error } = await (adminClient
      .from("restaurant_payment_configs" as any) as any)
      .select("*")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (!error && data) {
      return {
        restaurantId,
        acceptCounter: Boolean(data.accept_counter),
        acceptRazorpay: Boolean(data.accept_razorpay),
        acceptUpi: Boolean(data.accept_upi),
        payPolicy: data.pay_policy === "PAY_FIRST" ? "PAY_FIRST" : "PAY_LATER",
        razorpayKeyId: data.razorpay_key_id || null,
        razorpayKeySecret: includeSecret
          ? data.razorpay_key_secret || null
          : maskSecret(data.razorpay_key_secret),
        upiId: data.upi_id || null,
        upiName: data.upi_name || null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }
  } catch {
    // Fallback if table doesn't exist yet
  }

  // 2. Fallback: Check restaurant_branding tagline metadata tag [PAY_CONFIG:{...}]
  try {
    const { data: branding } = await adminClient
      .from("restaurant_branding")
      .select("tagline")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (branding?.tagline) {
      const match = branding.tagline.match(/\[PAY_CONFIG:({.*?})\]/);
      if (match) {
        const parsed = JSON.parse(match[1]);
        return {
          restaurantId,
          acceptCounter: parsed.acceptCounter ?? DEFAULT_CONFIG.acceptCounter,
          acceptRazorpay: parsed.acceptRazorpay ?? DEFAULT_CONFIG.acceptRazorpay,
          acceptUpi: parsed.acceptUpi ?? DEFAULT_CONFIG.acceptUpi,
          payPolicy: parsed.payPolicy === "PAY_FIRST" ? "PAY_FIRST" : "PAY_LATER",
          razorpayKeyId: parsed.razorpayKeyId || null,
          razorpayKeySecret: includeSecret
            ? parsed.razorpayKeySecret || null
            : maskSecret(parsed.razorpayKeySecret),
          upiId: parsed.upiId || null,
          upiName: parsed.upiName || null,
        };
      }
    }
  } catch {
    // Ignore fallback errors
  }

  return {
    restaurantId,
    ...DEFAULT_CONFIG,
  };
}

export async function updatePaymentConfig(
  restaurantId: string,
  input: UpdatePaymentConfigInput
): Promise<RestaurantPaymentConfig> {
  const adminClient = createAdminClient();

  // Retrieve current existing config to preserve secret if user didn't overwrite it
  const current = await getPaymentConfig(restaurantId, true);

  let finalKeySecret = input.razorpayKeySecret;
  if (
    !finalKeySecret ||
    finalKeySecret.startsWith("••••") ||
    finalKeySecret.trim() === ""
  ) {
    finalKeySecret = current.razorpayKeySecret;
  }

  const payloadToStore = {
    accept_counter: input.acceptCounter,
    accept_razorpay: input.acceptRazorpay,
    accept_upi: input.acceptUpi,
    pay_policy: input.payPolicy,
    razorpay_key_id: input.razorpayKeyId ? input.razorpayKeyId.trim() : null,
    razorpay_key_secret: finalKeySecret ? finalKeySecret.trim() : null,
    upi_id: input.upiId ? input.upiId.trim() : null,
    upi_name: input.upiName ? input.upiName.trim() : null,
    updated_at: new Date().toISOString(),
  };

  // 1. Attempt upsert into restaurant_payment_configs table
  try {
    await (adminClient
      .from("restaurant_payment_configs" as any) as any)
      .upsert(
        {
          restaurant_id: restaurantId,
          ...payloadToStore,
        },
        { onConflict: "restaurant_id" }
      );
  } catch (err) {
    console.warn("Could not upsert into restaurant_payment_configs table:", err);
  }

  // 2. Mirror into restaurant_branding tagline as backup tag [PAY_CONFIG:{...}]
  try {
    const { data: existingBranding } = await adminClient
      .from("restaurant_branding")
      .select("tagline")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    const tagData = JSON.stringify({
      acceptCounter: input.acceptCounter,
      acceptRazorpay: input.acceptRazorpay,
      acceptUpi: input.acceptUpi,
      payPolicy: input.payPolicy,
      razorpayKeyId: payloadToStore.razorpay_key_id,
      razorpayKeySecret: payloadToStore.razorpay_key_secret,
      upiId: payloadToStore.upi_id,
      upiName: payloadToStore.upi_name,
    });

    let newTagline = existingBranding?.tagline || "";
    if (newTagline.includes("[PAY_CONFIG:")) {
      newTagline = newTagline.replace(/\[PAY_CONFIG:{.*?}\]/, `[PAY_CONFIG:${tagData}]`);
    } else {
      newTagline = `${newTagline} [PAY_CONFIG:${tagData}]`.trim();
    }

    await adminClient
      .from("restaurant_branding")
      .upsert(
        {
          restaurant_id: restaurantId,
          tagline: newTagline,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "restaurant_id" }
      );
  } catch (err) {
    console.warn("Could not mirror payment config to restaurant_branding:", err);
  }

  return {
    restaurantId,
    acceptCounter: input.acceptCounter,
    acceptRazorpay: input.acceptRazorpay,
    acceptUpi: input.acceptUpi,
    payPolicy: input.payPolicy,
    razorpayKeyId: payloadToStore.razorpay_key_id,
    razorpayKeySecret: maskSecret(payloadToStore.razorpay_key_secret),
    upiId: payloadToStore.upi_id,
    upiName: payloadToStore.upi_name,
    updatedAt: payloadToStore.updated_at,
  };
}

export async function getPublicPaymentConfig(
  restaurantId: string
): Promise<PublicPaymentConfig> {
  const config = await getPaymentConfig(restaurantId, false);
  return {
    acceptCounter: config.acceptCounter,
    acceptRazorpay: config.acceptRazorpay,
    acceptUpi: config.acceptUpi,
    payPolicy: config.payPolicy,
    razorpayKeyId: config.razorpayKeyId,
    upiId: config.upiId,
    upiName: config.upiName,
  };
}
