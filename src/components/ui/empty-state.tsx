import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "./button";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E7E1D8] bg-white/60 p-8 sm:p-12 text-center",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3E6D4] text-[#783F24] mb-4">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-[#29241F] mb-1">{title}</h3>
      <p className="max-w-sm text-xs sm:text-sm text-[#78716C] mb-5">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
