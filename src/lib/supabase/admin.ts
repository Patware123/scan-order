import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

/**
 * Creates an administrative Supabase client using the Service Role Key.
 *
 * CRITICAL SECURITY WARNING:
 * - This client BYPASSES Row Level Security (RLS).
 * - MUST ONLY be used in secure server-side API routes or background jobs.
 * - NEVER import or execute this file in client-side code.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("CRITICAL SECURITY ERROR: createAdminClient cannot be called on the client side.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined."
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
