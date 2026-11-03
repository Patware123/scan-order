import { NextRequest } from "next/server";
import { getGuestOrderByToken } from "@/services/order.service";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ trackingToken: string }> }
) {
  try {
    const { trackingToken } = await params;
    const order = await getGuestOrderByToken(trackingToken);

    return successResponse(order);
  } catch (error) {
    return handleApiError(error);
  }
}
