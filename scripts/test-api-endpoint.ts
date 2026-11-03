import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const restId = "b8221719-a49f-4a45-bc74-b3fb39f45f70";
  console.log(`Testing API: ${BASE_URL}/api/restaurant/${restId}/orders`);

  // Let's test with the 3 staff users:
  const staff = [
    { email: "laziz.pizza@gmail.com", role: "OWNER" },
    { email: "rohan@gmail.com", role: "KITCHEN" },
    { email: "sanay@example.com", role: "MANAGER" },
  ];

  for (const s of staff) {
    console.log(`\n--- Authenticating as ${s.email} (${s.role}) ---`);
    // Find user id
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users.users.find((u) => u.email?.toLowerCase() === s.email.toLowerCase());
    if (!user) {
      console.log(`User ${s.email} not found in Supabase Auth`);
      continue;
    }

    // Set a known password to sign in
    await supabaseAdmin.auth.admin.updateUserById(user.id, { password: "TestPassword123!" });

    const anon = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: login, error: loginErr } = await anon.auth.signInWithPassword({
      email: s.email,
      password: "TestPassword123!",
    });

    if (loginErr || !login.session) {
      console.error(`Login failed for ${s.email}:`, loginErr);
      continue;
    }

    const token = login.session.access_token;
    const res = await fetch(`${BASE_URL}/api/restaurant/${restId}/orders`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(`Status for ${s.email}: ${res.status}`);
    const body = await res.json();
    console.log(`Result count for ${s.email}:`, body?.data?.length);
    console.log(`First item:`, JSON.stringify(body?.data?.[0], null, 2));
  }
}

main().catch(console.error);
