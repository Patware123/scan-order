import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-[#E7E1D8]/70",
        className
      )}
      {...props}
    />
  );
}
