import { ZodError } from "zod";
import { NextResponse } from "next/server";
import { ApiResponseError, ApiErrorDetail } from "@/types/api.types";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: ApiErrorDetail[];

  constructor(
    message: string,
    statusCode = 500,
    errorCode = "INTERNAL_SERVER_ERROR",
    details?: ApiErrorDetail[]
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad Request", details?: ApiErrorDetail[]) {
    super(message, 400, "BAD_REQUEST", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied: Insufficient permissions") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Requested resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource conflict or duplicate submission") {
    super(message, 409, "CONFLICT");
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message = "Validation failed", details?: ApiErrorDetail[]) {
    super(message, 422, "UNPROCESSABLE_ENTITY", details);
  }
}

/**
 * Transforms any caught error into a standardized JSON NextResponse.
 */
export function handleApiError(error: unknown): NextResponse<ApiResponseError> {
  console.error("API Error encountered:", error);

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    const details: ApiErrorDetail[] = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details,
        },
      },
      { status: 422 }
    );
  }

  const message =
    error instanceof Error ? error.message : "An unexpected server error occurred";

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: process.env.NODE_ENV === "production" ? "Internal server error" : message,
      },
    },
    { status: 500 }
  );
}
