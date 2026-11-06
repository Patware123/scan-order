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
    const itemId = (formData.get("itemId") as string) || null;

    // Collect all uploaded files (supports "file", "files", "image", or multiple entries)
    const rawFiles: Array<{ name: string; type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> }> = [];
    for (const [key, value] of formData.entries()) {
      if (
        (key === "file" || key === "files" || key === "image" || key.startsWith("file_")) &&
        typeof value === "object" &&
        value !== null &&
        "arrayBuffer" in value
      ) {
        rawFiles.push(value as any);
      }
    }

    if (rawFiles.length === 0) {
      throw new BadRequestError("No image file provided in form data");
    }

    const uploadedUrls: string[] = [];

    for (const file of rawFiles) {
      let contentType = file.type;
      const lowerName = (file.name || "").toLowerCase();

      // If browser sent generic octet-stream, infer from extension
      if (!contentType || contentType === "application/octet-stream") {
        if (lowerName.endsWith(".png")) contentType = "image/png";
        else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) contentType = "image/jpeg";
        else if (lowerName.endsWith(".webp")) contentType = "image/webp";
        else if (lowerName.endsWith(".svg")) contentType = "image/svg+xml";
        else if (lowerName.endsWith(".gif")) contentType = "image/gif";
        else contentType = "image/jpeg"; // default fallback
      }

      if (!contentType.startsWith("image/")) {
        throw new BadRequestError(`File '${file.name}' is not an image. Only image files are permitted.`);
      }

      // Limit to 5MB
      if (file.size > 5 * 1024 * 1024) {
        throw new BadRequestError(`Image '${file.name}' exceeds the 5MB size limit.`);
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const result = await uploadMenuItemImage(id, itemId, buffer, file.name || `image-${Date.now()}.jpg`, contentType);
      uploadedUrls.push(result.imageUrl);
    }

    const primaryUrl = uploadedUrls[0];

    return successResponse(
      {
        url: primaryUrl,
        imageUrl: primaryUrl,
        images: uploadedUrls,
      },
      {
        message: `${uploadedUrls.length} image(s) uploaded successfully`,
        status: 201,
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
