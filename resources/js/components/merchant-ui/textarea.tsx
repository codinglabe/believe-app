import * as React from "react"
import { cn } from "@/lib/utils"

const MerchantTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      rows={4}
      data-slot="merchant-textarea"
      className={cn(
        "border-[#2563EB]/35 placeholder:text-gray-500 selection:bg-[#2563EB]/20 selection:text-[#0A2540] flex w-full min-w-0 rounded-md border-2 bg-white px-3 py-2 text-base transition-all duration-300 outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none text-[#0A2540]",
        "focus-visible:border-[#2563EB] focus-visible:ring-[#2563EB]/30 focus-visible:ring-[3px]",
        "aria-invalid:ring-red-500/20 aria-invalid:border-red-500",
        className
      )}
      {...props}
    />
  )
})

MerchantTextarea.displayName = "MerchantTextarea"

export { MerchantTextarea }
