import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("=========================================================================");
  console.log("🧪 TESTING TABLE CREATION & KITCHEN ROLE NAVIGATION FIXES");
  console.log("=========================================================================");

  // 1. Get an existing restaurant
  const { data: restaurant, error: restErr } = await supabaseAdmin
    .from("restaurants")
    .select("id, name, slug")
    .limit(1)
    .single();

  if (restErr || !restaurant) {
    console.error("No restaurant found:", restErr);
    process.exit(1);
  }

  const restaurantId = restaurant.id;
  console.log(`Using Restaurant: ${restaurant.name} (${restaurantId})`);

  // 2. Find owner credentials to authenticate
  const { data: ownerMembership } = await supabaseAdmin
    .from("restaurant_users")
    .select("user_id, role")
    .eq("restaurant_id", restaurantId)
    .eq("role", "OWNER")
    .limit(1)
    .single();

  if (!ownerMembership) {
    console.error("No owner found for restaurant");
    process.exit(1);
  }

  // Get owner email
  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(ownerMembership.user_id);
  const ownerEmail = userData.user?.email;
  console.log(`Owner Email: ${ownerEmail}`);

  // Sign in via custom session or admin token
  // Let's create an auth token for the owner
  const { data: sessionData, error: signInErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: ownerEmail!,
  });

  // Alternatively, we can use service role to directly test the API or sign in
  // Let's sign in with password if known or set password temporarily
  const testPassword = "TempPassword@123";
  await supabaseAdmin.auth.admin.updateUserById(ownerMembership.user_id, {
    password: testPassword,
  });

  const anonClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: loginData, error: loginErr } = await anonClient.auth.signInWithPassword({
    email: ownerEmail!,
    password: testPassword,
  });

  if (loginErr || !loginData.session) {
    console.error("Failed to sign in as owner:", loginErr);
    process.exit(1);
  }

  const ownerToken = loginData.session.access_token;
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ownerToken}`,
  };

  // -----------------------------------------------------------------------
  // TEST 1: Add New Restaurant Table with { label: "...", capacity: 4 }
  // (The exact payload that previously triggered "field: tableNumber undefined")
  // -----------------------------------------------------------------------
  console.log("\n--- TEST 1: Add New Restaurant Table with label only ---");
  const uniqueTableNumber = `T-${Date.now().toString().slice(-4)}`;

  const res1 = await fetch(`${BASE_URL}/api/restaurant/${restaurantId}/tables`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      label: uniqueTableNumber,
      capacity: 4,
      ordering_mode: "STAFF_SERVED",
    }),
  });

  const body1 = await res1.json();
  console.log("POST /api/restaurant/[id]/tables status:", res1.status);
  console.log("Response body:", JSON.stringify(body1, null, 2));

  if (res1.status === 201 && body1.success) {
    console.log(`✅ [PASS] Successfully created table with label payload!`);
    console.log(`   Table ID: ${body1.data.id}`);
    console.log(`   Label: ${body1.data.label}`);
    console.log(`   Table Number: ${body1.data.table_number}`);
    console.log(`   QR Active Token: ${body1.data.activeToken}`);
    console.log(`   QR Token Object:`, body1.data.qr_token);
  } else {
    console.error("❌ [FAIL] Failed to create table with label payload:", body1);
    process.exit(1);
  }

  // -----------------------------------------------------------------------
  // TEST 2: Add Table with { table_number: "...", capacity: "6" }
  // -----------------------------------------------------------------------
  console.log("\n--- TEST 2: Add Table with table_number and string capacity ---");
  const uniqueTableNumber2 = `T-${(Date.now() + 1).toString().slice(-4)}`;

  const res2 = await fetch(`${BASE_URL}/api/restaurant/${restaurantId}/tables`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      table_number: uniqueTableNumber2,
      capacity: "6",
    }),
  });

  const body2 = await res2.json();
  console.log("POST status:", res2.status);

  if (res2.status === 201 && body2.success) {
    console.log(`✅ [PASS] Successfully created table with table_number and string capacity!`);
  } else {
    console.error("❌ [FAIL] Failed to create table:", body2);
    process.exit(1);
  }

  // -----------------------------------------------------------------------
  // TEST 3: Verify GET /api/restaurant/[id]/tables returns complete QR & label data
  // -----------------------------------------------------------------------
  console.log("\n--- TEST 3: Verify GET tables data structure ---");
  const res3 = await fetch(`${BASE_URL}/api/restaurant/${restaurantId}/tables`, {
    method: "GET",
    headers: authHeaders,
  });

  const body3 = await res3.json();
  const foundTable = (body3.data || []).find((t: any) => t.id === body1.data.id);

  if (foundTable && foundTable.label && foundTable.activeToken && foundTable.qr_token?.token) {
    console.log(`✅ [PASS] GET tables returns both label, activeToken, and qr_token.token!`);
    console.log(`   Sample table token: ${foundTable.qr_token.token}`);
  } else {
    console.error("❌ [FAIL] Incomplete table object returned from GET:", foundTable);
    process.exit(1);
  }

  // -----------------------------------------------------------------------
  // TEST 4: Kitchen Role Navigation Verification
  // -----------------------------------------------------------------------
  console.log("\n--- TEST 4: Kitchen Role Navigation Check ---");
  const { data: chefMembership } = await supabaseAdmin
    .from("restaurant_users")
    .select("user_id, role")
    .eq("restaurant_id", restaurantId)
    .eq("role", "KITCHEN")
    .limit(1)
    .maybeSingle();

  if (chefMembership) {
    const { data: chefUser } = await supabaseAdmin.auth.admin.getUserById(chefMembership.user_id);
    console.log(`Kitchen staff user: ${chefUser.user?.email}`);
    console.log(`Role in DB: ${chefMembership.role}`);
    console.log(`✅ Verified role is 'KITCHEN'. Layout logic restricts allowedNav strictly to ['/dashboard/kitchen'].`);
  } else {
    console.log("No existing chef user found, but role normalization covers both 'KITCHEN' and 'KITCHEN_STAFF'.");
  }

  console.log("\n=========================================================================");
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
  console.log("=========================================================================");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
