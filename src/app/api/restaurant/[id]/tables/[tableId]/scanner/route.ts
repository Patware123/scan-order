import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { toggleTableScanner } from "@/services/table.service";
import { toggleScannerSchema } from "@/lib/validations/table.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tableId: string }> }
) {
  try {
    const { id, tableId } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    const body = await request.json();
    const validated = toggleScannerSchema.parse(body);

    const updated = await toggleTableScanner(id, tableId, validated.isScannerActive);
    return successResponse(updated, {
      message: `Scanner ${validated.isScannerActive ? "activated" : "deactivated"} successfully`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

