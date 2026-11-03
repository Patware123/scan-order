"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Calendar,
  Flame,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { restaurantApi } from "@/services/api/restaurant.api";
import { formatPaiseToINR } from "@/lib/utils/currency";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsPage() {
  const { activeRestaurantId, activeRestaurant } = useAuth();
  const [selectedDate, setSelectedDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );

  const { data: dailyReport, isLoading: isReportLoading } = useQuery({
    queryKey: ["dailyReport", activeRestaurantId, selectedDate],
    queryFn: () =>
      activeRestaurantId
        ? restaurantApi.getDailyReports(activeRestaurantId, selectedDate)
        : null,
    enabled: !!activeRestaurantId,
  });

  const { data: topItems, isLoading: isItemsLoading } = useQuery({
    queryKey: ["topItems", activeRestaurantId],
    queryFn: () =>
      activeRestaurantId ? restaurantApi.getTopSellingItems(activeRestaurantId, 10) : null,
    enabled: !!activeRestaurantId,
  });

  if (!activeRestaurantId) {
    return (
      <div className="p-8 text-center text-[#78716C] bg-white rounded-3xl border border-[#E7E1D8]">
        Please select a restaurant first.
      </div>
    );
  }

  const metrics = dailyReport?.metrics;
  const hourly = dailyReport?.hourly_breakdown || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#78716C] font-semibold">
            Business Intelligence
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#29241F]">
            Reports & Sales Analytics
          </h1>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 bg-white border border-[#E7E1D8] rounded-xl px-3 py-1.5 shadow-2xs">
          <Calendar className="h-4 w-4 text-[#783F24]" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs font-semibold text-[#29241F] bg-transparent focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between pb-2">
            <span className="text-2xs sm:text-xs font-semibold text-[#78716C] uppercase tracking-wider">
              Net Revenue
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
              For {selectedDate}
            </p>
          </CardContent>
        </Card>

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
            <p className="text-3xs sm:text-2xs text-[#557A52] mt-1 font-semibold">
              {metrics?.completed_orders || 0} Successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between pb-2">
            <span className="text-2xs sm:text-xs font-semibold text-[#78716C] uppercase tracking-wider">
              Average Order Value
            </span>
            <div className="h-8 w-8 rounded-xl bg-[#C58B45]/10 text-[#C58B45] flex items-center justify-center">
              <BarChart3 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            {isReportLoading ? (
              <Skeleton className="h-8 w-20 rounded-lg" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold text-[#29241F]">
                {formatPaiseToINR((metrics?.average_order_value_rupees || 0) * 100)}
              </div>
            )}
            <p className="text-3xs sm:text-2xs text-[#78716C] mt-1">
              Per Completed Ticket
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between pb-2">
            <span className="text-2xs sm:text-xs font-semibold text-[#78716C] uppercase tracking-wider">
              Cancellations
            </span>
            <div className="h-8 w-8 rounded-xl bg-[#B94A48]/10 text-[#B94A48] flex items-center justify-center">
              <XCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            {isReportLoading ? (
              <Skeleton className="h-8 w-16 rounded-lg" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold text-[#B94A48]">
                {metrics?.cancelled_orders || 0}
              </div>
            )}
            <p className="text-3xs sm:text-2xs text-[#78716C] mt-1">
              Rejected or cancelled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two Columns: Hourly Distribution & Top Selling Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Distribution Table */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-[#29241F]">
            Hourly Sales Distribution
          </h2>

          <div className="rounded-2xl bg-white border border-[#E7E1D8] p-4 shadow-2xs">
            {Object.keys(hourly).length === 0 ? (
              <p className="text-xs text-[#78716C] text-center py-8">
                No orders registered for the selected date yet.
              </p>
            ) : (
              <div className="space-y-2">
                {Object.entries(hourly).map(([hour, data]) => (
                  <div
                    key={hour}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-[#FAF8F4] last:border-0"
                  >
                    <span className="font-semibold text-[#29241F] min-w-[70px]">
                      {hour}:00 hrs
                    </span>
                    <span className="text-[#78716C]">
                      {data.order_count} {data.order_count === 1 ? "order" : "orders"}
                    </span>
                    <span className="font-bold text-[#783F24]">
                      {formatPaiseToINR(data.revenue_paise)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Selling Items Table */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-[#29241F]">
            Top Selling Dishes (All Time)
          </h2>

          <div className="rounded-2xl bg-white border border-[#E7E1D8] p-4 shadow-2xs">
            {isItemsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : !topItems || topItems.length === 0 ? (
              <p className="text-xs text-[#78716C] text-center py-8">
                Menu analytics will generate as completed orders are fulfilled.
              </p>
            ) : (
              <div className="space-y-2">
                {topItems.map((item: any, idx) => {
                  const dishName = item.item_name || item.itemName || `Dish #${idx + 1}`;
                  const totalQty = item.total_quantity ?? item.totalQuantity ?? 0;
                  const totalRev = item.total_revenue_paise ?? item.totalRevenuePaise ?? 0;
                  const uniqueKey = item.menu_item_id || dishName || `report-dish-${idx}`;

                  return (
                    <div
                      key={uniqueKey}
                      className="flex items-center justify-between text-xs py-2 border-b border-[#FAF8F4] last:border-0"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-5 w-5 rounded-md bg-[#F3E6D4] text-[#783F24] font-bold text-3xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-[#29241F] truncate">
                          {dishName}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-[#78716C]">
                          {totalQty} sold
                        </span>
                        <span className="font-bold text-[#783F24]">
                          {formatPaiseToINR(totalRev)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
