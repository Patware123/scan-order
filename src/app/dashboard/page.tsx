"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingBag,
  TrendingUp,
  Clock,
  CheckCircle2,
  ChefHat,
  QrCode,
  UtensilsCrossed,
  ArrowUpRight,
  Flame,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { restaurantApi } from "@/services/api/restaurant.api";
import { formatPaiseToINR } from "@/lib/utils/currency";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardOverviewPage() {
  const router = useRouter();
  const { activeRestaurantId, activeRestaurant } = useAuth();

  // Fetch daily reports
  const { data: dailyReport, isLoading: isReportLoading } = useQuery({
    queryKey: ["dailyReport", activeRestaurantId],
    queryFn: () => (activeRestaurantId ? restaurantApi.getDailyReports(activeRestaurantId) : null),
    enabled: !!activeRestaurantId,
    refetchInterval: 15000,
  });

  // Fetch recent orders
  const { data: recentOrders, isLoading: isOrdersLoading } = useQuery({
    queryKey: ["recentOrders", activeRestaurantId],
    queryFn: () => (activeRestaurantId ? restaurantApi.getOrders(activeRestaurantId) : null),
    enabled: !!activeRestaurantId,
    refetchInterval: 10000,
  });

  // Fetch top selling items
  const { data: topItems } = useQuery({
    queryKey: ["topItems", activeRestaurantId],
    queryFn: () => (activeRestaurantId ? restaurantApi.getTopSellingItems(activeRestaurantId, 5) : null),
    enabled: !!activeRestaurantId,
  });

  if (!activeRestaurantId) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-[#E7E1D8] p-8">
        <h2 className="text-lg font-bold text-[#29241F]">No Active Restaurant</h2>
        <p className="text-xs sm:text-sm text-[#78716C] mt-1 max-w-sm mx-auto">
          You are not currently linked to an active restaurant tenant. Please contact support or your restaurant owner.
        </p>
      </div>
    );
  }

  const metrics = dailyReport?.metrics;
  const activeCount = recentOrders?.filter(
    (o) => o.order_status !== "COMPLETED" && o.order_status !== "CANCELLED" && o.order_status !== "REJECTED"
  ).length || 0;

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#78716C] font-semibold">
            Operational Dashboard
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#29241F]">
            {activeRestaurant?.name || "Restaurant Overview"}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => router.push("/dashboard/kitchen")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#783F24] text-white text-xs sm:text-sm font-semibold hover:bg-[#63331D] shadow-xs cursor-pointer"
          >
            <ChefHat className="h-4 w-4" />
            <span>Open KDS</span>
          </button>
          <button
            onClick={() => router.push("/dashboard/orders")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E7E1D8] bg-white text-xs sm:text-sm font-semibold text-[#29241F] hover:bg-[#FAF8F4] cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Live Queue ({activeCount})</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Gross Revenue */}
        <Card>
          <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between pb-2">
            <span className="text-2xs sm:text-xs font-semibold text-[#78716C] uppercase tracking-wider">
              Gross Revenue (Today)
            </span>
            <div className="h-8 w-8 rounded-xl bg-[#557A52]/10 text-[#557A52] flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            {isReportLoading ? (
              <Skeleton className="h-8 w-28 rounded-lg" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold text-[#29241F]">
                {formatPaiseToINR(metrics?.total_revenue_paise || 0)}
              </div>
            )}
            <p className="text-3xs sm:text-2xs text-[#78716C] mt-1">
              Avg Order: {formatPaiseToINR((metrics?.average_order_value_rupees || 0) * 100)}
            </p>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card>
          <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between pb-2">
            <span className="text-2xs sm:text-xs font-semibold text-[#78716C] uppercase tracking-wider">
              Total Orders
            </span>
            <div className="h-8 w-8 rounded-xl bg-[#783F24]/10 text-[#783F24] flex items-center justify-center">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            {isReportLoading ? (
              <Skeleton className="h-8 w-16 rounded-lg" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold text-[#29241F]">
                {metrics?.total_orders || 0}
              </div>
            )}
            <p className="text-3xs sm:text-2xs text-[#557A52] mt-1 font-medium">
              {metrics?.completed_orders || 0} Completed
            </p>
          </CardContent>
        </Card>

        {/* Active In-Flight Orders */}
        <Card>
          <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between pb-2">
            <span className="text-2xs sm:text-xs font-semibold text-[#78716C] uppercase tracking-wider">
              Active Orders
            </span>
            <div className="h-8 w-8 rounded-xl bg-[#B77932]/10 text-[#B77932] flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            {isOrdersLoading ? (
              <Skeleton className="h-8 w-16 rounded-lg" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold text-[#B77932]">
                {activeCount}
              </div>
            )}
            <p className="text-3xs sm:text-2xs text-[#78716C] mt-1">
              In Kitchen / Awaiting Pickup
            </p>
          </CardContent>
        </Card>

        {/* Completed Rate */}
        <Card>
          <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between pb-2">
            <span className="text-2xs sm:text-xs font-semibold text-[#78716C] uppercase tracking-wider">
              Fulfilled
            </span>
            <div className="h-8 w-8 rounded-xl bg-[#C58B45]/15 text-[#C58B45] flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            {isReportLoading ? (
              <Skeleton className="h-8 w-16 rounded-lg" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold text-[#29241F]">
                {metrics?.completed_orders || 0}
              </div>
            )}
            <p className="text-3xs sm:text-2xs text-[#78716C] mt-1">
              {metrics?.cancelled_orders || 0} Cancelled / Rejected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <button
          onClick={() => router.push("/dashboard/orders")}
          className="text-left p-4 sm:p-5 rounded-2xl bg-white border border-[#E7E1D8] hover:border-[#783F24]/40 hover:shadow-xs transition-all flex items-center justify-between cursor-pointer"
        >
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#29241F]">Process Orders</h3>
            <p className="text-xs text-[#78716C]">
              Accept, prepare, and complete customer orders
            </p>
          </div>
          <ArrowUpRight className="h-5 w-5 text-[#783F24]" />
        </button>

        <button
          onClick={() => router.push("/dashboard/tables")}
          className="text-left p-4 sm:p-5 rounded-2xl bg-white border border-[#E7E1D8] hover:border-[#783F24]/40 hover:shadow-xs transition-all flex items-center justify-between cursor-pointer"
        >
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#29241F]">Table QR Codes</h3>
            <p className="text-xs text-[#78716C]">
              Generate, print tent-cards and manage tables
            </p>
          </div>
          <QrCode className="h-5 w-5 text-[#783F24]" />
        </button>

        <button
          onClick={() => router.push("/dashboard/menu")}
          className="text-left p-4 sm:p-5 rounded-2xl bg-white border border-[#E7E1D8] hover:border-[#783F24]/40 hover:shadow-xs transition-all flex items-center justify-between cursor-pointer"
        >
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#29241F]">Digital Menu</h3>
            <p className="text-xs text-[#78716C]">
              Edit prices, availability, and categories
            </p>
          </div>
          <UtensilsCrossed className="h-5 w-5 text-[#783F24]" />
        </button>
      </div>

      {/* Two Column Layout: Recent Orders & Top Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders (2 Columns) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-[#29241F]">
              Recent Live Orders
            </h2>
            <button
              onClick={() => router.push("/dashboard/orders")}
              className="text-xs font-semibold text-[#783F24] hover:underline cursor-pointer"
            >
              View Full Queue ➔
            </button>
          </div>

          <div className="rounded-2xl bg-white border border-[#E7E1D8] overflow-hidden shadow-2xs">
            {isOrdersLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : !recentOrders || recentOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#78716C]">
                No orders recorded yet today. Customers can scan table QRs to place orders.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F4] border-b border-[#E7E1D8] text-[#78716C] uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Order #</th>
                      <th className="px-4 py-3">Table</th>
                      <th className="px-4 py-3">Items</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FAF8F4]">
                    {recentOrders.slice(0, 6).map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => router.push("/dashboard/orders")}
                        className="hover:bg-[#FAF8F4] transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 font-bold text-[#29241F]">
                          #{order.order_number}
                        </td>
                        <td className="px-4 py-3 text-[#78716C]">
                          {order.table?.label ||
                            (order as unknown as { restaurant_tables?: { table_number?: string } })?.restaurant_tables?.table_number ||
                            "Counter"}
                        </td>
                        <td className="px-4 py-3 text-[#29241F]">
                          {(order.items || (order as unknown as { order_items?: unknown[] })?.order_items || []).length} items
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#783F24]">
                          {formatPaiseToINR(order.total_paise)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              order.order_status === "COMPLETED"
                                ? "success"
                                : order.order_status === "PENDING"
                                ? "warning"
                                : order.order_status === "CANCELLED" || order.order_status === "REJECTED"
                                ? "danger"
                                : "primary"
                            }
                          >
                            {order.order_status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Top Selling Items (1 Column) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-[#29241F]">
              Top Selling Dishes
            </h2>
          </div>

          <div className="rounded-2xl bg-white border border-[#E7E1D8] p-4 shadow-2xs space-y-3">
            {!topItems || topItems.length === 0 ? (
              <p className="text-xs text-[#78716C] py-4 text-center">
                Top selling analytics will populate as completed orders accumulate.
              </p>
            ) : (
              topItems.map((item, idx) => (
                <div
                  key={item.menu_item_id}
                  className="flex items-center justify-between gap-3 pb-2.5 border-b border-[#FAF8F4] last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="h-6 w-6 rounded-lg bg-[#FAF8F4] border border-[#E7E1D8] font-bold text-xs text-[#783F24] flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#29241F] truncate">
                        {item.item_name}
                      </p>
                      <p className="text-3xs text-[#78716C]">
                        {item.total_quantity} sold
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#783F24] shrink-0">
                    {formatPaiseToINR(item.total_revenue_paise)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
