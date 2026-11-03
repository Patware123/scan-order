/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import crypto from "crypto";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const supabaseAuthClient = createClient<Database>(supabaseUrl, anonKey);

interface TestReportResult {
  step: string;
  endpoint: string;
  method: string;
  status: "PASSED" | "FAILED";
  httpStatus: number;
  details: string;
  curl: string;
}

const testResults: TestReportResult[] = [];

async function runTest(
  step: string,
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: unknown
): Promise<{ status: number; json: any; curl: string }> {
  const url = `${baseUrl}${path}`;
  const curlHeaders = Object.entries(headers)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(" ");

  const curlBody = body ? `-d '${JSON.stringify(body)}'` : "";
  const curlCmd = `curl -X ${method} "${url}" ${curlHeaders} ${curlBody}`.trim();

  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    return { status: res.status, json, curl: curlCmd };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 500, json: { error: message }, curl: curlCmd };
  }
}

export async function runFullVerificationSuite() {
  console.log("=================================================================");
  console.log("🚀 STARTING SCANORDER END-TO-END BACKEND API VERIFICATION SUITE");
  console.log(`Target: ${baseUrl}`);
  console.log("=================================================================\n");

  // Step 0: Ensure tables exist
  const { error: restErr } = await supabaseAdmin.from("restaurants").select("id, slug").limit(1);
  if (restErr) {
    console.error("❌ CRITICAL: Supabase tables are not created yet!");
    process.exit(1);
  }

  // Fetch sample restaurant, table token and menu item for tests
  const { data: restaurant } = await supabaseAdmin.from("restaurants").select("id, name, slug").eq("slug", "royal-biryani").single();
  const restId = restaurant?.id || "";

  const { data: qrRecord } = await supabaseAdmin.from("table_qr_tokens").select("token, table_id").eq("restaurant_id", restId).eq("is_revoked", false).limit(1).single();
  const tableToken = qrRecord?.token || "";

  const { data: menuItems } = await supabaseAdmin.from("menu_items").select("id, name, price_paise").eq("restaurant_id", restId).limit(2);
  const item1 = menuItems?.[0];
  const item2 = menuItems?.[1];

  // Authenticate as Restaurant Manager
  console.log("Authenticating Manager account...");
  const { data: authData, error: authError } = await supabaseAuthClient.auth.signInWithPassword({
    email: "manager.royal@restaurant.com",
    password: "Password123!",
  });

  const staffToken = authData?.session?.access_token || "";
  if (!staffToken) {
    console.warn("Could not obtain staff token:", authError?.message);
  } else {
    console.log("✅ Authenticated as Manager (Token obtained)");
  }

  const staffHeaders = {
    Authorization: `Bearer ${staffToken}`,
  };

  // 1. HEALTH CHECK
  console.log("TEST 1: Healthcheck Endpoint");
  const r1 = await runTest("Health Check", "GET", "/api/health", {});
  testResults.push({
    step: "System Health",
    endpoint: "/api/health",
    method: "GET",
    status: r1.status === 200 && r1.json?.status === "ok" ? "PASSED" : "FAILED",
    httpStatus: r1.status,
    details: `Response: ${JSON.stringify(r1.json)}`,
    curl: r1.curl,
  });

  // 2. PUBLIC MENU RESOLUTION VIA QR TOKEN
  console.log("TEST 2: Public Digital Menu Resolver");
  const r2 = await runTest("Public Menu Resolver", "GET", `/api/public/menu/${tableToken}`, {});
  const menuPassed = r2.status === 200 && r2.json?.success === true && Array.isArray(r2.json?.data?.items);
  testResults.push({
    step: "Customer QR Scan & Menu Fetch",
    endpoint: `/api/public/menu/${tableToken}`,
    method: "GET",
    status: menuPassed ? "PASSED" : "FAILED",
    httpStatus: r2.status,
    details: menuPassed ? `Loaded ${r2.json.data.items.length} items & branding` : JSON.stringify(r2.json),
    curl: r2.curl,
  });

  // 3. CUSTOMER CHECKOUT (IDEMPOTENT & INTEGER PAISE)
  console.log("TEST 3: Customer Order Placement");
  const testIdempotencyKey = crypto.randomUUID();
  const orderPayload = {
    tableToken,
    idempotencyKey: testIdempotencyKey,
    items: [
      { menuItemId: item1?.id, quantity: 2 },
      { menuItemId: item2?.id, quantity: 1 },
    ],
    specialInstructions: "Verification test order - less spice",
  };

  const r3 = await runTest("Create Order", "POST", "/api/public/orders", {}, orderPayload);
  const orderCreated = r3.status === 201 && r3.json?.success === true;
  const createdOrderId = r3.json?.data?.order?.id;
  const guestTrackingToken = r3.json?.data?.order?.guest_tracking_token;
  const totalPaise = r3.json?.data?.order?.total_paise;

  testResults.push({
    step: "Customer Order Checkout",
    endpoint: "/api/public/orders",
    method: "POST",
    status: orderCreated ? "PASSED" : "FAILED",
    httpStatus: r3.status,
    details: orderCreated ? `Order created: ${r3.json.data.order.order_number}, Total: ${totalPaise} paise` : JSON.stringify(r3.json),
    curl: r3.curl,
  });

  // 4. IDEMPOTENCY RETRY TEST
  console.log("TEST 4: Idempotent Duplicate Submission Test");
  const r4 = await runTest("Duplicate Order Retry", "POST", "/api/public/orders", {}, orderPayload);
  const idempotencyPassed = r4.status === 200 && r4.json?.data?.isDuplicate === true && r4.json?.data?.order?.id === createdOrderId;
  testResults.push({
    step: "Idempotency Protection (Duplicate Checkout)",
    endpoint: "/api/public/orders",
    method: "POST",
    status: idempotencyPassed ? "PASSED" : "FAILED",
    httpStatus: r4.status,
    details: idempotencyPassed ? "Safely returned original order with isDuplicate=true" : JSON.stringify(r4.json),
    curl: r4.curl,
  });

  // 5. GUEST ORDER TRACKING
  console.log("TEST 5: Guest Order Status Tracking");
  const r5 = await runTest("Track Guest Order", "GET", `/api/public/orders/${guestTrackingToken}`, {});
  const trackingPassed = r5.status === 200 && r5.json?.data?.id === createdOrderId;
  testResults.push({
    step: "Guest Order Status Polling",
    endpoint: `/api/public/orders/${guestTrackingToken}`,
    method: "GET",
    status: trackingPassed ? "PASSED" : "FAILED",
    httpStatus: r5.status,
    details: trackingPassed ? `Order tracking active: Status is ${r5.json.data.order_status}` : JSON.stringify(r5.json),
    curl: r5.curl,
  });

  // 6. PRICE TAMPERING DEFENSE
  console.log("TEST 6: Price Tampering Defense");
  const tamperingPayload = {
    tableToken,
    idempotencyKey: crypto.randomUUID(),
    items: [{ menuItemId: item1?.id, quantity: 1, tamperedPricePaise: 100 }], // Attempt ₹1.00
  };
  const r6 = await runTest("Price Tampering Test", "POST", "/api/public/orders", {}, tamperingPayload);
  const tamperingDefended = r6.status === 201 && r6.json?.data?.order?.subtotal_paise === item1?.price_paise;
  testResults.push({
    step: "Price Tampering Defense",
    endpoint: "/api/public/orders",
    method: "POST",
    status: tamperingDefended ? "PASSED" : "FAILED",
    httpStatus: r6.status,
    details: tamperingDefended ? `Backend enforced DB price (${item1?.price_paise} paise) and ignored client override` : JSON.stringify(r6.json),
    curl: r6.curl,
  });

  // 7. ORDER POLLING & LISTING (WITH AUTH)
  console.log("TEST 7: Staff Order Queue Polling");
  const r7 = await runTest("Poll Active Orders", "GET", `/api/restaurant/${restId}/orders?status=PENDING&limit=10`, staffHeaders);
  const pollingPassed = r7.status === 200 && r7.json?.success === true && Array.isArray(r7.json?.data);
  testResults.push({
    step: "Staff Orders Polling",
    endpoint: `/api/restaurant/${restId}/orders`,
    method: "GET",
    status: pollingPassed ? "PASSED" : "FAILED",
    httpStatus: r7.status,
    details: pollingPassed ? `Retrieved ${r7.json.data.length} orders with pagination metadata` : JSON.stringify(r7.json),
    curl: r7.curl,
  });

  // 8. ORDER LIFECYCLE: ACCEPT ORDER
  console.log("TEST 8: Order Status Transition -> ACCEPTED");
  const r8 = await runTest("Accept Order", "PATCH", `/api/restaurant/${restId}/orders/${createdOrderId}/status`, staffHeaders, {
    status: "ACCEPTED",
    note: "Manager accepted order",
  });
  const acceptPassed = r8.status === 200 && r8.json?.data?.order_status === "ACCEPTED";
  testResults.push({
    step: "Order Transition: PENDING -> ACCEPTED",
    endpoint: `/api/restaurant/${restId}/orders/${createdOrderId}/status`,
    method: "PATCH",
    status: acceptPassed ? "PASSED" : "FAILED",
    httpStatus: r8.status,
    details: acceptPassed ? "Order status successfully advanced to ACCEPTED" : JSON.stringify(r8.json),
    curl: r8.curl,
  });

  // 9. KITCHEN: START PREPARATION
  console.log("TEST 9: Order Status Transition -> PREPARING");
  const r9 = await runTest("Start Cooking", "PATCH", `/api/restaurant/${restId}/orders/${createdOrderId}/status`, staffHeaders, {
    status: "PREPARING",
    note: "Chef started tandoor cooking",
  });
  const prepPassed = r9.status === 200 && r9.json?.data?.order_status === "PREPARING";
  testResults.push({
    step: "Order Transition: ACCEPTED -> PREPARING",
    endpoint: `/api/restaurant/${restId}/orders/${createdOrderId}/status`,
    method: "PATCH",
    status: prepPassed ? "PASSED" : "FAILED",
    httpStatus: r9.status,
    details: prepPassed ? "Order status successfully advanced to PREPARING" : JSON.stringify(r9.json),
    curl: r9.curl,
  });

  // 10. KITCHEN: MARK READY
  console.log("TEST 10: Order Status Transition -> READY");
  const r10 = await runTest("Mark Ready", "PATCH", `/api/restaurant/${restId}/orders/${createdOrderId}/status`, staffHeaders, {
    status: "READY",
    note: "Plated and ready for pickup",
  });
  const readyPassed = r10.status === 200 && r10.json?.data?.order_status === "READY";
  testResults.push({
    step: "Order Transition: PREPARING -> READY",
    endpoint: `/api/restaurant/${restId}/orders/${createdOrderId}/status`,
    method: "PATCH",
    status: readyPassed ? "PASSED" : "FAILED",
    httpStatus: r10.status,
    details: readyPassed ? "Order status successfully advanced to READY" : JSON.stringify(r10.json),
    curl: r10.curl,
  });

  // 11. COMPLETE ORDER
  console.log("TEST 11: Order Status Transition -> COMPLETED");
  const r11 = await runTest("Complete Order", "PATCH", `/api/restaurant/${restId}/orders/${createdOrderId}/status`, staffHeaders, {
    status: "COMPLETED",
    note: "Served to table",
  });
  const completedPassed = r11.status === 200 && r11.json?.data?.order_status === "COMPLETED";
  testResults.push({
    step: "Order Transition: READY -> COMPLETED",
    endpoint: `/api/restaurant/${restId}/orders/${createdOrderId}/status`,
    method: "PATCH",
    status: completedPassed ? "PASSED" : "FAILED",
    httpStatus: r11.status,
    details: completedPassed ? "Order status successfully marked COMPLETED" : JSON.stringify(r11.json),
    curl: r11.curl,
  });

  // 12. ILLEGAL STATE TRANSITION DEFENSE
  console.log("TEST 12: Illegal State Machine Transition Defense");
  const r12 = await runTest("Illegal Transition", "PATCH", `/api/restaurant/${restId}/orders/${createdOrderId}/status`, staffHeaders, {
    status: "PENDING", // Cannot move COMPLETED back to PENDING!
  });
  const illegalDefended = r12.status === 409 || r12.status === 400;
  testResults.push({
    step: "Illegal State Machine Transition Block",
    endpoint: `/api/restaurant/${restId}/orders/${createdOrderId}/status`,
    method: "PATCH",
    status: illegalDefended ? "PASSED" : "FAILED",
    httpStatus: r12.status,
    details: illegalDefended ? "State machine strictly rejected illegal backward transition" : JSON.stringify(r12.json),
    curl: r12.curl,
  });

  // 13. PAYMENT STATUS UPDATE (COUNTER WORKFLOW)
  console.log("TEST 13: Payment Status Update -> PAID");
  const r13 = await runTest("Mark Paid", "PATCH", `/api/restaurant/${restId}/orders/${createdOrderId}/payment`, staffHeaders, {
    paymentStatus: "PAID",
  });
  const paidPassed = r13.status === 200 && r13.json?.data?.payment_status === "PAID";
  testResults.push({
    step: "Payment Status Update (UNPAID -> PAID)",
    endpoint: `/api/restaurant/${restId}/orders/${createdOrderId}/payment`,
    method: "PATCH",
    status: paidPassed ? "PASSED" : "FAILED",
    httpStatus: r13.status,
    details: paidPassed ? "Payment updated to PAID" : JSON.stringify(r13.json),
    curl: r13.curl,
  });

  // 14. DAILY SALES REPORT
  console.log("TEST 14: Daily Reports Aggregation");
  const r14 = await runTest("Daily Report", "GET", `/api/restaurant/${restId}/reports/daily`, staffHeaders);
  const reportPassed = r14.status === 200 && r14.json?.success === true && typeof r14.json?.data?.metrics?.totalRevenuePaise === "number";
  testResults.push({
    step: "Daily Sales & Metrics Aggregation",
    endpoint: `/api/restaurant/${restId}/reports/daily`,
    method: "GET",
    status: reportPassed ? "PASSED" : "FAILED",
    httpStatus: r14.status,
    details: reportPassed ? `Report generated: ${r14.json.data.metrics.completedOrders} completed, ₹${r14.json.data.metrics.totalRevenuePaise / 100} revenue` : JSON.stringify(r14.json),
    curl: r14.curl,
  });

  // 15. TOP SELLING ITEMS REPORT
  console.log("TEST 15: Top Selling Items Aggregation");
  const r15 = await runTest("Top Selling Items", "GET", `/api/restaurant/${restId}/reports/top-items?limit=5`, staffHeaders);
  const topItemsPassed = r15.status === 200 && r15.json?.success === true && Array.isArray(r15.json?.data);
  testResults.push({
    step: "Top Selling Items Report",
    endpoint: `/api/restaurant/${restId}/reports/top-items`,
    method: "GET",
    status: topItemsPassed ? "PASSED" : "FAILED",
    httpStatus: r15.status,
    details: topItemsPassed ? `Aggregated ${r15.json.data.length} top dishes` : JSON.stringify(r15.json),
    curl: r15.curl,
  });

  // PRINT SUMMARY TABLE
  console.log("\n=================================================================");
  console.log("📊 API VERIFICATION RESULTS & PASS/FAIL SUMMARY");
  console.log("=================================================================");
  console.table(
    testResults.map((t) => ({
      Step: t.step,
      Method: t.method,
      Endpoint: t.endpoint,
      HTTP: t.httpStatus,
      Result: t.status,
    }))
  );

  const passedCount = testResults.filter((t) => t.status === "PASSED").length;
  const failedCount = testResults.filter((t) => t.status === "FAILED").length;
  console.log(`TOTAL TESTS: ${testResults.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log("=================================================================\n");

  return testResults;
}

if (require.main === module) {
  runFullVerificationSuite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Verification suite failure:", err);
      process.exit(1);
    });
}
