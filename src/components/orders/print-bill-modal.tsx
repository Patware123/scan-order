"use client";

import * as React from "react";
import { Printer, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatPaiseToINR } from "@/lib/utils/currency";

export interface BillOrderData {
  id: string;
  order_number: string;
  order_status?: string;
  payment_status?: string;
  payment_mode?: string;
  created_at: string;
  subtotal_paise: number;
  tax_paise: number;
  additional_charges_paise?: number;
  charges_snapshot?: Array<{ name: string; amountPaise?: number; rate?: number }>;
  total_paise: number;
  customer_name?: string | null;
  customer_phone?: string | null;
  table?: {
    id?: string;
    label?: string;
    table_number?: string;
  };
  restaurant_tables?: {
    table_number?: string;
  };
  table_number?: string;
  items: Array<{
    id?: string;
    item_name_snapshot?: string;
    itemNameSnapshot?: string;
    name?: string;
    quantity: number;
    line_total_paise?: number;
    lineTotalPaise?: number;
    unit_price_paise?: number;
    unitPricePaise?: number;
  }>;
}

export interface BillRestaurantData {
  name: string;
  address?: string | null;
  phone?: string | null;
  gstNumber?: string | null;
}

interface PrintBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: BillOrderData | null;
  restaurant?: BillRestaurantData | null;
  gstPercentage?: number | null;
}

