import { createClient } from "@supabase/supabase-js";
import { getRestaurantOrders } from "../src/services/order.service";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const restId = "b8221719-a49f-4a45-bc74-b3fb39f45f70";
  console.log(`Checking restaurant: ${restId}`);

  // 1. Check if restaurant exists
  const { data: rest, error: restErr } = await supabaseAdmin
    .from("restaurants")
    .select("id, name, slug, status")
    .eq("id", restId)
    .maybeSingle();

  console.log("Restaurant:", rest || restErr);

  // 2. Check orders directly in DB for this restaurant
  const { data: rawOrders, error: ordersErr } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, order_status, payment_status, total_paise, created_at, table_id")
    .eq("restaurant_id", restId);

  console.log(`Raw orders in DB count: ${rawOrders?.length || 0}`);
  console.log("Raw orders:", rawOrders || ordersErr);

  // 3. Call getRestaurantOrders service
  try {
    const serviceResult = await getRestaurantOrders(restId, { page: 1, limit: 20 });
    console.log("Service result orders count:", serviceResult.orders.length);
    if (serviceResult.orders.length > 0) {
      console.log("First order keys:", Object.keys(serviceResult.orders[0]));
      console.log("First order sample:", JSON.stringify(serviceResult.orders[0], null, 2));
    }
  } catch (e: any) {
    console.error("Service error:", e.message);
  }
}

main().catch(console.error);
