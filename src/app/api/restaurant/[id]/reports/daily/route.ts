import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { getDailyReport } from "@/services/reports.service";
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
    const date = searchParams.get("date") || undefined;

    const report = await getDailyReport(id, date);
    return successResponse(report);
  } catch (error) {
    return handleApiError(error);
  }
}
