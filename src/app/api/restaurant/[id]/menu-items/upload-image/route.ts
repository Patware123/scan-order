import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { uploadMenuItemImage } from "@/services/menu.service";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError, BadRequestError } from "@/lib/utils/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const itemId = (formData.get("itemId") as string) || null;

    if (!file) {
      throw new BadRequestError("No image file provided in form data");
    }

    if (!file.type.startsWith("image/")) {
      throw new BadRequestError("Only image files are permitted");
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestError("Image size must be less than 5MB");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadMenuItemImage(id, itemId, buffer, file.name, file.type);
    return successResponse(result, {
      message: "Image uploaded successfully",
      status: 201,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
