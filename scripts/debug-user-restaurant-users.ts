import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const restId = "b8221719-a49f-4a45-bc74-b3fb39f45f70";

  // Check restaurant
  const { data: rest } = await supabaseAdmin
    .from("restaurants")
    .select("id, name, slug")
    .eq("id", restId)
    .single();

  console.log("Restaurant:", rest);

  // Check restaurant users
  const { data: users } = await supabaseAdmin
    .from("restaurant_users")
    .select("user_id, role, is_active")
    .eq("restaurant_id", restId);

  console.log("Restaurant Users:", users);

  for (const u of users || []) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(u.user_id);
    console.log(`- Role: ${u.role}, Active: ${u.is_active}, Email: ${authUser.user?.email}`);
  }
}

main().catch(console.error);
