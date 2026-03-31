import * as React from "react"
import { cn } from "@/lib/utils"

function MerchantInput({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="merchant-input"
      className={cn(
        "border-[#2563EB]/30 file:text-foreground placeholder:text-white/50 selection:bg-[#2563EB]/25 selection:text-white flex h-9 w-full min-w-0 rounded-md border-2 bg-black/30 backdrop-blur px-3 py-1 text-base transition-all duration-300 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm text-white",
        "focus-visible:border-[#2563EB] focus-visible:ring-[#2563EB]/35 focus-visible:ring-[3px]",
        "aria-invalid:ring-red-500/20 aria-invalid:border-red-500",
        className
      )}
      {...props}
    />
  )
}

export { MerchantInput }
