import { createAdminClient } from "@/lib/supabase/admin";
import { BadRequestError } from "@/lib/utils/errors";

export async function getDailyReport(restaurantId: string, dateStr?: string) {
  const adminClient = createAdminClient();

  // Determine date boundaries in Asia/Kolkata (IST: UTC+05:30)
  const now = dateStr ? new Date(dateStr) : new Date();
  
  // Format YYYY-MM-DD in Asia/Kolkata
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayIST = formatter.format(now); // e.g. "2026-11-05"

  // Start of day in IST is today at 00:00:00 IST -> convert to UTC ISO
  const startOfDay = new Date(`${todayIST}T00:00:00.000+05:30`);
  const endOfDay = new Date(`${todayIST}T23:59:59.999+05:30`);

  // Fetch orders for this day (excluding soft-deleted)
  const { data: orders, error } = await adminClient
    .from("orders")
    .select("id, order_number, order_status, payment_status, total_paise, subtotal_paise, tax_paise, created_at")
    .eq("restaurant_id", restaurantId)
    .neq("is_archived", true)
    .gte("created_at", startOfDay.toISOString())
    .lte("created_at", endOfDay.toISOString());

  if (error) {
    throw new BadRequestError(`Failed to generate daily report: ${error.message}`);
  }

  const allOrders = ((orders || []) as Record<string, unknown>[]);
  const completedOrders = allOrders.filter((o) => o.order_status === "COMPLETED");
  const cancelledOrders = allOrders.filter(
    (o) => o.order_status === "CANCELLED" || o.order_status === "REJECTED"
  );
  const activeOrders = allOrders.filter(
    (o) =>
      o.order_status === "PENDING" ||
      o.order_status === "ACCEPTED" ||
      o.order_status === "PREPARING" ||
      o.order_status === "READY"
  );
  const paidOrders = allOrders.filter((o) => o.payment_status === "PAID");

  const totalRevenuePaise = completedOrders.reduce((sum, o) => sum + Number(o.total_paise || 0), 0);
  const paidRevenuePaise = paidOrders.reduce((sum, o) => sum + Number(o.total_paise || 0), 0);
  const averageOrderValuePaise =
    completedOrders.length > 0 ? Math.round(totalRevenuePaise / completedOrders.length) : 0;

  // Compute hourly breakdown for today
  const hourlyBreakdown: Record<string, { order_count: number; revenue_paise: number }> = {};
  for (let h = 0; h < 24; h++) {
    const hourKey = `${h.toString().padStart(2, "0")}:00`;
    hourlyBreakdown[hourKey] = { order_count: 0, revenue_paise: 0 };
  }

  for (const o of allOrders) {
    if (o.created_at) {
      const orderDate = new Date(String(o.created_at));
      const istHour = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        hour12: false,
      }).format(orderDate);
      const key = `${istHour.padStart(2, "0")}:00`;
      if (hourlyBreakdown[key]) {
        hourlyBreakdown[key].order_count += 1;
        if (o.order_status === "COMPLETED") {
          hourlyBreakdown[key].revenue_paise += Number(o.total_paise || 0);
        }
      }
    }
  }

  const metrics = {
    totalOrders: allOrders.length,
    total_orders: allOrders.length,
    completedOrders: completedOrders.length,
    completed_orders: completedOrders.length,
    cancelledOrders: cancelledOrders.length,
    cancelled_orders: cancelledOrders.length,
    activeOrders: activeOrders.length,
    active_orders: activeOrders.length,
    totalRevenuePaise,
    total_revenue_paise: totalRevenuePaise,
    total_revenue_rupees: Math.round(totalRevenuePaise / 100),
    paidRevenuePaise,
    paid_revenue_paise: paidRevenuePaise,
    averageOrderValuePaise,
    average_order_value_paise: averageOrderValuePaise,
    average_order_value_rupees: Math.round(averageOrderValuePaise / 100),
  };

  return {
    date: todayIST,
    timezone: "Asia/Kolkata",
    metrics,
    hourly_breakdown: hourlyBreakdown,
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
    .eq("order_status", "COMPLETED")
    .neq("is_archived", true);

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
    .neq("is_archived", true)
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

export const getDailyReports = getDailyReport;
