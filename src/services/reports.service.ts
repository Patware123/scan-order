import { createAdminClient } from "@/lib/supabase/admin";
import { BadRequestError } from "@/lib/utils/errors";

export async function getDailyReport(restaurantId: string, dateStr?: string) {
  const adminClient = createAdminClient();

  const targetDate = dateStr ? new Date(dateStr) : new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch orders for this day
  const { data: orders, error } = await adminClient
    .from("orders")
    .select("id, order_status, payment_status, total_paise, subtotal_paise, tax_paise")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", startOfDay.toISOString())
    .lte("created_at", endOfDay.toISOString());

  if (error) {
    throw new BadRequestError(`Failed to generate daily report: ${error.message}`);
  }

  const allOrders = ((orders || []) as Record<string, unknown>[]);
  const completedOrders = allOrders.filter((o) => o.order_status === "COMPLETED");
  const cancelledOrders = allOrders.filter((o) => o.order_status === "CANCELLED");
  const rejectedOrders = allOrders.filter((o) => o.order_status === "REJECTED");
  const paidOrders = allOrders.filter((o) => o.payment_status === "PAID");

  const totalRevenuePaise = completedOrders.reduce((sum, o) => sum + Number(o.total_paise || 0), 0);
  const paidRevenuePaise = paidOrders.reduce((sum, o) => sum + Number(o.total_paise || 0), 0);

  return {
    date: startOfDay.toISOString().slice(0, 10),
    metrics: {
      totalOrders: allOrders.length,
      completedOrders: completedOrders.length,
      cancelledOrders: cancelledOrders.length,
      rejectedOrders: rejectedOrders.length,
      totalRevenuePaise,
      paidRevenuePaise,
      averageOrderValuePaise:
        completedOrders.length > 0 ? Math.round(totalRevenuePaise / completedOrders.length) : 0,
    },
  };
}

export async function getTopSellingItems(
  restaurantId: string,
  limit = 10,
  startDateStr?: string,
  endDateStr?: string
) {
  const adminClient = createAdminClient();

  let query = adminClient
    .from("orders")
    .select(`
      id,
      order_items (
        item_name_snapshot,
        unit_price_paise,
        quantity,
        line_total_paise
      )
    `)
    .eq("restaurant_id", restaurantId)
    .eq("order_status", "COMPLETED");

  if (startDateStr) query = query.gte("created_at", startDateStr);
  if (endDateStr) query = query.lte("created_at", endDateStr);

  const { data, error } = await query;
  if (error) {
    throw new BadRequestError(`Failed to fetch top selling items: ${error.message}`);
  }

  const aggregates = new Map<
    string,
    { itemName: string; totalQuantity: number; totalRevenuePaise: number }
  >();

  for (const order of (data || []) as Record<string, unknown>[]) {
    const items = (order.order_items || []) as {
      item_name_snapshot: string;
      unit_price_paise: number;
      quantity: number;
      line_total_paise: number;
    }[];

    for (const item of items) {
      const existing = aggregates.get(item.item_name_snapshot) || {
        itemName: item.item_name_snapshot,
        totalQuantity: 0,
        totalRevenuePaise: 0,
      };

      existing.totalQuantity += item.quantity;
      existing.totalRevenuePaise += item.line_total_paise;
      aggregates.set(item.item_name_snapshot, existing);
    }
  }

  const sorted = Array.from(aggregates.values())
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, limit);

  return sorted.map((s, idx) => ({
    menu_item_id: s.itemName || `dish-${idx}`,
    item_name: s.itemName,
    itemName: s.itemName,
    total_quantity: s.totalQuantity,
    totalQuantity: s.totalQuantity,
    total_revenue_paise: s.totalRevenuePaise,
    totalRevenuePaise: s.totalRevenuePaise,
    total_revenue_rupees: Math.round(s.totalRevenuePaise / 100),
  }));
}

export async function getReportsRange(
  restaurantId: string,
  startDateStr: string,
  endDateStr: string
) {
  const adminClient = createAdminClient();

  const { data: orders, error } = await adminClient
    .from("orders")
    .select("created_at, order_status, total_paise")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", startDateStr)
    .lte("created_at", endDateStr);

  if (error) {
    throw new BadRequestError(`Failed to fetch range report: ${error.message}`);
  }

  const dailyBuckets = new Map<
    string,
    { date: string; ordersCount: number; revenuePaise: number }
  >();

  for (const o of (orders || []) as Record<string, unknown>[]) {
    const createdAtStr = String(o.created_at || "");
    const day = createdAtStr.slice(0, 10);
    const bucket = dailyBuckets.get(day) || {
      date: day,
      ordersCount: 0,
      revenuePaise: 0,
    };

    bucket.ordersCount += 1;
    if (o.order_status === "COMPLETED") {
      bucket.revenuePaise += Number(o.total_paise || 0);
    }
    dailyBuckets.set(day, bucket);
  }

  return Array.from(dailyBuckets.values()).sort((a, b) => a.date.localeCompare(b.date));
}
