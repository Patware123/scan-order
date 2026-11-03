import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs sm:text-sm font-medium text-[#29241F]"
          >
            {label}
            {props.required && <span className="text-[#B94A48] ml-1">*</span>}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          ref={ref}
          className={cn(
            "flex h-11 w-full rounded-xl border border-[#E7E1D8] bg-white px-3.5 py-2 text-sm text-[#29241F] placeholder:text-[#A8A29E] transition-colors focus:border-[#783F24] focus:outline-none focus:ring-2 focus:ring-[#783F24]/20 disabled:cursor-not-allowed disabled:bg-[#FAF8F4] disabled:text-[#A8A29E]",
            error && "border-[#B94A48] focus:border-[#B94A48] focus:ring-[#B94A48]/20",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-[#B94A48] font-medium animate-fadeIn">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-xs text-[#78716C]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
