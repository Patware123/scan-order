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

async function getOrCreateUser(email: string, pass = "Password123!"): Promise<{ id: string; token: string }> {
  // Try sign in
  const { data: signInData } = await supabaseAuthClient.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (signInData?.session?.access_token) {
    return { id: signInData.user.id, token: signInData.session.access_token };
  }

  // Create user via Admin
  const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: pass,
    email_confirm: true,
  });

  if (createErr && !createData?.user) {
    throw new Error(`Failed to create user ${email}: ${createErr.message}`);
  }

  // Sign in to get access token
  const { data: loginData, error: loginErr } = await supabaseAuthClient.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (loginErr || !loginData?.session) {
    throw new Error(`Failed to sign in as ${email}: ${loginErr?.message}`);
  }

  return { id: loginData.user.id, token: loginData.session.access_token };
}

export async function runFullE2ESaaSVerification() {
  console.log("=========================================================================");
  console.log("🚀 STARTING COMPLETE END-TO-END QR RESTAURANT ORDERING SAAS VERIFICATION");
  console.log(`Target: ${baseUrl}`);
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log("=========================================================================\n");

  const runId = Date.now().toString().slice(-6);

  try {
    // -------------------------------------------------------------------------
    // STEP 1: SUPER ADMIN FLOW
    // -------------------------------------------------------------------------
    console.log("\n--- STEP 1: SUPER ADMIN LOG IN & RESTAURANT ONBOARDING ---");
    const superAdmin = await getOrCreateUser("superadmin@scanorder.com");
    const superAdminHeaders = { Authorization: `Bearer ${superAdmin.token}` };

    const newRestSlug = `spice-symphony-${runId}`;
    const newRestName = `Spice Symphony Bistro ${runId}`;
    const ownerEmail = `owner.symphony.${runId}@restaurant.com`;

    // 1.1 Create restaurant via Super Admin API
    const resCreateRest = await apiCall("POST", "/api/admin/restaurants", superAdminHeaders, {
      name: newRestName,
      slug: newRestSlug,
      currency: "INR",
      ownerEmail,
    });

    const newRestId = resCreateRest.json?.data?.id;
    if (resCreateRest.status === 201 && newRestId) {
      recordResult(
        1,
        "Super Admin",
        "Create Restaurant Tenant",
        "/api/admin/restaurants",
        "POST",
        "PASS",
        `Created '${newRestName}' (ID: ${newRestId}, Slug: ${newRestSlug})`
      );
    } else {
      recordResult(
        1,
        "Super Admin",
        "Create Restaurant Tenant",
        "/api/admin/restaurants",
        "POST",
        "FAIL",
        `Status ${resCreateRest.status}: ${JSON.stringify(resCreateRest.json)}`
      );
      process.exit(1);
    }

    // 1.2 Setup Owner Auth Account & Link to Restaurant
    const ownerUser = await getOrCreateUser(ownerEmail);
    const { error: linkErr } = await supabaseAdmin.from("restaurant_users").insert({
      restaurant_id: newRestId,
      user_id: ownerUser.id,
      role: "OWNER",
      is_active: true,
    });

    if (!linkErr) {
      recordResult(
        2,
        "Super Admin",
        "Configure Owner Credentials & Role",
        "/api/restaurant_users",
        "DB",
        "PASS",
        `Owner '${ownerEmail}' assigned role OWNER to restaurant ${newRestId}`
      );
    } else {
      recordResult(
        2,
        "Super Admin",
        "Configure Owner Credentials & Role",
        "/api/restaurant_users",
        "DB",
        "FAIL",
        `Error: ${linkErr.message}`
      );
    }

    const ownerHeaders = { Authorization: `Bearer ${ownerUser.token}` };

    // -------------------------------------------------------------------------
    // STEP 2: RESTAURANT OWNER FLOW
    // -------------------------------------------------------------------------
    console.log("\n--- STEP 2: RESTAURANT OWNER CONFIGURATION & CATALOG SETUP ---");

    // 2.1 Configure Branding & Settings
    const resBranding = await apiCall("PATCH", `/api/restaurant/${newRestId}/branding`, ownerHeaders, {
      primaryColor: "#783F24",
      tagline: "Authentic Charcoal Tandoor & Artisan Biryanis",
      supportPhone: "9876543210",
      supportEmail: ownerEmail,
      ordering_mode: "STAFF_SERVED",
    });

    if (resBranding.status === 200) {
      recordResult(
        3,
        "Restaurant Owner",
        "Update Branding & Service Mode",
        `/api/restaurant/${newRestId}/branding`,
        "PATCH",
        "PASS",
        "Theme set to #783F24, service mode STAFF_SERVED configured"
      );
    } else {
      recordResult(
        3,
        "Restaurant Owner",
        "Update Branding & Service Mode",
        `/api/restaurant/${newRestId}/branding`,
        "PATCH",
        "FAIL",
        `Status ${resBranding.status}: ${JSON.stringify(resBranding.json)}`
      );
    }

    // 2.2 Create Menu Category
    const resCat = await apiCall("POST", `/api/restaurant/${newRestId}/categories`, ownerHeaders, {
      name: "Tandoori Specialties",
      description: "Charcoal roasted delicacies",
      sort_order: 1,
    });

    const categoryId = resCat.json?.data?.id;
    if (resCat.status === 201 && categoryId) {
      recordResult(
        4,
        "Restaurant Owner",
        "Create Menu Category",
        `/api/restaurant/${newRestId}/categories`,
        "POST",
        "PASS",
        `Category 'Tandoori Specialties' created (ID: ${categoryId})`
      );
    } else {
      recordResult(
        4,
        "Restaurant Owner",
        "Create Menu Category",
        `/api/restaurant/${newRestId}/categories`,
        "POST",
        "FAIL",
        `Status ${resCat.status}: ${JSON.stringify(resCat.json)}`
      );
    }

    // 2.3 Create Menu Items (with integer paise pricing)
    const resItem1 = await apiCall("POST", `/api/restaurant/${newRestId}/menu-items`, ownerHeaders, {
      categoryId,
      name: "Smoked Butter Chicken",
      description: "Tender tandoori chicken simmered in velvet makhani gravy",
      pricePaise: 38000, // ₹380.00
      isVeg: false,
      isAvailable: true,
      taxRatePercentage: 5,
    });

    const resItem2 = await apiCall("POST", `/api/restaurant/${newRestId}/menu-items`, ownerHeaders, {
      categoryId,
      name: "Garlic Butter Naan",
      description: "Leavened flatbread brushed with garlic butter",
      pricePaise: 9000, // ₹90.00
      isVeg: true,
      isAvailable: true,
      taxRatePercentage: 5,
    });

    const itemId1 = resItem1.json?.data?.id;
    const itemId2 = resItem2.json?.data?.id;

    if (resItem1.status === 201 && itemId1 && resItem2.status === 201 && itemId2) {
      recordResult(
        5,
        "Restaurant Owner",
        "Create Menu Items (Integer Paise)",
        `/api/restaurant/${newRestId}/menu-items`,
        "POST",
        "PASS",
        `Created 'Smoked Butter Chicken' (38000 paise = ₹380) & 'Garlic Butter Naan' (9000 paise = ₹90)`
      );
    } else {
      recordResult(
        5,
        "Restaurant Owner",
        "Create Menu Items (Integer Paise)",
        `/api/restaurant/${newRestId}/menu-items`,
        "POST",
        "FAIL",
        `Status: ${resItem1.status}, ${resItem2.status}: ${JSON.stringify(resItem1.json || resItem2.json)}`
      );
    }

    // 2.4 Create Restaurant Table & Generate Scannable QR Token
    const resTable = await apiCall("POST", `/api/restaurant/${newRestId}/tables`, ownerHeaders, {
      tableNumber: "T01",
      capacity: 4,
    });

    const tableId = resTable.json?.data?.id;
    const tableQrToken = resTable.json?.data?.activeToken || resTable.json?.data?.active_qr_token;

    if (resTable.status === 201 && tableId && tableQrToken) {
      recordResult(
        6,
        "Restaurant Owner",
        "Create Table & Generate QR Token",
        `/api/restaurant/${newRestId}/tables`,
        "POST",
        "PASS",
        `Created Table T01 (ID: ${tableId}) with Active QR Token '${tableQrToken}'`
      );
    } else {
      recordResult(
        6,
        "Restaurant Owner",
        "Create Table & Generate QR Token",
        `/api/restaurant/${newRestId}/tables`,
        "POST",
        "FAIL",
        `Status ${resTable.status}: ${JSON.stringify(resTable.json)}`
      );
    }

    // -------------------------------------------------------------------------
    // STEP 3 & 4: KITCHEN STAFF & RESTAURANT MANAGER SETUP
    // -------------------------------------------------------------------------
    console.log("\n--- STEP 3 & 4: STAFF ONBOARDING & ROLE PERMISSIONS ---");

    const managerEmail = `manager.symphony.${runId}@restaurant.com`;
    const chefEmail = `chef.symphony.${runId}@restaurant.com`;

    const managerUser = await getOrCreateUser(managerEmail);
    const chefUser = await getOrCreateUser(chefEmail);

    const { error: staffInsertErr } = await supabaseAdmin.from("restaurant_users").insert([
      { restaurant_id: newRestId, user_id: managerUser.id, role: "MANAGER", is_active: true },
      { restaurant_id: newRestId, user_id: chefUser.id, role: "KITCHEN", is_active: true },
    ]);

    if (staffInsertErr) {
      console.error("Staff insert error:", staffInsertErr.message);
    }

    const managerHeaders = { Authorization: `Bearer ${managerUser.token}` };
    const chefHeaders = { Authorization: `Bearer ${chefUser.token}` };

    // Verify Kitchen Staff access
    const resChefOrders = await apiCall("GET", `/api/restaurant/${newRestId}/orders`, chefHeaders);
    if (resChefOrders.status === 200) {
      recordResult(
        7,
        "Kitchen Staff",
        "Kitchen Staff Queue Access",
        `/api/restaurant/${newRestId}/orders`,
        "GET",
        "PASS",
        "Chef authenticated and loaded kitchen orders queue"
      );
    } else {
      recordResult(
        7,
        "Kitchen Staff",
        "Kitchen Staff Queue Access",
        `/api/restaurant/${newRestId}/orders`,
        "GET",
        "FAIL",
        `Status ${resChefOrders.status}: ${JSON.stringify(resChefOrders.json)}`
      );
    }

    // Verify Manager access
    const resManagerOrders = await apiCall("GET", `/api/restaurant/${newRestId}/orders`, managerHeaders);
    if (resManagerOrders.status === 200) {
      recordResult(
        8,
        "Restaurant Manager",
        "Manager Orders Queue Access",
        `/api/restaurant/${newRestId}/orders`,
        "GET",
        "PASS",
        "Manager authenticated and verified live orders queue"
      );
    } else {
      recordResult(
        8,
        "Restaurant Manager",
        "Manager Orders Queue Access",
        `/api/restaurant/${newRestId}/orders`,
        "GET",
        "FAIL",
        `Status ${resManagerOrders.status}: ${JSON.stringify(resManagerOrders.json)}`
      );
    }

    // -------------------------------------------------------------------------
    // STEP 5: CUSTOMER MOBILE FLOW (QR RESOLUTION)
    // -------------------------------------------------------------------------
    console.log("\n--- STEP 5: CUSTOMER MOBILE FLOW & QR SCAN RESOLUTION ---");

    // Public guest scans QR token (Zero Auth Headers)
    const resPublicMenu = await apiCall("GET", `/api/public/menu/${tableQrToken}`);
    const menuData = resPublicMenu.json?.data;

    if (
      resPublicMenu.status === 200 &&
      menuData?.restaurant?.name === newRestName &&
      menuData?.table?.tableNumber === "T01" &&
      menuData?.items?.length >= 2
    ) {
      recordResult(
        9,
        "Customer Mobile Flow",
        "Scan QR Code & Resolve Digital Menu",
        `/api/public/menu/${tableQrToken}`,
        "GET",
        "PASS",
        `Resolved restaurant '${menuData.restaurant.name}', Table ${menuData.table.tableNumber}, ${menuData.items.length} items loaded without login`
      );
    } else {
      recordResult(
        9,
        "Customer Mobile Flow",
        "Scan QR Code & Resolve Digital Menu",
        `/api/public/menu/${tableQrToken}`,
        "GET",
        "FAIL",
        `Status ${resPublicMenu.status}: ${JSON.stringify(resPublicMenu.json)}`
      );
    }

    // Test invalid QR token handling
    const resInvalidQR = await apiCall("GET", "/api/public/menu/invalid_token_99999999");
    if (resInvalidQR.status === 400 || resInvalidQR.status === 404) {
      recordResult(
        10,
        "Customer Mobile Flow",
        "Invalid/Revoked QR Defense",
        "/api/public/menu/invalid_token_99999999",
        "GET",
        "PASS",
        `Rejected invalid QR code gracefully with HTTP ${resInvalidQR.status}`
      );
    } else {
      recordResult(
        10,
        "Customer Mobile Flow",
        "Invalid/Revoked QR Defense",
        "/api/public/menu/invalid_token_99999999",
        "GET",
        "FAIL",
        `Expected 400/404, got ${resInvalidQR.status}`
      );
    }

    // -------------------------------------------------------------------------
    // STEP 6: PLACE AN ORDER (IDEMPOTENCY & SERVER PRICE CALCULATION)
    // -------------------------------------------------------------------------
    console.log("\n--- STEP 6: CUSTOMER ORDER SUBMISSION & IDEMPOTENCY ---");

    const idempotencyKey = crypto.randomUUID();
    const orderPayload = {
      table_token: tableQrToken,
      customer_name: "Aarav Kapoor",
      customer_phone: "9876543210",
      special_notes: "Medium spicy please, extra butter on naan",
      idempotency_key: idempotencyKey,
      items: [
        { menu_item_id: itemId1, quantity: 2 }, // 2 * 380 = 760
        { menu_item_id: itemId2, quantity: 2 }, // 2 * 90 = 180
      ],
    };

    // 6.1 First Order Placement Attempt
    const resOrder1 = await apiCall("POST", "/api/public/orders", {}, orderPayload);
    const orderData = resOrder1.json?.data?.order;
    const trackingToken =
      resOrder1.json?.data?.tracking_token ||
      resOrder1.json?.data?.trackingToken ||
      orderData?.guest_tracking_token;
    const orderId = orderData?.id;

    // Expected subtotal: (2 * 38000) + (2 * 9000) = 76000 + 18000 = 94000 paise (₹940.00)
    // Plus 5% GST = 4700 paise -> Total: 98700 paise (₹987.00)
    if (
      resOrder1.status === 201 &&
      orderId &&
      trackingToken &&
      orderData.subtotal_paise === 94000 &&
      orderData.total_paise === 98700
    ) {
      recordResult(
        11,
        "Place an Order",
        "Server-Side Price Calculation",
        "/api/public/orders",
        "POST",
        "PASS",
        `Order #${orderData.order_number} created: Subtotal ₹940.00 + GST ₹47.00 = Total ₹987.00 (98700 paise)`
      );
    } else {
      recordResult(
        11,
        "Place an Order",
        "Server-Side Price Calculation",
        "/api/public/orders",
        "POST",
        "FAIL",
        `Status ${resOrder1.status}: Total paise: ${orderData?.total_paise}, Json: ${JSON.stringify(resOrder1.json)}`
      );
    }

    // 6.2 Duplicate Order Submission with Same Idempotency Key
    const resOrderDup = await apiCall("POST", "/api/public/orders", {}, orderPayload);
    if (
      (resOrderDup.status === 200 || resOrderDup.status === 201) &&
      resOrderDup.json?.data?.order?.id === orderId &&
      resOrderDup.json?.data?.isDuplicate === true
    ) {
      recordResult(
        12,
        "Place an Order",
        "Idempotency Protection (Zero Duplicates)",
        "/api/public/orders",
        "POST",
        "PASS",
        `Duplicate checkout with key '${idempotencyKey}' returned original Order #${orderData.order_number} (0 extra orders created)`
      );
    } else {
      recordResult(
        12,
        "Place an Order",
        "Idempotency Protection (Zero Duplicates)",
        "/api/public/orders",
        "POST",
        "FAIL",
        `Status: ${resOrderDup.status}, ID: ${resOrderDup.json?.data?.order?.id}`
      );
    }

    // -------------------------------------------------------------------------
    // STEP 7: ORDER PROCESSING (MANAGER & KITCHEN LIFECYCLE)
    // -------------------------------------------------------------------------
    console.log("\n--- STEP 7: ORDER LIFECYCLE & LIVE POLLING TRANSITIONS ---");

    // 7.1 Customer checks status via tracking token
    const resTrack1 = await apiCall("GET", `/api/public/orders/${trackingToken}`);
    if (resTrack1.status === 200 && resTrack1.json?.data?.order_status === "PENDING") {
      recordResult(
        13,
        "Order Processing",
        "Customer Live Tracking (PENDING)",
        `/api/public/orders/${trackingToken}`,
        "GET",
        "PASS",
        "Customer tracking screen polls order in status PENDING"
      );
    } else {
      recordResult(
        13,
        "Order Processing",
        "Customer Live Tracking (PENDING)",
        `/api/public/orders/${trackingToken}`,
        "GET",
        "FAIL",
        `Status: ${resTrack1.json?.data?.order_status}`
      );
    }

    // 7.2 Manager Accepts Order (PENDING -> ACCEPTED)
    const resAccept = await apiCall(
      "PATCH",
      `/api/restaurant/${newRestId}/orders/${orderId}/status`,
      managerHeaders,
      { status: "ACCEPTED" }
    );

    if (resAccept.status === 200 && resAccept.json?.data?.order_status === "ACCEPTED") {
      recordResult(
        14,
        "Order Processing",
        "Manager Accepts Order (PENDING -> ACCEPTED)",
        `/api/restaurant/${newRestId}/orders/${orderId}/status`,
        "PATCH",
        "PASS",
        "Order transitioned to ACCEPTED"
      );
    } else {
      recordResult(
        14,
        "Order Processing",
        "Manager Accepts Order (PENDING -> ACCEPTED)",
        `/api/restaurant/${newRestId}/orders/${orderId}/status`,
        "PATCH",
        "FAIL",
        `Status ${resAccept.status}: ${JSON.stringify(resAccept.json)}`
      );
    }

    // 7.3 Kitchen Chef Starts Preparation (ACCEPTED -> PREPARING)
    const resPrep = await apiCall(
      "PATCH",
      `/api/restaurant/${newRestId}/orders/${orderId}/status`,
      chefHeaders,
      { status: "PREPARING" }
    );

    if (resPrep.status === 200 && resPrep.json?.data?.order_status === "PREPARING") {
      recordResult(
        15,
        "Order Processing",
        "Kitchen Starts Prep (ACCEPTED -> PREPARING)",
        `/api/restaurant/${newRestId}/orders/${orderId}/status`,
        "PATCH",
        "PASS",
        "KDS ticket updated to PREPARING"
      );
    } else {
      recordResult(
        15,
        "Order Processing",
        "Kitchen Starts Prep (ACCEPTED -> PREPARING)",
        `/api/restaurant/${newRestId}/orders/${orderId}/status`,
        "PATCH",
        "FAIL",
        `Status ${resPrep.status}: ${JSON.stringify(resPrep.json)}`
      );
    }

    // 7.4 Kitchen Chef Marks Ready (PREPARING -> READY)
    const resReady = await apiCall(
      "PATCH",
      `/api/restaurant/${newRestId}/orders/${orderId}/status`,
      chefHeaders,
      { status: "READY" }
    );

    if (resReady.status === 200 && resReady.json?.data?.order_status === "READY") {
      recordResult(
        16,
        "Order Processing",
        "Kitchen Marks Ready (PREPARING -> READY)",
        `/api/restaurant/${newRestId}/orders/${orderId}/status`,
        "PATCH",
        "PASS",
        "Order marked READY for server delivery to Table T01"
      );
    } else {
      recordResult(
        16,
        "Order Processing",
        "Kitchen Marks Ready (PREPARING -> READY)",
        `/api/restaurant/${newRestId}/orders/${orderId}/status`,
        "PATCH",
        "FAIL",
        `Status ${resReady.status}: ${JSON.stringify(resReady.json)}`
      );
    }

    // Verify Customer sees READY via polling
    const resTrackReady = await apiCall("GET", `/api/public/orders/${trackingToken}`);
    if (resTrackReady.json?.data?.order_status === "READY") {
      recordResult(
        17,
        "Order Processing",
        "Customer Live Polls READY State",
        `/api/public/orders/${trackingToken}`,
        "GET",
        "PASS",
        "Customer screen received READY notification via HTTP polling"
      );
    } else {
      recordResult(
        17,
        "Order Processing",
        "Customer Live Polls READY State",
        `/api/public/orders/${trackingToken}`,
        "GET",
        "FAIL",
        `Status: ${resTrackReady.json?.data?.order_status}`
      );
    }

    // -------------------------------------------------------------------------
    // STEP 8: COMPLETE THE ORDER & SETTLE PAYMENT
    // -------------------------------------------------------------------------
    console.log("\n--- STEP 8: COMPLETION, PAYMENT & REPORTING REFLECTION ---");

    // 8.1 Settle Payment (UNPAID -> PAID)
    const resPayment = await apiCall(
      "PATCH",
      `/api/restaurant/${newRestId}/orders/${orderId}/payment`,
      managerHeaders,
      { payment_status: "PAID" }
    );

    if (resPayment.status === 200 && resPayment.json?.data?.payment_status === "PAID") {
      recordResult(
        18,
        "Complete the Order",
        "Settle Order Payment (UNPAID -> PAID)",
        `/api/restaurant/${newRestId}/orders/${orderId}/payment`,
        "PATCH",
        "PASS",
        "Payment marked as PAID via Cash/UPI settlement"
      );
    } else {
      recordResult(
        18,
        "Complete the Order",
        "Settle Order Payment (UNPAID -> PAID)",
        `/api/restaurant/${newRestId}/orders/${orderId}/payment`,
        "PATCH",
        "FAIL",
        `Status: ${resPayment.status}`
      );
    }

    // 8.2 Complete Order (READY -> COMPLETED)
    const resComplete = await apiCall(
      "PATCH",
      `/api/restaurant/${newRestId}/orders/${orderId}/status`,
      managerHeaders,
      { status: "COMPLETED" }
    );

    if (resComplete.status === 200 && resComplete.json?.data?.order_status === "COMPLETED") {
      recordResult(
        19,
        "Complete the Order",
        "Complete Order Lifecycle (READY -> COMPLETED)",
        `/api/restaurant/${newRestId}/orders/${orderId}/status`,
        "PATCH",
        "PASS",
        "Order fulfilled and marked COMPLETED"
      );
    } else {
      recordResult(
        19,
        "Complete the Order",
        "Complete Order Lifecycle (READY -> COMPLETED)",
        `/api/restaurant/${newRestId}/orders/${orderId}/status`,
        "PATCH",
        "FAIL",
        `Status ${resComplete.status}: ${JSON.stringify(resComplete.json)}`
      );
    }

    // 8.3 Verify Daily Sales Reports Reflect New Order
    const resReport = await apiCall("GET", `/api/restaurant/${newRestId}/reports/daily`, ownerHeaders);
    const metrics = resReport.json?.data?.metrics;
    const completedOrders = metrics?.completedOrders ?? metrics?.completed_orders ?? 0;
    const totalRevPaise = metrics?.totalRevenuePaise ?? metrics?.total_revenue_paise ?? 0;

    if (resReport.status === 200 && completedOrders >= 1 && totalRevPaise >= 98700) {
      recordResult(
        20,
        "Complete the Order",
        "Daily Financial Report Aggregation",
        `/api/restaurant/${newRestId}/reports/daily`,
        "GET",
        "PASS",
        `Report updated: Completed Orders: ${completedOrders}, Gross Revenue: ₹${(totalRevPaise / 100).toFixed(2)}`
      );
    } else {
      recordResult(
        20,
        "Complete the Order",
        "Daily Financial Report Aggregation",
        `/api/restaurant/${newRestId}/reports/daily`,
        "GET",
        "FAIL",
        `Metrics: ${JSON.stringify(metrics)}`
      );
    }

    // -------------------------------------------------------------------------
    // FINAL CHECKS: SECURITY, MULTI-TENANCY & STATE MACHINE DEFENSE
    // -------------------------------------------------------------------------
    console.log("\n--- FINAL CHECKS: MULTI-TENANCY, RBAC & IMMUTABILITY DEFENSE ---");

    // Check 1: Tenant Isolation
    // Owner of Spice Symphony Bistro tries to access The Royal Biryani House orders
    const royalBiryaniId = "7f26e99e-98cd-43bc-ba56-60608726ab21";
    const resTenantBreach = await apiCall("GET", `/api/restaurant/${royalBiryaniId}/orders`, ownerHeaders);

    if (resTenantBreach.status === 403 || resTenantBreach.status === 401) {
      recordResult(
        21,
        "Final Checks",
        "Strict Multi-Tenant Cross-Access Block",
        `/api/restaurant/${royalBiryaniId}/orders`,
        "GET",
        "PASS",
        `Blocked cross-tenant access with HTTP ${resTenantBreach.status} Forbidden`
      );
    } else {
      recordResult(
        21,
        "Final Checks",
        "Strict Multi-Tenant Cross-Access Block",
        `/api/restaurant/${royalBiryaniId}/orders`,
        "GET",
        "FAIL",
        `Expected 403/401, got ${resTenantBreach.status}`
      );
    }

    // Check 2: State Machine Immutability
    // Attempting to revert a COMPLETED order back to PENDING
    const resIllegalRevert = await apiCall(
      "PATCH",
      `/api/restaurant/${newRestId}/orders/${orderId}/status`,
      managerHeaders,
      { status: "PENDING" }
    );

    if (resIllegalRevert.status === 409 || resIllegalRevert.status === 400) {
      recordResult(
        22,
        "Final Checks",
        "Illegal State Machine Transition Block",
        `/api/restaurant/${newRestId}/orders/${orderId}/status`,
        "PATCH",
        "PASS",
        `Blocked invalid status reversion (COMPLETED -> PENDING) with HTTP ${resIllegalRevert.status}`
      );
    } else {
      recordResult(
        22,
        "Final Checks",
        "Illegal State Machine Transition Block",
        `/api/restaurant/${newRestId}/orders/${orderId}/status`,
        "PATCH",
        "FAIL",
        `Expected 409 Conflict, got ${resIllegalRevert.status}`
      );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("FATAL RUNNER ERROR:", message);
  }

  // Print Summary Table
  console.log("\n=========================================================================");
  console.log("📊 FINAL VERIFICATION CHECKLIST & PASS / FAIL REPORT");
  console.log("=========================================================================");
  console.table(
    checklist.map((c) => ({
      Step: c.id,
      Category: c.category,
      Test: c.name,
      Status: c.status,
      Details: c.details.slice(0, 70),
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

runFullE2ESaaSVerification();
