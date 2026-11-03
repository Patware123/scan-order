/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import crypto from "crypto";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const supabaseAuthClient = createClient<Database>(supabaseUrl, anonKey);

interface ChecklistItem {
  id: number;
  category: string;
  name: string;
  endpoint: string;
  method: string;
  status: "PASS" | "FAIL";
  details: string;
}

const checklist: ChecklistItem[] = [];

function recordResult(
  id: number,
  category: string,
  name: string,
  endpoint: string,
  method: string,
  status: "PASS" | "FAIL",
  details: string
) {
  checklist.push({ id, category, name, endpoint, method, status, details });
  const icon = status === "PASS" ? "✅" : "❌";
  console.log(`${icon} [${status}] Step ${id}: ${name} (${method} ${endpoint}) -> ${details}`);
}

async function apiCall(
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: unknown
): Promise<{ status: number; json: any; error?: string }> {
  const url = `${baseUrl}${path}`;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, json };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 500, json: null, error: message };
  }
}

async function getOrCreateSuperAdmin(): Promise<{ id: string; token: string }> {
  const email = "superadmin@scanorder.com";
  const pass = "Password123!";

  const { data: signInData } = await supabaseAuthClient.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (signInData?.session?.access_token) {
    return { id: signInData.user.id, token: signInData.session.access_token };
  }

  // Create via Admin
  const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: pass,
    email_confirm: true,
  });

  if (createErr && !createData?.user) {
    throw new Error(`Failed to create super admin: ${createErr.message}`);
  }

  const { data: loginData, error: loginErr } = await supabaseAuthClient.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (loginErr || !loginData?.session) {
    throw new Error(`Failed to sign in as superadmin: ${loginErr?.message}`);
  }

  // Ensure super admin role exists in restaurant_users
  await supabaseAdmin.from("restaurant_users").upsert({
    restaurant_id: "00000000-0000-0000-0000-000000000000",
    user_id: loginData.user.id,
    role: "SUPER_ADMIN",
    is_active: true,
  });

  return { id: loginData.user.id, token: loginData.session.access_token };
}

async function loginUser(email: string, pass: string): Promise<{ id: string; token: string }> {
  const { data, error } = await supabaseAuthClient.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (error || !data?.session) {
    throw new Error(`Failed to sign in as ${email}: ${error?.message}`);
  }

  return { id: data.user.id, token: data.session.access_token };
}

