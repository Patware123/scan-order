import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { getTopSellingItems } from "@/services/reports.service";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit")) || 10;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const items = await getTopSellingItems(id, limit, startDate, endDate);
    return successResponse(items);
  } catch (error) {
    return handleApiError(error);
  }
}
