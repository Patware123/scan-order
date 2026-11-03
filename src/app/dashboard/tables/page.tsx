"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import {
  QrCode,
  Plus,
  RefreshCw,
  Ban,
  Download,
  Printer,
  Users,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { restaurantApi, RestaurantTable } from "@/services/api/restaurant.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function TablesManagementPage() {
  const queryClient = useQueryClient();
  const { activeRestaurantId, activeRestaurant } = useAuth();

  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [viewQRTable, setViewQRTable] = React.useState<RestaurantTable | null>(null);

  const [regenerateTarget, setRegenerateTarget] = React.useState<RestaurantTable | null>(null);
  const [revokeTarget, setRevokeTarget] = React.useState<RestaurantTable | null>(null);

  // Queries
  const { data: tables, isLoading } = useQuery({
    queryKey: ["tables", activeRestaurantId],
    queryFn: () => (activeRestaurantId ? restaurantApi.getTables(activeRestaurantId) : null),
    enabled: !!activeRestaurantId,
  });

  // Regenerate QR mutation
  const regenMutation = useMutation({
    mutationFn: (tableId: string) => restaurantApi.regenerateQR(activeRestaurantId!, tableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables", activeRestaurantId] });
      setRegenerateTarget(null);
    },
  });

  // Revoke QR mutation
  const revokeMutation = useMutation({
    mutationFn: (tableId: string) => restaurantApi.revokeQR(activeRestaurantId!, tableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables", activeRestaurantId] });
      setRevokeTarget(null);
    },
  });

  if (!activeRestaurantId) {
    return (
      <div className="p-8 text-center text-[#78716C] bg-white rounded-3xl border border-[#E7E1D8]">
        Please select a restaurant first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#78716C] font-semibold">
            Dine-In Operations
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#29241F]">
            Tables & QR Tokens
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs py-1 px-3">
            {tables?.length || 0} Tables Active
          </Badge>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span>Add Table</span>
          </Button>
        </div>
      </div>

      {/* Tables Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : !tables || tables.length === 0 ? (
        <div className="rounded-3xl bg-white border border-[#E7E1D8] p-12 text-center space-y-3">
          <QrCode className="h-8 w-8 text-[#783F24] mx-auto" />
          <h3 className="text-sm font-bold text-[#29241F]">No Tables Added Yet</h3>
          <p className="text-xs text-[#78716C] max-w-sm mx-auto">
            Add tables to generate unique QR codes for contactless guest ordering.
          </p>
          <Button size="sm" variant="primary" onClick={() => setIsAddModalOpen(true)}>
            Add Table T01
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table) => {
            const token = table.qr_token?.token || table.activeToken;
            const hasQR = Boolean(token && (!table.qr_token || !table.qr_token.is_revoked));
            const tableLabel = table.label || (table as any).table_number || "Table";

            return (
              <div
                key={table.id}
                className="rounded-2xl border border-[#E7E1D8] bg-white p-4 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-[#29241F]">
                      {tableLabel}
                    </h3>
                    <div className="flex items-center gap-2 text-2xs text-[#78716C]">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {table.capacity} Guests
                      </span>
                      <span>•</span>
                      <span>
                        {table.ordering_mode === "SELF_SERVICE"
                          ? "Counter Pickup"
                          : "Table Service"}
                      </span>
                    </div>
                  </div>

                  <Badge variant={hasQR ? "success" : "danger"}>
                    {hasQR ? "QR Active" : "QR Inactive"}
                  </Badge>
                </div>

                {/* QR Token Status */}
                <div className="rounded-xl bg-[#FAF8F4] border border-[#E7E1D8] p-3 text-xs flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <span className="text-3xs uppercase font-bold text-[#78716C] block">
                      Active Token
                    </span>
                    <span className="font-mono text-2xs text-[#29241F] truncate block">
                      {token || "No Token Assigned"}
                    </span>
                  </div>

                  {hasQR && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 px-2.5 text-xs font-semibold shrink-0"
                      onClick={() => setViewQRTable({ ...table, label: tableLabel, activeToken: token })}
                    >
                      <QrCode className="h-3.5 w-3.5 mr-1" />
                      <span>View & Print</span>
                    </Button>
                  )}
                </div>

                {/* Table Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-[#FAF8F4] text-xs">
                  <button
                    onClick={() => setRegenerateTarget(table)}
                    className="flex items-center gap-1 text-[#783F24] font-semibold hover:underline cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Regenerate QR</span>
                  </button>

                  {hasQR && (
                    <button
                      onClick={() => setRevokeTarget(table)}
                      className="flex items-center gap-1 text-[#B94A48] font-semibold hover:underline cursor-pointer"
                    >
                      <Ban className="h-3 w-3" />
                      <span>Revoke</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Table Modal */}
      {isAddModalOpen && (
        <AddTableModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          restaurantId={activeRestaurantId}
        />
      )}

      {/* View & Print QR Modal */}
      {viewQRTable && activeRestaurant && (
        <QRViewerModal
          isOpen={true}
          onClose={() => setViewQRTable(null)}
          table={viewQRTable}
          restaurantName={activeRestaurant.name}
          restaurantSlug={activeRestaurant.slug}
        />
      )}

      {/* Regenerate Confirmation */}
      {regenerateTarget && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setRegenerateTarget(null)}
          onConfirm={() => regenMutation.mutate(regenerateTarget.id)}
          title={`Regenerate QR for ${regenerateTarget.label}?`}
          message="This will immediately invalidate the current QR token and generate a new secure token. You will need to print and replace the physical QR stand."
          confirmLabel="Regenerate Token"
          variant="warning"
          isLoading={regenMutation.isPending}
        />
      )}

      {/* Revoke Confirmation */}
      {revokeTarget && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setRevokeTarget(null)}
          onConfirm={() => revokeMutation.mutate(revokeTarget.id)}
          title={`Revoke QR for ${revokeTarget.label}?`}
          message="Scanning this QR code will no longer allow customers to place orders. You can regenerate a new QR code at any time."
          confirmLabel="Revoke QR"
          variant="danger"
          isLoading={revokeMutation.isPending}
        />
      )}
    </div>
  );
}

