"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog } from "./dialog";
import { Button } from "./button";

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "primary";
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmationModalProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center pt-2">
        <div
          className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${
            variant === "danger"
              ? "bg-[#B94A48]/10 text-[#B94A48]"
              : variant === "warning"
              ? "bg-[#B77932]/10 text-[#B77932]"
              : "bg-[#783F24]/10 text-[#783F24]"
          }`}
        >
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-[#29241F] mb-1.5">{title}</h3>
        <p className="text-xs sm:text-sm text-[#78716C] mb-6">{message}</p>
        <div className="flex w-full gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "warning" ? "accent" : variant}
            className="flex-1"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
