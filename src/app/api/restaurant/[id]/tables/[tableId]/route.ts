import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { updateTable, deleteTable } from "@/services/table.service";
import { updateTableSchema } from "@/lib/validations/table.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tableId: string }> }
) {
  try {
    const { id, tableId } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    const json = await request.json();
    const validated = updateTableSchema.parse(json);

    const updated = await updateTable(id, tableId, validated);
    return successResponse(updated, { message: "Table updated successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tableId: string }> }
) {
  try {
    const { id, tableId } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    await deleteTable(id, tableId);
    return successResponse({ success: true }, { message: "Table deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
