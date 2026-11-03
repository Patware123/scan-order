"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  size = "md",
}: DialogProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
    "2xl": "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#29241F]/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Centering Wrapper: min-h-full with p-3 sm:p-6 ensures no negative overflow clipping at the top */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-6 text-center">
        {/* Modal Surface */}
        <div
          className={cn(
            "relative w-full rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-[#E7E1D8] transition-all my-auto z-10 text-left max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col",
            sizeClasses[size],
            className
          )}
        >
          {/* Fixed Header */}
          {(title || description) && (
            <div className="flex items-start justify-between pb-3 border-b border-[#FAF8F4] shrink-0">
              <div className="space-y-0.5 pr-6">
                {title && (
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#29241F]">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-xs text-[#78716C]">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-[#78716C] hover:bg-[#FAF8F4] hover:text-[#29241F] transition-colors cursor-pointer shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {!title && !description && (
            <div className="absolute top-4 right-4 z-20">
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-[#78716C] hover:bg-[#FAF8F4] hover:text-[#29241F] transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Scrollable Content Area */}
          <div className="overflow-y-auto flex-1 mt-3 pr-1 -mr-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
