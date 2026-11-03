import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { getTables, createTable } from "@/services/table.service";
import { createTableSchema } from "@/lib/validations/table.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER", "KITCHEN"], request);

    const tables = await getTables(id);
    return successResponse(tables);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    const json = await request.json();
    const validated = createTableSchema.parse(json);

    const table = await createTable(id, validated);
    return successResponse(table, {
      message: "Table created and QR generated successfully",
      status: 201,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
