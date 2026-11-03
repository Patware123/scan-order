"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  UtensilsCrossed,
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Sparkles,
  AlertCircle,
  Clock,
  Flame,
} from "lucide-react";
import { publicApi, PublicMenuResponse, PublicMenuItem } from "@/services/api/public.api";
import { CartProvider, useCart } from "@/features/customer/cart-context";
import { CartDrawer } from "./cart-drawer";
import { formatPaiseToINR } from "@/lib/utils/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function MenuLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F4] p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
      <Skeleton className="h-44 w-full rounded-2xl" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className="space-y-3 pt-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function CustomerMenuPage({
  params,
}: {
  params: Promise<{ slug: string; tableToken: string }>;
}) {
  return (
    <React.Suspense fallback={<MenuLoadingSkeleton />}>
      <CustomerMenuContent paramsPromise={params} />
    </React.Suspense>
  );
}

function CustomerMenuContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ slug: string; tableToken: string }>;
}) {
  const { slug, tableToken } = React.use(paramsPromise);

  const {
    data: menuData,
    isLoading,
    isError,
    error,
  } = useQuery<PublicMenuResponse>({
    queryKey: ["publicMenu", tableToken],
    queryFn: () => publicApi.getMenuByTableToken(tableToken),
    retry: 1,
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return <MenuLoadingSkeleton />;
  }

  if (isError || !menuData) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#E7E1D8] text-center shadow-lg space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-[#B94A48]/10 text-[#B94A48] flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-[#29241F]">
            Table QR Not Available
          </h1>
          <p className="text-sm text-[#78716C]">
            {(error as Error)?.message ||
              "This QR code is either invalid, expired, or has been revoked by restaurant staff. Please scan a fresh table QR or ask your server for assistance."}
          </p>
          <div className="pt-2">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CartProvider
      restaurantId={menuData.restaurant.id}
      tableId={menuData.table.id}
    >
      <MenuContent menuData={menuData} tableToken={tableToken} slug={slug} />
    </CartProvider>
  );
}

