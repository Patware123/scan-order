import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost" | "accent";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none cursor-pointer";

    const variantStyles = {
      primary:
        "bg-[#783F24] text-white hover:bg-[#63331D] focus-visible:ring-[#783F24] shadow-sm",
      secondary:
        "bg-[#F3E6D4] text-[#783F24] hover:bg-[#ebd8c1] focus-visible:ring-[#A56A3F]",
      outline:
        "border border-[#E7E1D8] bg-white text-[#29241F] hover:bg-[#FAF8F4] focus-visible:ring-[#783F24] shadow-xs",
      accent:
        "bg-[#C58B45] text-white hover:bg-[#b07835] focus-visible:ring-[#C58B45]",
      danger:
        "bg-[#B94A48] text-white hover:bg-[#a33c3a] focus-visible:ring-[#B94A48] shadow-sm",
      ghost:
        "bg-transparent text-[#78716C] hover:bg-[#F3E6D4]/60 hover:text-[#29241F] focus-visible:ring-[#783F24]",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-10 px-4 text-sm gap-2",
      lg: "h-12 px-6 text-base gap-2.5 min-h-[44px]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