// Add Table Modal
function AddTableModal({
  isOpen,
  onClose,
  restaurantId,
}: {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
}) {
  const queryClient = useQueryClient();
  const [label, setLabel] = React.useState("");
  const [capacity, setCapacity] = React.useState("4");
  const [orderingMode, setOrderingMode] = React.useState("STAFF_SERVED");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      restaurantApi.createTable(restaurantId, {
        label: label.trim(),
        tableNumber: label.trim(),
        capacity: parseInt(capacity, 10) || 4,
        ordering_mode: orderingMode,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables", restaurantId] });
      onClose();
    },
    onError: (err: any) => {
      const msg =
        err?.response?.error?.message ||
        err?.message ||
        "Failed to create table. You may have reached your subscription limit.";
      setErrorMsg(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setErrorMsg("Table label / number is required.");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Add New Restaurant Table" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <Input
          label="Table Label / Number"
          placeholder="e.g. Table T01, Patio 04, VIP 1"
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />

        <Input
          label="Seating Capacity"
          type="number"
          min="1"
          max="50"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#29241F]">
            Service Mode
          </label>
          <select
            value={orderingMode}
            onChange={(e) => setOrderingMode(e.target.value)}
            className="w-full h-11 rounded-xl border border-[#E7E1D8] bg-white px-3 text-xs sm:text-sm text-[#29241F]"
          >
            <option value="STAFF_SERVED">Table Service (Staff Serves Food)</option>
            <option value="SELF_SERVICE">Self-Service (Guest Collects at Counter)</option>
          </select>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-[#B94A48]/30 bg-[#B94A48]/10 p-3 text-xs text-[#B94A48]">
            {errorMsg}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={mutation.isPending}>
            Add Table & Generate QR
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// QR Viewer & Tent Card Print Modal
function QRViewerModal({
  isOpen,
  onClose,
  table,
  restaurantName,
  restaurantSlug,
}: {
  isOpen: boolean;
  onClose: () => void;
  table: RestaurantTable;
  restaurantName: string;
  restaurantSlug: string;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const token = table.qr_token?.token || (table as any).activeToken;
  const tableTitle = table.label || (table as any).table_number || "Table";

  const qrUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/m/${restaurantSlug}/${token}`
      : `/m/${restaurantSlug}/${token}`;

  React.useEffect(() => {
    if (canvasRef.current && token) {
      QRCode.toCanvas(canvasRef.current, qrUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: "#783F24",
          light: "#FFFFFF",
        },
      });
    }
  }, [qrUrl, token]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `QR_${restaurantSlug}_${tableTitle.replace(/\s+/g, "_")}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Table QR Stand Card" size="sm">
      <div className="space-y-4 pt-1">
        {/* Printable Tent Card View */}
        <div
          id="printable-tent-card"
          className="rounded-3xl border-2 border-[#E7E1D8] bg-white p-6 text-center space-y-3 shadow-md"
        >
          <div className="text-2xs font-extrabold uppercase tracking-widest text-[#783F24]">
            {restaurantName}
          </div>
          <h2 className="text-xl font-black text-[#29241F]">
            {tableTitle}
          </h2>

          <div className="flex justify-center py-2">
            <canvas ref={canvasRef} className="rounded-2xl shadow-xs" />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-[#29241F]">
              Scan with Phone Camera to Order
            </p>
            <p className="text-3xs text-[#78716C]">
              No app download required • Instant live kitchen ordering
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-center pt-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1.5" />
            <span>Download PNG</span>
          </Button>

          <Button variant="primary" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1.5" />
            <span>Print Stand Card</span>
          </Button>
        </div>

        <div className="text-center pt-1">
          <a
            href={qrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-2xs text-[#783F24] hover:underline"
          >
            <span>Preview Customer Menu Link</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </Dialog>
  );
}
