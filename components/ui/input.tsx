import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "h-9 w-full rounded-md border border-surface-border bg-white px-3 text-sm text-ink placeholder:text-ink-muted",
        "focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