export function PrintBillModal({
  isOpen,
  onClose,
  order,
  restaurant,
  gstPercentage,
}: PrintBillModalProps) {
  if (!isOpen || !order) return null;

  // Formatting Date & Time
  const orderDate = new Date(order.created_at || Date.now());
  const dateStr = orderDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = orderDate.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Table Label
  const tableLabel =
    order.table?.label ||
    order.restaurant_tables?.table_number ||
    order.table_number ||
    "Counter / Takeaway";

  // Clean table number display (e.g. if "Table 13" -> "13")
  const displayTable = tableLabel.replace(/^table\s*/i, "").trim() || "1";

  // Customer Name
  const customerName = order.customer_name?.trim() || "Guest";

  // Payment Mode
  const rawMode = (order.payment_mode || "cash").toLowerCase();
  const paymentMode =
    rawMode === "counter" || rawMode === "cash"
      ? "cash"
      : rawMode === "upi"
      ? "UPI"
      : rawMode === "razorpay"
      ? "online (Razorpay)"
      : rawMode;

  // Receipt Number format
  const receiptNo = order.order_number?.startsWith("INV-")
    ? order.order_number
    : order.order_number?.startsWith("ORD-")
    ? order.order_number.replace(/^ORD-/, "INV-")
    : `INV-${orderDate.getFullYear()}-${order.order_number}`;

  // GST Calculation (Split equally into CGST & SGST)
  const hasTax = order.tax_paise > 0;
  const effectiveGstRate =
    gstPercentage && gstPercentage > 0
      ? gstPercentage
      : order.subtotal_paise > 0
      ? Number(((order.tax_paise / order.subtotal_paise) * 100).toFixed(1))
      : 0;

  const halfRate = effectiveGstRate > 0 ? effectiveGstRate / 2 : null;
  const halfRateStr = halfRate !== null ? `${halfRate.toFixed(1).replace(/\.0$/, "")}%` : "";

  const cgstPaise = Math.round(order.tax_paise / 2);
  const sgstPaise = order.tax_paise - cgstPaise;

  // Additional Non-tax charges
  const additionalCharges = (order.charges_snapshot || []).filter(
    (c) => !c.name?.toLowerCase().includes("gst")
  );

  // Hidden Iframe Print Handler for 100% reliable single-page thermal POS printing
  const handlePrint = () => {
    const printContent = document.getElementById("printable-thermal-receipt");
    if (!printContent) {
      window.print();
      return;
    }

    // Reuse or create hidden iframe
    let printFrame = document.getElementById("thermal-print-iframe") as HTMLIFrameElement | null;
    if (!printFrame) {
      printFrame = document.createElement("iframe");
      printFrame.id = "thermal-print-iframe";
      printFrame.style.position = "fixed";
      printFrame.style.top = "-9999px";
      printFrame.style.left = "-9999px";
      printFrame.style.width = "0px";
      printFrame.style.height = "0px";
      printFrame.style.border = "none";
      document.body.appendChild(printFrame);
    }

    const frameDoc = printFrame.contentWindow?.document;
    if (!frameDoc) {
      window.print();
      return;
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${receiptNo}</title>
  <style>
    @page {
      size: auto;
      margin: 0;
    }
    @media print {
      html, body {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        color: #000 !important;
      }
      .print-center-container {
        display: flex !important;
        justify-content: center !important;
        align-items: flex-start !important;
        width: 100% !important;
        margin: 0 auto !important;
        padding: 6mm 0 !important;
      }
      .receipt-card {
        width: 80mm !important;
        max-width: 100% !important;
        margin: 0 auto !important;
        padding: 4mm 6mm !important;
        box-sizing: border-box !important;
      }
      .no-print { display: none !important; }
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      background: #fff;
      color: #000;
      font-family: 'Courier New', Courier, monospace;
    }
    .print-center-container {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      width: 100%;
      margin: 0 auto;
      padding: 6mm 0;
    }
    .receipt-card {
      width: 80mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 4mm 6mm;
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      line-height: 1.35;
      color: #000;
      background: #fff;
      box-sizing: border-box;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    .font-black { font-weight: 900; }
    .title {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -0.5px;
      margin: 0 0 3px 0;
      text-align: center;
    }
    .subtext {
      font-size: 11px;
      color: #222;
      margin: 2px 0;
      text-align: center;
      word-break: break-word;
    }
    .dashed {
      border-top: 1px dashed #000;
      margin: 7px 0;
      width: 100%;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin: 3px 0;
      font-size: 12px;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin: 4px 0;
      font-size: 13px;
    }
    .item-name {
      padding-right: 8px;
      word-break: break-word;
      flex: 1;
      text-align: left;
    }
    .price {
      white-space: nowrap;
      font-family: 'Courier New', Courier, monospace;
      font-weight: 600;
      text-align: right;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 15px;
      font-weight: 900;
      margin-top: 6px;
      padding-top: 4px;
      border-top: 1px solid #000;
    }
    .footer {
      text-align: center;
      font-size: 11px;
      font-weight: bold;
      letter-spacing: 1px;
      margin-top: 12px;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="print-center-container">
    <div class="receipt-card">
      ${printContent.innerHTML}
    </div>
  </div>
</body>
</html>`;

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    setTimeout(() => {
      printFrame?.contentWindow?.focus();
      printFrame?.contentWindow?.print();
    }, 200);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <div className="relative max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Modal Action Header */}
        <div className="flex items-center justify-between border-b border-[#E7E1D8] pb-3 no-print">
          <div className="flex items-center gap-2 text-[#29241F]">
            <Printer className="h-5 w-5 text-[#783F24]" />
            <h3 className="text-base font-bold">Print Restaurant Receipt</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#78716C] hover:text-[#29241F] p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* THERMAL POS RECEIPT LAYOUT (Matches User Screenshot Format) */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div
          id="printable-thermal-receipt"
          className="bg-white text-black font-mono text-xs sm:text-sm p-4 sm:p-6 border border-stone-300 rounded-xl max-w-sm mx-auto shadow-inner leading-relaxed select-text"
          style={{ fontFamily: "'Courier New', Courier, monospace" }}
        >
          {/* 1. Header Information */}
          <div className="text-center space-y-1">
            <h1 className="title text-lg sm:text-xl font-bold tracking-tight text-black">
              {restaurant?.name || "Restaurant"}
            </h1>
            {restaurant?.address && (
              <p className="subtext text-xs text-stone-700 whitespace-pre-line max-w-[280px] mx-auto">
                {restaurant.address}
              </p>
            )}
            {restaurant?.phone && (
              <p className="subtext text-xs font-semibold text-stone-800 tracking-wider">
                CONTACT NO: {restaurant.phone}
              </p>
            )}
            {restaurant?.gstNumber && (
              <p className="subtext text-xs text-stone-600">
                GSTIN: {restaurant.gstNumber}
              </p>
            )}
          </div>

          {/* Dashed Separator */}
          <div className="dashed my-2.5 border-t border-dashed border-black" />

          {/* 2. Order Metadata Row */}
          <div className="row flex justify-between items-center text-xs text-stone-800">
            <span>Date: {dateStr}</span>
            <span>Time: {timeStr}</span>
            <span className="font-bold">Table: {displayTable}</span>
          </div>

          {/* Dashed Separator */}
          <div className="dashed my-2.5 border-t border-dashed border-black" />

          {/* 3. Receipt & Customer Info */}
          <div className="space-y-1 text-xs text-stone-900">
            <div className="row flex justify-between">
              <span>RECEIPT NO -</span>
              <span className="font-semibold">{receiptNo}</span>
            </div>
            <div className="row flex justify-between">
              <span>CUSTOMER -</span>
              <span className="font-semibold truncate max-w-[180px] text-right">
                {customerName}
              </span>
            </div>
            <div className="row flex justify-between">
              <span>PAYMENT MODE -</span>
              <span className="font-semibold lowercase">{paymentMode}</span>
            </div>
          </div>

          <div className="dashed my-3 border-t border-dashed border-black/40" />

          {/* 4. Line Items List */}
          <div className="space-y-2 py-1">
            {order.items.map((item, idx) => {
              const name =
                item.item_name_snapshot ||
                item.itemNameSnapshot ||
                item.name ||
                "Dish Item";
              const totalPaise =
                item.line_total_paise ??
                item.lineTotalPaise ??
                (item.unit_price_paise || item.unitPricePaise || 0) * item.quantity;

              return (
                <div key={item.id || idx} className="item-row flex justify-between items-start text-xs sm:text-sm">
                  <span className="item-name pr-2 leading-tight">
                    {item.quantity} x {name}
                  </span>
                  <span className="price shrink-0 font-medium font-mono">
                    {formatPaiseToINR(totalPaise)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Dashed Separator */}
          <div className="dashed my-2.5 border-t border-dashed border-black" />

          {/* 5. Subtotal and Tax Breakdown */}
          <div className="space-y-1.5 text-xs sm:text-sm">
            <div className="row flex justify-between font-medium">
              <span>SUBTOTAL:</span>
              <span className="price font-mono">{formatPaiseToINR(order.subtotal_paise)}</span>
            </div>

            {/* Split Indian GST: CGST + SGST */}
            {hasTax && (
              <>
                <div className="row flex justify-between text-stone-800">
                  <span>CGST {halfRateStr ? `(${halfRateStr})` : ""}:</span>
                  <span className="price font-mono">{formatPaiseToINR(cgstPaise)}</span>
                </div>
                <div className="row flex justify-between text-stone-800">
                  <span>SGST {halfRateStr ? `(${halfRateStr})` : ""}:</span>
                  <span className="price font-mono">{formatPaiseToINR(sgstPaise)}</span>
                </div>
              </>
            )}

            {/* Additional Non-tax Charges */}
            {additionalCharges.map((ch, idx) => (
              <div key={idx} className="row flex justify-between text-stone-800">
                <span>{ch.name}:</span>
                <span className="price font-mono">{formatPaiseToINR(ch.amountPaise || 0)}</span>
              </div>
            ))}

            {/* Grand Total */}
            <div className="total-row flex justify-between text-sm sm:text-base font-black pt-1 border-t border-black">
              <span>TOTAL:</span>
              <span className="price font-mono">{formatPaiseToINR(order.total_paise)}</span>
            </div>
          </div>

          {/* Dashed Separator */}
          <div className="dashed my-3 border-t border-dashed border-black" />

          {/* 6. Centered Footer */}
          <div className="footer text-center pt-1 space-y-0.5 text-xs text-stone-800 font-semibold tracking-wider">
            <p>THANK YOU. VISIT AGAIN.</p>
            <p>THANK YOU</p>
          </div>
        </div>

        {/* Modal Print & Close Buttons (Hidden during printing) */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E7E1D8] no-print">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[#783F24]"
          >
            <Printer className="h-4 w-4" />
            <span>Print Bill</span>
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
