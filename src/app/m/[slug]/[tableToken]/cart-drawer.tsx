"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Clock,
  Store,
  CreditCard,
  QrCode,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import QRCode from "qrcode";
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

  // Restaurant Payment Configuration
  const paymentConfig = menuData.paymentConfig;
  const acceptCounter = paymentConfig?.acceptCounter ?? true;
  const acceptRazorpay = paymentConfig?.acceptRazorpay ?? false;
  const acceptUpi = paymentConfig?.acceptUpi ?? false;
  const payPolicy = paymentConfig?.payPolicy || "PAY_LATER";
  const upiId = paymentConfig?.upiId || "";
  const upiName = paymentConfig?.upiName || menuData.restaurant?.name || "Restaurant";
  const razorpayKeyId = paymentConfig?.razorpayKeyId || "";

  const [selectedPaymentMode, setSelectedPaymentMode] = React.useState<"COUNTER" | "RAZORPAY" | "UPI">("COUNTER");
  const [hasConfirmedPrepayment, setHasConfirmedPrepayment] = React.useState(false);
  const [upiQrUrl, setUpiQrUrl] = React.useState<string | null>(null);

  // Taxes (GST) calculation based on Owner configuration
  const isGstEnabled = Boolean(menuData.taxConfig?.isGstEnabled);
  const gstRate = isGstEnabled ? Number(menuData.taxConfig?.gstPercentage || 0) : 0;
  const taxPaise =
    isGstEnabled && gstRate > 0
      ? Math.round((totalEstimatedPaise * gstRate) / 100)
      : 0;

  // Calculate breakdown of estimated charges (excluding GST to avoid double-calculation)
  const chargesBreakdown = React.useMemo(() => {
    const charges = (menuData.charges || []).filter(
      (c) => !c.name.toLowerCase().includes("gst")
    );
    let chargesTotal = 0;
    const list = charges.map((c) => {
      let amountPaise = 0;
      if (c.charge_type === "PERCENTAGE") {
        amountPaise = Math.round((totalEstimatedPaise * c.rate_or_amount) / 100);
      } else {
        amountPaise = Math.round(c.rate_or_amount);
      }
      chargesTotal += amountPaise;
      return {
        id: c.id,
        name: c.name,
        type: c.charge_type,
        rate: c.rate_or_amount,
        amountPaise,
      };
    });
    return {
      list,
      chargesTotal,
      grandTotalPaise: totalEstimatedPaise + taxPaise + chargesTotal,
    };
  }, [menuData.charges, totalEstimatedPaise, taxPaise]);

  // Set initial selected payment mode based on policy & active options
  React.useEffect(() => {
    if (payPolicy === "PAY_FIRST") {
      if (acceptRazorpay) setSelectedPaymentMode("RAZORPAY");
      else if (acceptUpi) setSelectedPaymentMode("UPI");
      else setSelectedPaymentMode("COUNTER");
    } else {
      if (acceptCounter) setSelectedPaymentMode("COUNTER");
      else if (acceptUpi) setSelectedPaymentMode("UPI");
      else if (acceptRazorpay) setSelectedPaymentMode("RAZORPAY");
    }
  }, [acceptCounter, acceptRazorpay, acceptUpi, payPolicy]);

  // Generate UPI QR Code URL when UPI mode is active
  const grandTotalRupees = (chargesBreakdown.grandTotalPaise / 100).toFixed(2);
  const upiDeepLink = React.useMemo(() => {
    if (!upiId) return "";
    const cleanUpi = upiId.trim();
    const cleanName = encodeURIComponent(upiName.trim());
    const tableNote = encodeURIComponent(`Order Table ${menuData.table?.tableNumber || ""}`);
    return `upi://pay?pa=${cleanUpi}&pn=${cleanName}&am=${grandTotalRupees}&cu=INR&tn=${tableNote}`;
  }, [upiId, upiName, grandTotalRupees, menuData.table?.tableNumber]);

  React.useEffect(() => {
    if (selectedPaymentMode === "UPI" && upiDeepLink) {
      QRCode.toDataURL(upiDeepLink, { width: 200, margin: 1 })
        .then(setUpiQrUrl)
        .catch(() => setUpiQrUrl(null));
    }
  }, [selectedPaymentMode, upiDeepLink]);

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

    if (payPolicy === "PAY_FIRST") {
      if (selectedPaymentMode === "UPI" && !hasConfirmedPrepayment) {
        setErrorMessage("Please complete your UPI payment and check the confirmation box before placing the order.");
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const orderPayload = {
        tableToken,
        idempotencyKey,
        items: items.map((i) => ({
          menuItemId: i.menuItemId || i.id,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        specialInstructions: specialNotes.trim() || undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        paymentMode: selectedPaymentMode,
        paymentStatus:
          payPolicy === "PAY_FIRST" && (selectedPaymentMode === "UPI" || selectedPaymentMode === "RAZORPAY")
            ? ("PAID" as const)
            : ("UNPAID" as const),
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
                          <div className="flex items-center gap-1.5 flex-wrap">
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
                            {item.variantName && (
                              <span className="px-1.5 py-0.2 rounded text-3xs font-semibold bg-[#F3E6D4] text-[#783F24] border border-[#E7E1D8]">
                                {item.variantName}
                              </span>
                            )}
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

                {/* Payment Selection & Pay First Details */}
                <div className="space-y-3 pt-2 border-t border-[#E7E1D8]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
                      Payment Method
                    </h3>
                    {payPolicy === "PAY_FIRST" ? (
                      <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-[#B77932]/10 text-[#B77932] border border-[#B77932]/20">
                        ⚡ Pay First (Prepaid)
                      </span>
                    ) : (
                      <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-[#557A52]/10 text-[#557A52]">
                        Pay Later
                      </span>
                    )}
                  </div>

                  {payPolicy === "PAY_FIRST" && (
                    <div className="rounded-xl bg-[#FAF8F4] p-3 text-2xs text-[#783F24] border border-[#F3E6D4] space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-[#B77932]" />
                        <span>Prepayment Required</span>
                      </p>
                      <p className="text-[#78716C]">
                        This restaurant prepares orders once payment is completed. Choose your payment method below.
                      </p>
                    </div>
                  )}

                  {/* Payment Methods Available */}
                  <div className="space-y-2">
                    {/* Option 1: Pay at Counter */}
                    {acceptCounter && (
                      <label
                        onClick={() => setSelectedPaymentMode("COUNTER")}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          selectedPaymentMode === "COUNTER"
                            ? "border-[#783F24] bg-[#F3E6D4]/30 ring-1 ring-[#783F24]"
                            : "border-[#E7E1D8] bg-white hover:bg-[#FAF8F4]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-[#FAF8F4] border border-[#E7E1D8] flex items-center justify-center text-[#783F24]">
                            <Store className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#29241F] block">
                              Pay at the counter
                            </span>
                            <span className="text-3xs text-[#78716C] block">
                              {payPolicy === "PAY_FIRST"
                                ? "Pay cash or card at counter before order starts"
                                : "Order now and pay cash/card to staff after meal"}
                            </span>
                          </div>
                        </div>
                        <span className="h-4 w-4 rounded-full border border-[#783F24] flex items-center justify-center">
                          {selectedPaymentMode === "COUNTER" && (
                            <span className="h-2 w-2 rounded-full bg-[#783F24]" />
                          )}
                        </span>
                      </label>
                    )}

                    {/* Option 2: Pay Online Razorpay */}
                    {acceptRazorpay && (
                      <label
                        onClick={() => setSelectedPaymentMode("RAZORPAY")}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          selectedPaymentMode === "RAZORPAY"
                            ? "border-[#783F24] bg-[#F3E6D4]/30 ring-1 ring-[#783F24]"
                            : "border-[#E7E1D8] bg-white hover:bg-[#FAF8F4]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-[#FAF8F4] border border-[#E7E1D8] flex items-center justify-center text-[#783F24]">
                            <CreditCard className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#29241F] block">
                              Pay now online (Razorpay)
                            </span>
                            <span className="text-3xs text-[#78716C] block">
                              UPI, cards, netbanking & wallets
                            </span>
                          </div>
                        </div>
                        <span className="h-4 w-4 rounded-full border border-[#783F24] flex items-center justify-center">
                          {selectedPaymentMode === "RAZORPAY" && (
                            <span className="h-2 w-2 rounded-full bg-[#783F24]" />
                          )}
                        </span>
                      </label>
                    )}

                    {/* Option 3: Pay by UPI Direct */}
                    {acceptUpi && (
                      <label
                        onClick={() => setSelectedPaymentMode("UPI")}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          selectedPaymentMode === "UPI"
                            ? "border-[#783F24] bg-[#F3E6D4]/30 ring-1 ring-[#783F24]"
                            : "border-[#E7E1D8] bg-white hover:bg-[#FAF8F4]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-[#FAF8F4] border border-[#E7E1D8] flex items-center justify-center text-[#783F24]">
                            <QrCode className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#29241F] block">
                              Pay by UPI (Zero Fee)
                            </span>
                            <span className="text-3xs text-[#78716C] block">
                              GPay, PhonePe, Paytm or scan QR
                            </span>
                          </div>
                        </div>
                        <span className="h-4 w-4 rounded-full border border-[#783F24] flex items-center justify-center">
                          {selectedPaymentMode === "UPI" && (
                            <span className="h-2 w-2 rounded-full bg-[#783F24]" />
                          )}
                        </span>
                      </label>
                    )}
                  </div>

                  {/* UPI Dynamic Payment Panel (QR & Intent) */}
                  {selectedPaymentMode === "UPI" && acceptUpi && (
                    <div className="rounded-2xl border border-[#E7E1D8] bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-[#FAF8F4] pb-2">
                        <span className="text-xs font-bold text-[#29241F]">
                          Scan & Pay: ₹{grandTotalRupees}
                        </span>
                        <span className="text-3xs font-mono text-[#78716C]">
                          {upiId}
                        </span>
                      </div>

                      {/* QR Code */}
                      {upiQrUrl ? (
                        <div className="flex flex-col items-center justify-center p-2 bg-[#FAF8F4] rounded-xl border border-[#E7E1D8]/60 space-y-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={upiQrUrl}
                            alt="Scan UPI QR"
                            className="w-36 h-36 rounded-lg shadow-2xs border border-white"
                          />
                          <p className="text-3xs text-[#78716C] text-center">
                            Scan with GPay, PhonePe, Paytm, or any UPI app
                          </p>
                        </div>
                      ) : null}

                      {/* Direct UPI App Intent Link (Mobile users) */}
                      {upiDeepLink && (
                        <a
                          href={upiDeepLink}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#783F24] text-white text-xs font-bold shadow-xs hover:bg-[#5B2E19] transition-colors"
                        >
                          <QrCode className="h-4 w-4" />
                          <span>Open in UPI App (Pay ₹{grandTotalRupees})</span>
                        </a>
                      )}

                      {/* Confirmation Checkbox for Pay First */}
                      {payPolicy === "PAY_FIRST" && (
                        <label className="flex items-start gap-2 pt-2 border-t border-[#FAF8F4] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hasConfirmedPrepayment}
                            onChange={(e) => setHasConfirmedPrepayment(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-[#E7E1D8] text-[#783F24] focus:ring-[#783F24]"
                          />
                          <span className="text-2xs text-[#29241F] font-semibold leading-tight">
                            I have sent ₹{grandTotalRupees} to {upiId} from my UPI app.
                          </span>
                        </label>
                      )}
                    </div>
                  )}

                  {/* Razorpay Info Panel */}
                  {selectedPaymentMode === "RAZORPAY" && acceptRazorpay && (
                    <div className="rounded-xl border border-[#557A52]/20 bg-[#557A52]/10 p-3 text-2xs text-[#557A52] flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 shrink-0" />
                      <span>
                        Secure online payment enabled by {menuData.restaurant?.name}.
                      </span>
                    </div>
                  )}
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
                  <span>Subtotal</span>
                  <span>{formatPaiseToINR(totalEstimatedPaise)}</span>
                </div>

                {/* Taxes (GST): Only shown if configured by Restaurant Owner */}
                {taxPaise > 0 && isGstEnabled && gstRate > 0 && (
                  <div className="flex justify-between text-[#78716C]">
                    <span>Taxes (GST {gstRate}%)</span>
                    <span>{formatPaiseToINR(taxPaise)}</span>
                  </div>
                )}

                {/* Non-Tax Additional Charges (e.g. Packaging, Delivery) */}
                {chargesBreakdown.list.map((c) => (
                  <div key={c.id} className="flex justify-between text-[#78716C]">
                    <span>
                      {c.name} {c.type === "PERCENTAGE" ? `(${c.rate}%)` : ""}
                    </span>
                    <span>{formatPaiseToINR(c.amountPaise)}</span>
                  </div>
                ))}

                <div className="flex justify-between text-base font-bold text-[#29241F] pt-2 border-t border-[#E7E1D8]">
                  <span>Total Amount</span>
                  <span className="text-[#783F24]">
                    {formatPaiseToINR(chargesBreakdown.grandTotalPaise)}
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
                <span>
                  {payPolicy === "PAY_FIRST"
                    ? selectedPaymentMode === "UPI"
                      ? "I Have Paid • Place Order"
                      : selectedPaymentMode === "RAZORPAY"
                      ? "Pay Online & Place Order"
                      : "Pay at Counter & Place Order"
                    : "Confirm & Place Order"}
                </span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
