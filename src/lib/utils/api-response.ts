import { NextResponse } from "next/server";
import { ApiResponseSuccess } from "@/types/api.types";

/**
 * Creates a standardized success JSON response.
 */
export function successResponse<T>(
  data: T,
  options?: {
    message?: string;
    status?: number;
    meta?: ApiResponseSuccess<T>["meta"];
  }
): NextResponse<ApiResponseSuccess<T>> {
  const status = options?.status ?? 200;
  return NextResponse.json(
    {
      success: true,
      data,
      message: options?.message,
      meta: options?.meta,
    },
    { status }
  );
}
