import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseBrowser = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Standardized client API requester.
 * Auto-injects Supabase session access token for authenticated endpoints.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Get browser session token if available
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  if (session?.access_token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  // Resolve full URL if executing in SSR or Node
  const fullUrl =
    path.startsWith("http")
      ? path
      : typeof window === "undefined"
      ? `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${path}`
      : path;

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg =
      (data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : null) ||
      response.statusText ||
      `Request failed with status ${response.status}`;
    throw new ApiError(errorMsg, response.status, data);
  }

  return (data?.data !== undefined ? data.data : data) as T;
}