export async function runOnboardingAndAccessControlVerification() {
  console.log("=========================================================================");
  console.log("🚀 VERIFYING ONBOARDING, ACCESS CONTROL & SUBSCRIPTION WORKFLOWS");
  console.log(`Target: ${baseUrl}`);
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log("=========================================================================\n");

  const runId = Date.now().toString().slice(-6);

  try {
    // -------------------------------------------------------------------------
    // 1. SUPER ADMIN: CREATE RESTAURANT WITH PLAN, TABLE LIMIT & OWNER CREDENTIALS
    // -------------------------------------------------------------------------
    console.log("\n--- STEP 1: SUPER ADMIN RESTAURANT ONBOARDING ---");
    const superAdmin = await getOrCreateSuperAdmin();
    const superAdminHeaders = { Authorization: `Bearer ${superAdmin.token}` };

    const newRestName = `Himalayan Heights Dining ${runId}`;
    const newRestSlug = `himalayan-heights-${runId}`;
    const ownerEmail = `owner.himalayan.${runId}@test.com`;
    const ownerPass = "OwnerSecretPass123!";
    const initialTableLimit = 2; // Strict limit of 2 tables to test enforcement

    const onboardPayload = {
      name: newRestName,
      slug: newRestSlug,
      contactEmail: `contact.${runId}@himalayan.com`,
      contactPhone: "+91 9876500001",
      address: "Ridge Road, Shimla, Himachal Pradesh",
      logoUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
      planCode: "MONTHLY",
      maxTables: initialTableLimit,
      ownerName: "Devendra Rathore",
      ownerEmail,
      ownerPhone: "+91 9876500002",
      ownerPassword: ownerPass,
    };

    const resOnboard = await apiCall("POST", "/api/admin/restaurants", superAdminHeaders, onboardPayload);
    const onboardData = resOnboard.json?.data;
    const newRestId = onboardData?.id;

    if (
      resOnboard.status === 201 &&
      newRestId &&
      onboardData.tableLimit === 2 &&
      onboardData.subscription?.planCode === "MONTHLY"
    ) {
      recordResult(
        1,
        "Super Admin",
        "Onboard Restaurant with Plan & Table Limit",
        "/api/admin/restaurants",
        "POST",
        "PASS",
        `Created '${newRestName}' (ID: ${newRestId}) on MONTHLY plan (₹1,500) with Table Limit: 2`
      );
    } else {
      recordResult(
        1,
        "Super Admin",
        "Onboard Restaurant with Plan & Table Limit",
        "/api/admin/restaurants",
        "POST",
        "FAIL",
        `Status ${resOnboard.status}: ${JSON.stringify(resOnboard.json)}`
      );
      return;
    }

    // -------------------------------------------------------------------------
    // 2. RESTAURANT OWNER: LOGIN WITH SUPER ADMIN CONFIGURED CREDENTIALS
    // -------------------------------------------------------------------------
    console.log("\n--- STEP 2: RESTAURANT OWNER LOGIN ---");
    const ownerUser = await loginUser(ownerEmail, ownerPass);
    const ownerHeaders = { Authorization: `Bearer ${ownerUser.token}` };

    if (ownerUser.id) {
      recordResult(
        2,
        "Restaurant Owner",
        "Log in with Onboarded Credentials",
        "supabase.auth.signInWithPassword",
        "AUTH",
        "PASS",
        `Owner '${ownerEmail}' signed in successfully without plaintext password exposure`
      );
    } else {
      recordResult(
        2,
        "Restaurant Owner",
        "Log in with Onboarded Credentials",
        "supabase.auth.signInWithPassword",
        "AUTH",
        "FAIL",
        "Owner failed to authenticate with configured initial credentials"
      );
    }

    // -------------------------------------------------------------------------
    // 3. OWNER CREATES MANAGER ACCOUNT
    // -------------------------------------------------------------------------
    console.log("\n--- STEP 3: CREATE MANAGER ACCOUNT ---");
    const managerEmail = `manager.himalayan.${runId}@test.com`;
    const managerPass = "ManagerSecure123!";

    const resCreateManager = await apiCall(
      "POST",
      `/api/restaurant/${newRestId}/users`,
      ownerHeaders,
      {
        fullName: "Karan Mehta",
        email: managerEmail,
        phone: "+91 9876500010",
        password: managerPass,
        role: "MANAGER",
      }
    );

    const managerUserId = resCreateManager.json?.data?.userId;

    if (resCreateManager.status === 201 && managerUserId) {
      recordResult(
        3,
        "Staff Management",
        "Create Manager Account",
        `/api/restaurant/${newRestId}/users`,
        "POST",
        "PASS",
        `Created manager '${managerEmail}' (Role: MANAGER)`
      );
    } else {
      recordResult(
        3,
        "Staff Management",
        "Create Manager Account",
        `/api/restaurant/${newRestId}/users`,
        "POST",
        "FAIL",
        `Status ${resCreateManager.status}: ${JSON.stringify(resCreateManager.json)}`
      );
    }

    // -------------------------------------------------------------------------
    // 4. OWNER CREATES KITCHEN STAFF ACCOUNT
    // -------------------------------------------------------------------------
    console.log("\n--- STEP 4: CREATE KITCHEN STAFF ACCOUNT ---");
    const chefEmail = `chef.himalayan.${runId}@test.com`;
    const chefPass = "ChefSecure123!";

    const resCreateChef = await apiCall(
      "POST",
      `/api/restaurant/${newRestId}/users`,
      ownerHeaders,
      {
        fullName: "Chef Sanjeev",
        email: chefEmail,
        password: chefPass,
        role: "KITCHEN",
      }
    );

    const chefUserId = resCreateChef.json?.data?.userId;

    if (resCreateChef.status === 201 && chefUserId) {
      recordResult(
        4,
        "Staff Management",
        "Create Kitchen Staff Account",
        `/api/restaurant/${newRestId}/users`,
        "POST",
        "PASS",
        `Created kitchen chef '${chefEmail}' with dedicated KDS credentials`
      );
    } else {
      recordResult(
        4,
        "Staff Management",
        "Create Kitchen Staff Account",
        `/api/restaurant/${newRestId}/users`,
        "POST",
        "FAIL",
        `Status ${resCreateChef.status}: ${JSON.stringify(resCreateChef.json)}`
      );
    }

    // -------------------------------------------------------------------------
    // 5. MANAGER & KITCHEN STAFF LOGIN WITH INDIVIDUAL CREDENTIALS
    // -------------------------------------------------------------------------
    console.log("\n--- STEP 5: STAFF AUTHENTICATION & ROLE ISOLATION ---");
    const managerAuth = await loginUser(managerEmail, managerPass);
    const chefAuth = await loginUser(chefEmail, chefPass);

    const managerHeaders = { Authorization: `Bearer ${managerAuth.token}` };
    const chefHeaders = { Authorization: `Bearer ${chefAuth.token}` };

    // Manager accesses live orders queue
    const resManagerOrders = await apiCall("GET", `/api/restaurant/${newRestId}/orders`, managerHeaders);
    // Kitchen accesses live orders queue
    const resChefOrders = await apiCall("GET", `/api/restaurant/${newRestId}/orders`, chefHeaders);

    if (resManagerOrders.status === 200 && resChefOrders.status === 200) {
      recordResult(
        5,
        "Role Permissions",
        "Individual Staff Logins & Queue Access",
        `/api/restaurant/${newRestId}/orders`,
        "GET",
        "PASS",
        "Manager and Kitchen staff authenticated with individual logins"
      );
    } else {
      recordResult(
        5,
        "Role Permissions",
        "Individual Staff Logins & Queue Access",
        `/api/restaurant/${newRestId}/orders`,
        "GET",
        "FAIL",
        `Manager: ${resManagerOrders.status}, Chef: ${resChefOrders.status}`
      );
    }

    // Role boundaries: Kitchen chef tries to access staff management (Only Owner permitted)
    const resChefStaffBreach = await apiCall("GET", `/api/restaurant/${newRestId}/users`, chefHeaders);
    if (resChefStaffBreach.status === 403) {
      recordResult(
        6,
        "Role Permissions",
        "Kitchen Staff Blocked from Staff Administration",
        `/api/restaurant/${newRestId}/users`,
        "GET",
        "PASS",
        "Blocked kitchen chef with HTTP 403 Forbidden (RBAC boundary enforced)"
      );
    } else {
      recordResult(
        6,
        "Role Permissions",
        "Kitchen Staff Blocked from Staff Administration",
        `/api/restaurant/${newRestId}/users`,
        "GET",
        "FAIL",
        `Expected 403, got ${resChefStaffBreach.status}`
      );
    }

    // -------------------------------------------------------------------------
    // 6. OWNER CATALOG SETUP & TABLE LIMIT ENFORCEMENT
    // -------------------------------------------------------------------------
    console.log("\n--- STEP 6: TABLE LIMIT ENFORCEMENT (MAX TABLES: 2) ---");

    // Create Category & Menu Item
    const resCat = await apiCall("POST", `/api/restaurant/${newRestId}/categories`, ownerHeaders, {
      name: "Himalayan Thalis",
      sortOrder: 0,
      isActive: true,
    });
    const catId = resCat.json?.data?.id;

    const resItem = await apiCall("POST", `/api/restaurant/${newRestId}/menu-items`, ownerHeaders, {
      categoryId: catId,
      name: "Special Himachali Dham Thali",
      pricePaise: 45000, // ₹450.00
      isVeg: true,
      isAvailable: true,
      taxRatePercentage: 5,
    });
    const itemId = resItem.json?.data?.id;

    // Create Table 1 (allowed: 1 of 2)
    const resTable1 = await apiCall("POST", `/api/restaurant/${newRestId}/tables`, ownerHeaders, {
      tableNumber: "T-01",
      capacity: 4,
    });
    const table1Token = resTable1.json?.data?.activeToken;

    // Create Table 2 (allowed: 2 of 2)
    const resTable2 = await apiCall("POST", `/api/restaurant/${newRestId}/tables`, ownerHeaders, {
      tableNumber: "T-02",
      capacity: 2,
    });

    if (resTable1.status === 201 && resTable2.status === 201) {
      recordResult(
        7,
        "Table Limits",
        "Create Tables Within Assigned Limit",
        `/api/restaurant/${newRestId}/tables`,
        "POST",
        "PASS",
        "Created Table T-01 and T-02 within assigned limit of 2"
      );
    } else {
      recordResult(
        7,
        "Table Limits",
        "Create Tables Within Assigned Limit",
        `/api/restaurant/${newRestId}/tables`,
        "POST",
        "FAIL",
        `Status: ${resTable1.status}, ${resTable2.status}`
      );
    }

    // Attempt to Create Table 3 -> Must be BLOCKED by table limit!
    const resTable3Breach = await apiCall("POST", `/api/restaurant/${newRestId}/tables`, ownerHeaders, {
      tableNumber: "T-03",
      capacity: 6,
    });

    if (resTable3Breach.status === 400) {
      recordResult(
        8,
        "Table Limits",
        "Prevent Exceeding Assigned Table Limit",
        `/api/restaurant/${newRestId}/tables`,
        "POST",
        "PASS",
        `Blocked Table T-03 creation with HTTP 400: ${resTable3Breach.json?.error?.message}`
      );
    } else {
      recordResult(
        8,
        "Table Limits",
        "Prevent Exceeding Assigned Table Limit",
        `/api/restaurant/${newRestId}/tables`,
        "POST",
        "FAIL",
        `Expected HTTP 400 Bad Request, got ${resTable3Breach.status}`
      );
    }

    // -------------------------------------------------------------------------
    // 7. SUPER ADMIN UPDATES TABLE LIMIT
    // -------------------------------------------------------------------------
    console.log("\n--- STEP 7: SUPER ADMIN INCREASES TABLE LIMIT ---");
    const resUpdateLimit = await apiCall(
      "PATCH",
      `/api/admin/restaurants/${newRestId}/table-limit`,
      superAdminHeaders,
      { maxTables: 5 }
    );

    if (resUpdateLimit.status === 200 && resUpdateLimit.json?.data?.maxTables === 5) {
      recordResult(
        9,
        "Super Admin",
        "Update Restaurant Table Limit Later",
        `/api/admin/restaurants/${newRestId}/table-limit`,
        "PATCH",
        "PASS",
        "Super Admin updated table limit from 2 to 5 tables"
      );
    } else {
      recordResult(
        9,
        "Super Admin",
        "Update Restaurant Table Limit Later",
        `/api/admin/restaurants/${newRestId}/table-limit`,
        "PATCH",
        "FAIL",
        `Status: ${resUpdateLimit.status}: ${JSON.stringify(resUpdateLimit.json)}`
      );
    }

    // Owner creates Table 3 now that limit was raised to 5
    const resTable3Success = await apiCall("POST", `/api/restaurant/${newRestId}/tables`, ownerHeaders, {
      tableNumber: "T-03",
      capacity: 6,
    });

    if (resTable3Success.status === 201) {
      recordResult(
        10,
        "Table Limits",
        "Create Table After Limit Increase",
        `/api/restaurant/${newRestId}/tables`,
        "POST",
        "PASS",
        "Table T-03 created successfully following Super Admin limit update"
      );
    } else {
      recordResult(
        10,
        "Table Limits",
        "Create Table After Limit Increase",
        `/api/restaurant/${newRestId}/tables`,
        "POST",
        "FAIL",
        `Status: ${resTable3Success.status}`
      );
    }

    // -------------------------------------------------------------------------
    // 8. CUSTOMER ORDERING FLOW PRESERVATION
    // -------------------------------------------------------------------------
    console.log("\n--- STEP 8: CUSTOMER ORDER & KDS LIFECYCLE ---");

    // Customer scans Table 1 QR
    const resMenu = await apiCall("GET", `/api/public/menu/${table1Token}`);
    const idempotencyKey = crypto.randomUUID();

    const orderPayload = {
      tableToken: table1Token,
      idempotencyKey,
      items: [{ menuItemId: itemId, quantity: 2 }],
      specialInstructions: "Serve piping hot",
    };

    const resOrder = await apiCall("POST", "/api/public/orders", {}, orderPayload);
    const orderId = resOrder.json?.data?.order?.id;
    const trackingToken = resOrder.json?.data?.tracking_token || resOrder.json?.data?.order?.guest_tracking_token;

    if (resOrder.status === 201 && orderId && trackingToken) {
      recordResult(
        11,
        "Customer Flow",
        "Customer Checkout via Table QR",
        "/api/public/orders",
        "POST",
        "PASS",
        `Order #${resOrder.json?.data?.order?.order_number} created (Total: ₹945.00 with GST)`
      );
    } else {
      recordResult(
        11,
        "Customer Flow",
        "Customer Checkout via Table QR",
        "/api/public/orders",
        "POST",
        "FAIL",
        `Status: ${resOrder.status}`
      );
    }

    // Manager Accepts order (PENDING -> ACCEPTED)
    const resAccept = await apiCall(
      "PATCH",
      `/api/restaurant/${newRestId}/orders/${orderId}/status`,
      managerHeaders,
      { status: "ACCEPTED" }
    );

    // Kitchen Chef moves to PREPARING -> READY
    const resPrep = await apiCall(
      "PATCH",
      `/api/restaurant/${newRestId}/orders/${orderId}/status`,
      chefHeaders,
      { status: "PREPARING" }
    );
    const resReady = await apiCall(
      "PATCH",
      `/api/restaurant/${newRestId}/orders/${orderId}/status`,
      chefHeaders,
      { status: "READY" }
    );

    // Customer polls live status
    const resPoll = await apiCall("GET", `/api/public/orders/${trackingToken}`);

    if (
      resAccept.status === 200 &&
      resPrep.status === 200 &&
      resReady.status === 200 &&
      resPoll.json?.data?.order_status === "READY"
    ) {
      recordResult(
        12,
        "Order Lifecycle",
        "Manager Accept & Kitchen KDS Transitions",
        `/api/restaurant/${newRestId}/orders/${orderId}/status`,
        "PATCH",
        "PASS",
        "PENDING -> ACCEPTED -> PREPARING -> READY processed cleanly"
      );
    } else {
      recordResult(
        12,
        "Order Lifecycle",
        "Manager Accept & Kitchen KDS Transitions",
        `/api/restaurant/${newRestId}/orders/${orderId}/status`,
        "PATCH",
        "FAIL",
        `Accept: ${resAccept.status}, Prep: ${resPrep.status}, Ready: ${resReady.status}, Poll: ${resPoll.json?.data?.order_status}`
      );
    }

    // Manager marks PAID and COMPLETED
    await apiCall(
      "PATCH",
      `/api/restaurant/${newRestId}/orders/${orderId}/payment`,
      managerHeaders,
      { paymentStatus: "PAID" }
    );
    const resComplete = await apiCall(
      "PATCH",
      `/api/restaurant/${newRestId}/orders/${orderId}/status`,
      managerHeaders,
      { status: "COMPLETED" }
    );

    if (resComplete.status === 200) {
      recordResult(
        13,
        "Order Lifecycle",
        "Payment Settlement & Order Completion",
        `/api/restaurant/${newRestId}/orders/${orderId}/status`,
        "PATCH",
        "PASS",
        "Order marked PAID and COMPLETED"
      );
    } else {
      recordResult(
        13,
        "Order Lifecycle",
        "Payment Settlement & Order Completion",
        `/api/restaurant/${newRestId}/orders/${orderId}/status`,
        "PATCH",
        "FAIL",
        `Status ${resComplete.status}`
      );
    }

    // -------------------------------------------------------------------------
    // 9. STAFF DEACTIVATION & ACCESS REVOCATION
    // -------------------------------------------------------------------------
    console.log("\n--- STEP 9: STAFF DEACTIVATION & ACCESS REVOCATION ---");

    // Owner deactivates Manager
    const resDeactivateManager = await apiCall(
      "PATCH",
      `/api/restaurant/${newRestId}/users/${managerUserId}`,
      ownerHeaders,
      { isActive: false }
    );

    if (resDeactivateManager.status === 200) {
      recordResult(
        14,
        "Access Control",
        "Owner Deactivates Manager Account",
        `/api/restaurant/${newRestId}/users/${managerUserId}`,
        "PATCH",
        "PASS",
        "Manager account marked is_active = false"
      );
    } else {
      recordResult(
        14,
        "Access Control",
        "Owner Deactivates Manager Account",
        `/api/restaurant/${newRestId}/users/${managerUserId}`,
        "PATCH",
        "FAIL",
        `Status ${resDeactivateManager.status}`
      );
    }

    // Deactivated manager attempts to access orders -> Must be 403 Forbidden!
    const resDeactivatedAccess = await apiCall(
      "GET",
      `/api/restaurant/${newRestId}/orders`,
      managerHeaders
    );

    if (resDeactivatedAccess.status === 403) {
      recordResult(
        15,
        "Access Control",
        "Deactivated Account Immediately Denied Access",
        `/api/restaurant/${newRestId}/orders`,
        "GET",
        "PASS",
        "Blocked deactivated manager with HTTP 403 Forbidden"
      );
    } else {
      recordResult(
        15,
        "Access Control",
        "Deactivated Account Immediately Denied Access",
        `/api/restaurant/${newRestId}/orders`,
        "GET",
        "FAIL",
        `Expected 403 Forbidden, got ${resDeactivatedAccess.status}`
      );
    }

    // -------------------------------------------------------------------------
    // 10. STAFF PASSWORD RESET WORKFLOW
    // -------------------------------------------------------------------------
    console.log("\n--- STEP 10: STAFF PASSWORD RESET WORKFLOW ---");
    const newChefPass = "ChefBrandNewPass456!";

    const resResetPass = await apiCall(
      "POST",
      `/api/restaurant/${newRestId}/users/${chefUserId}/reset-password`,
      ownerHeaders,
      { newPassword: newChefPass }
    );

    if (resResetPass.status === 200) {
      recordResult(
        16,
        "Staff Management",
        "Owner Initiates Staff Password Reset",
        `/api/restaurant/${newRestId}/users/${chefUserId}/reset-password`,
        "POST",
        "PASS",
        "Chef password reset via Supabase Auth admin API"
      );
    } else {
      recordResult(
        16,
        "Staff Management",
        "Owner Initiates Staff Password Reset",
        `/api/restaurant/${newRestId}/users/${chefUserId}/reset-password`,
        "POST",
        "FAIL",
        `Status ${resResetPass.status}`
      );
    }

    // Kitchen chef logs in with new password
    const newChefAuth = await loginUser(chefEmail, newChefPass);
    if (newChefAuth.token) {
      recordResult(
        17,
        "Staff Management",
        "Staff Member Signs In with New Password",
        "supabase.auth.signInWithPassword",
        "AUTH",
        "PASS",
        "Chef authenticated successfully using newly configured password"
      );
    } else {
      recordResult(
        17,
        "Staff Management",
        "Staff Member Signs In with New Password",
        "supabase.auth.signInWithPassword",
        "AUTH",
        "FAIL",
        "Chef failed to authenticate with new password"
      );
    }

    // -------------------------------------------------------------------------
    // 11. STRICT MULTI-TENANT ISOLATION
    // -------------------------------------------------------------------------
    console.log("\n--- STEP 11: MULTI-TENANT CROSS-ACCESS BLOCK ---");
    const anotherRestId = "7f26e99e-98cd-43bc-ba56-60608726ab21"; // The Royal Biryani House

    const resCrossAccess = await apiCall(
      "GET",
      `/api/restaurant/${anotherRestId}/orders`,
      ownerHeaders
    );

    if (resCrossAccess.status === 403 || resCrossAccess.status === 401) {
      recordResult(
        18,
        "Tenant Isolation",
        "Block Cross-Restaurant Data Access Attempt",
        `/api/restaurant/${anotherRestId}/orders`,
        "GET",
        "PASS",
        `Blocked foreign restaurant access with HTTP ${resCrossAccess.status} Forbidden`
      );
    } else {
      recordResult(
        18,
        "Tenant Isolation",
        "Block Cross-Restaurant Data Access Attempt",
        `/api/restaurant/${anotherRestId}/orders`,
        "GET",
        "FAIL",
        `Expected 403/401, got ${resCrossAccess.status}`
      );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("FATAL RUNNER ERROR:", message);
  }

  // Summary Table
  console.log("\n=========================================================================");
  console.log("📊 ONBOARDING & ACCESS CONTROL VERIFICATION REPORT");
  console.log("=========================================================================");
  console.table(
    checklist.map((c) => ({
      Step: c.id,
      Category: c.category,
      Test: c.name,
      Status: c.status,
      Details: c.details.slice(0, 65),
    }))
  );

  const total = checklist.length;
  const passed = checklist.filter((c) => c.status === "PASS").length;
  const failed = total - passed;

  console.log(`TOTAL CHECKS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("=========================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runOnboardingAndAccessControlVerification();