function MenuContent({
  menuData,
  tableToken,
}: {
  menuData: PublicMenuResponse;
  tableToken: string;
  slug: string;
}) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("ALL");
  const [dietaryFilter, setDietaryFilter] = React.useState<string>("ALL");
  const [isCartOpen, setIsCartOpen] = React.useState(false);

  const { items: cartItems, addItem, updateQuantity, totalItemsCount, totalEstimatedPaise } =
    useCart();

  const orderingMode =
    menuData.restaurant.branding?.ordering_mode ||
    menuData.restaurant.ordering_mode ||
    menuData.table.ordering_mode ||
    "STAFF_SERVED";

  const tableLabel =
    menuData.table.label ||
    (menuData.table.tableNumber ? `Table ${menuData.table.tableNumber}` : "Table");

  const logoUrl =
    menuData.restaurant.branding?.logo_url || menuData.restaurant.logo_url;

  // Group items by category safely
  const categorizedList = React.useMemo(() => {
    const categories = menuData.categories || [];
    const allItems = menuData.items || [];

    return categories.map((cat) => {
      const catItems = allItems.filter((i) => i.category_id === cat.id);
      return {
        ...cat,
        items: catItems,
      };
    });
  }, [menuData]);

  // Filter items based on search and dietary preferences
  const filteredCategories = categorizedList
    .map((category) => {
      const filteredItems = (category.items || []).filter((item: PublicMenuItem) => {
        // Search filter
        if (
          searchQuery &&
          !item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !item.description?.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }

        const isItemVeg = item.is_veg === true || item.dietary_type === "VEG" || item.dietary_type === "VEGAN";

        // Dietary filter
        if (dietaryFilter === "VEG" && !isItemVeg) {
          return false;
        }
        if (dietaryFilter === "NON_VEG" && isItemVeg) {
          return false;
        }

        return true;
      });

      return {
        ...category,
        items: filteredItems,
      };
    })
    .filter((cat) => {
      if (selectedCategory !== "ALL" && cat.id !== selectedCategory) return false;
      return cat.items.length > 0;
    });

  return (
    <div className="min-h-screen bg-[#FAF8F4] pb-28 text-[#29241F]">
      {/* Restaurant Header */}
      <div className="bg-white border-b border-[#E7E1D8] shadow-2xs sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={menuData.restaurant.name}
                className="h-10 w-10 rounded-xl object-cover border border-[#E7E1D8]"
              />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-[#F3E6D4] text-[#783F24] flex items-center justify-center">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
            )}
            <div>
              <h1 className="text-base sm:text-lg font-bold text-[#29241F] leading-tight">
                {menuData.restaurant.name}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="primary" className="text-2xs py-0 px-2">
                  {tableLabel}
                </Badge>
                <span className="text-2xs text-[#78716C]">
                  {orderingMode === "SELF_SERVICE"
                    ? "Counter Pickup"
                    : "Table Service"}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2.5 rounded-xl border border-[#E7E1D8] bg-[#FAF8F4] text-[#783F24] hover:bg-[#F3E6D4]/50 transition-colors cursor-pointer"
            aria-label="View Cart"
          >
            <ShoppingBag className="h-5 w-5" />
            {totalItemsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[#783F24] text-white text-xs font-bold flex items-center justify-center">
                {totalItemsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Ordering Mode Notice */}
        <div className="rounded-xl border border-[#C58B45]/20 bg-[#F3E6D4]/40 p-3 flex items-center gap-2.5 text-xs text-[#783F24]">
          <Sparkles className="h-4 w-4 shrink-0 text-[#C58B45]" />
          <span>
            {orderingMode === "SELF_SERVICE"
              ? "Self-Service Ordering: Place your order below and collect fresh from the counter when ready."
              : "Table Service Ordering: Order anytime from your seat and our team will serve directly to your table."}
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#78716C]" />
          <input
            type="text"
            placeholder="Search appetizers, mains, beverages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 rounded-xl border border-[#E7E1D8] bg-white pl-10 pr-4 text-xs sm:text-sm text-[#29241F] placeholder:text-[#A8A29E] focus:border-[#783F24] focus:outline-none focus:ring-2 focus:ring-[#783F24]/20"
          />
        </div>

        {/* Dietary Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setDietaryFilter("ALL")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
              dietaryFilter === "ALL"
                ? "bg-[#783F24] text-white border-[#783F24]"
                : "bg-white text-[#78716C] border-[#E7E1D8] hover:bg-[#FAF8F4]"
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => setDietaryFilter(dietaryFilter === "VEG" ? "ALL" : "VEG")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
              dietaryFilter === "VEG"
                ? "bg-[#557A52] text-white border-[#557A52]"
                : "bg-white text-[#557A52] border-[#E7E1D8] hover:bg-[#FAF8F4]"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-[#557A52]" />
            Veg Only
          </button>
          <button
            onClick={() => setDietaryFilter(dietaryFilter === "NON_VEG" ? "ALL" : "NON_VEG")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
              dietaryFilter === "NON_VEG"
                ? "bg-[#B94A48] text-white border-[#B94A48]"
                : "bg-white text-[#B94A48] border-[#E7E1D8] hover:bg-[#FAF8F4]"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-[#B94A48]" />
            Non-Veg
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-[#E7E1D8] no-scrollbar">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === "ALL"
                ? "bg-[#F3E6D4] text-[#783F24]"
                : "text-[#78716C] hover:text-[#29241F]"
            }`}
          >
            All Categories
          </button>
          {menuData.categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-[#F3E6D4] text-[#783F24]"
                  : "text-[#78716C] hover:text-[#29241F]"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Menu Categories and Items */}
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#E7E1D8] p-8">
            <p className="text-sm font-semibold text-[#29241F]">No items match your filter</p>
            <p className="text-xs text-[#78716C] mt-1">
              Try searching for something else or resetting the dietary filters.
            </p>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <div key={category.id} className="space-y-3 pt-2">
              <div className="flex items-baseline justify-between border-b border-[#E7E1D8]/60 pb-1">
                <h2 className="text-base sm:text-lg font-bold text-[#29241F]">
                  {category.name}
                </h2>
                <span className="text-xs text-[#78716C]">
                  {category.items.length} {category.items.length === 1 ? "item" : "items"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {category.items.map((item) => {
                  const inCartItem = cartItems.find((i) => i.id === item.id);
                  const isVeg = item.is_veg === true || item.dietary_type === "VEG" || item.dietary_type === "VEGAN";

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-[#E7E1D8] p-3.5 flex flex-col justify-between shadow-xs transition-shadow hover:shadow-sm"
                    >
                      <div className="flex gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Dietary & Spice badges */}
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className={`h-2.5 w-2.5 rounded-xs flex items-center justify-center border ${
                                isVeg
                                  ? "border-[#557A52] text-[#557A52]"
                                  : "border-[#B94A48] text-[#B94A48]"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isVeg ? "bg-[#557A52]" : "bg-[#B94A48]"
                                }`}
                              />
                            </span>

                            {item.spice_level && item.spice_level > 0 ? (
                              <span className="inline-flex items-center text-3xs text-[#B77932] gap-0.5">
                                <Flame className="h-3 w-3 fill-[#B77932]" />
                                {item.spice_level > 1 && "Spicy"}
                              </span>
                            ) : null}

                            {item.preparation_time_minutes ? (
                              <span className="inline-flex items-center text-3xs text-[#78716C] gap-0.5 ml-auto">
                                <Clock className="h-3 w-3" />
                                {item.preparation_time_minutes}m
                              </span>
                            ) : null}
                          </div>

                          <h3 className="text-sm font-semibold text-[#29241F] leading-snug">
                            {item.name}
                          </h3>

                          {item.description && (
                            <p className="text-xs text-[#78716C] line-clamp-2 mt-1">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Item Image */}
                        {item.image_url && (
                          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 border border-[#E7E1D8] bg-[#FAF8F4]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>

                      {/* Bottom Pricing & Actions */}
                      <div className="flex items-center justify-between pt-3 mt-2 border-t border-[#FAF8F4]">
                        <span className="text-base font-bold text-[#783F24]">
                          {formatPaiseToINR(item.price_paise)}
                        </span>

                        {!item.is_available ? (
                          <Badge variant="danger" className="text-2xs py-1">
                            Sold Out
                          </Badge>
                        ) : inCartItem ? (
                          <div className="flex items-center gap-2 bg-[#FAF8F4] border border-[#E7E1D8] rounded-xl px-2.5 py-1">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, -1)}
                              className="text-[#78716C] hover:text-[#783F24] p-0.5 cursor-pointer"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-xs font-bold text-[#29241F] min-w-[18px] text-center">
                              {inCartItem.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, 1)}
                              className="text-[#78716C] hover:text-[#783F24] p-0.5 cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 px-3.5 font-semibold text-xs rounded-xl"
                            onClick={() =>
                              addItem({
                                id: item.id,
                                name: item.name,
                                pricePaise: item.price_paise,
                                dietaryType: isVeg ? "VEG" : "NON_VEG",
                                imageUrl: item.image_url,
                              })
                            }
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Bottom Cart Bar */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#E7E1D8] shadow-lg p-3 sm:p-4 animate-slideUp">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs text-[#78716C]">
                {totalItemsCount} {totalItemsCount === 1 ? "item" : "items"} in cart
              </span>
              <p className="text-base sm:text-lg font-bold text-[#29241F]">
                {formatPaiseToINR(totalEstimatedPaise)}
              </p>
            </div>

            <Button
              onClick={() => setIsCartOpen(true)}
              size="lg"
              className="h-11 px-6 text-sm font-semibold rounded-xl"
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              <span>View Cart & Order</span>
            </Button>
          </div>
        </div>
      )}

      {/* Slide-over Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        menuData={menuData}
        tableToken={tableToken}
      />
    </div>
  );
}
