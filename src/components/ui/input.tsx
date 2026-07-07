import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-edge bg-surface px-3.5 text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-foreground/40",
        className,
      )}
      {...props}
    />
  );
}
