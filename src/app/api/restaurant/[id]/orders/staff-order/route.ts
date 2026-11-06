import { NextRequest } from "next/server";
import { POST as ordersPost } from "../route";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return ordersPost(request, context);
}

