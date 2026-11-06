import { NextRequest } from "next/server";
import { POST as menuUploadPost } from "../menu-items/upload-image/route";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return menuUploadPost(request, context);
}

