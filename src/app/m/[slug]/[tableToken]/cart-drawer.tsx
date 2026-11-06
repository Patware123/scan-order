"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Clock } from "lucide-react";
import { useCart } from "@/features/customer/cart-context";
import { publicApi, PublicMenuResponse } from "@/services/api/public.api";
import { formatPaiseToINR } from "@/lib/utils/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  menuData: PublicMenuResponse;
  tableToken: string;
}

export function CartDrawer({
  isOpen,
  onClose,
  menuData,
  tableToken,
}: CartDrawerProps) {
  const router = useRouter();
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    totalEstimatedPaise,
    idempotencyKey,
  } = useCart();

  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [specialNotes, setSpecialNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setErrorMessage(null);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const orderPayload = {
        tableToken,
        idempotencyKey,
        items: items.map((i) => ({
          menuItemId: i.id,
          quantity: i.quantity,
        })),
        specialInstructions: specialNotes.trim() || undefined,
      };

      const result = await publicApi.createOrder(orderPayload);

      // Order created successfully!
      clearCart();
      onClose();

      // Redirect directly to guest order tracking page
      router.push(`/m/order/${result.tracking_token}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to place your order. Please check item availability and try again.";
      setErrorMessage(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#29241F]/50 backdrop-blur-xs transition-opacity"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-2">
        <div className="w-screen max-w-md bg-[#FAF8F4] flex flex-col shadow-2xl border-l border-[#E7E1D8]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E7E1D8] bg-white px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-[#29241F]">
                Your Order
              </h2>
              <p className="text-xs text-[#78716C]">
                {menuData.table.label ||
                  (menuData.table.tableNumber ? `Table ${menuData.table.tableNumber}` : "Table")}{" "}
                • {menuData.restaurant.name}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg p-2 text-[#78716C] hover:bg-[#FAF8F4] hover:text-[#29241F] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-full bg-[#F3E6D4] flex items-center justify-center text-[#783F24] mb-3">
                  <Clock className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-[#29241F]">
                  Your cart is empty
                </p>
                <p className="text-xs text-[#78716C] mt-1 max-w-xs">
                  Browse delicious items from the menu and add them to your order.
                </p>
              </div>
            ) : (
              <>
                {/* Items List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
                    Items ({items.length})
                  </h3>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[#E7E1D8] bg-white p-3 shadow-2xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {item.dietaryType && (
                              <span
                                className={`h-2 w-2 rounded-full ${item.dietaryType === "VEG"
                                    ? "bg-[#557A52]"
                                    : "bg-[#B94A48]"
                                  }`}
                              />
                            )}
                            <h4 className="text-sm font-medium text-[#29241F] truncate">
                              {item.name}
                            </h4>
                          </div>
                          <p className="text-xs text-[#78716C] mt-0.5">
                            {formatPaiseToINR(item.pricePaise)} each
                          </p>
                        </div>

                        {/* Quantity Counter */}
                        <div className="flex items-center gap-2 bg-[#FAF8F4] border border-[#E7E1D8] rounded-lg px-2 py-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="text-[#78716C] hover:text-[#783F24] cursor-pointer"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-xs font-semibold text-[#29241F] min-w-[16px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="text-[#78716C] hover:text-[#783F24] cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Line Total & Remove */}
                        <div className="text-right flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#29241F]">
                            {formatPaiseToINR(item.pricePaise * item.quantity)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-[#78716C] hover:text-[#B94A48] transition-colors p-1 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customer Details Form */}
                <div className="space-y-3 pt-2 border-t border-[#E7E1D8]">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
                    Guest Details
                  </h3>
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-[#E7E1D8]">
                    <Input
                      label="Your Name (Optional)"
                      placeholder="e.g. Rahul Verma"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                    <Input
                      label="Mobile Number (Optional)"
                      placeholder="e.g. 9876543210"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      helperText="For order updates and digital invoice"
                    />
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-medium text-[#29241F]">
                        Special Cooking Instructions
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Less spicy, extra sauce, allergies..."
                        value={specialNotes}
                        onChange={(e) => setSpecialNotes(e.target.value)}
                        className="w-full rounded-xl border border-[#E7E1D8] bg-white p-2.5 text-xs sm:text-sm text-[#29241F] placeholder:text-[#A8A29E] focus:border-[#783F24] focus:outline-none focus:ring-2 focus:ring-[#783F24]/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="rounded-xl border border-[#B94A48]/30 bg-[#B94A48]/10 p-3.5 text-xs text-[#B94A48]">
                    {errorMessage}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Summary & Checkout */}
          {items.length > 0 && (
            <div className="border-t border-[#E7E1D8] bg-white p-5 space-y-4">
              <div className="space-y-1.5 text-xs sm:text-sm">
                <div className="flex justify-between text-[#78716C]">
                  <span>Estimated Subtotal</span>
                  <span>{formatPaiseToINR(totalEstimatedPaise)}</span>
                </div>
                <div className="flex justify-between text-[#78716C]">
                  <span>Taxes & Service</span>
                  <span>Calculated on Server</span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#29241F] pt-2 border-t border-[#E7E1D8]">
                  <span>Total Amount</span>
                  <span className="text-[#783F24]">
                    {formatPaiseToINR(totalEstimatedPaise)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-2xs text-[#78716C] bg-[#FAF8F4] p-2.5 rounded-lg border border-[#E7E1D8]">
                <ShieldCheck className="h-4 w-4 text-[#557A52] shrink-0" />
                <span>
                  Prices calculated securely by restaurant server. No hidden fees.
                </span>
              </div>

              <Button
                onClick={handleCheckout}
                disabled={isSubmitting}
                isLoading={isSubmitting}
                className="w-full h-12 text-base font-semibold"
                size="lg"
              >
                <span>Confirm & Place Order</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
