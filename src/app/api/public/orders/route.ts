import { NextRequest } from "next/server";
import { createOrderSchema } from "@/lib/validations/order.schema";
import { createCustomerOrder } from "@/services/order.service";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const validated = createOrderSchema.parse(json);

    const result = await createCustomerOrder(validated);

    const guestTrackingToken = (result.order as unknown as { guest_tracking_token?: string })?.guest_tracking_token;
    return successResponse(
      {
        ...result,
        trackingToken: guestTrackingToken,
        tracking_token: guestTrackingToken,
      },
      {
        message: result.isDuplicate
          ? "Existing order retrieved"
          : "Order placed successfully",
        status: result.isDuplicate ? 200 : 201,
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
