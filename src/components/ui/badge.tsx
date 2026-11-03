import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "secondary" | "success" | "warning" | "danger" | "outline";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-[#FAF8F4] text-[#78716C] border-[#E7E1D8]",
    primary: "bg-[#783F24]/10 text-[#783F24] border-[#783F24]/20",
    secondary: "bg-[#F3E6D4] text-[#783F24] border-[#E7E1D8]",
    success: "bg-[#557A52]/10 text-[#557A52] border-[#557A52]/25",
    warning: "bg-[#B77932]/10 text-[#B77932] border-[#B77932]/25",
    danger: "bg-[#B94A48]/10 text-[#B94A48] border-[#B94A48]/25",
    outline: "text-[#29241F] border-[#E7E1D8] bg-white",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

