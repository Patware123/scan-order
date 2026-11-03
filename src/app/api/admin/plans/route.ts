import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function GET() {
  try {
    const adminClient = createAdminClient();
    const { data: plans, error } = await adminClient
      .from("subscription_plans")
      .select("*")
      .order("price_paise", { ascending: true });

    if (error) {
      throw error;
    }

    return successResponse(plans || []);
  } catch (error) {
    return handleApiError(error);
  }
}
