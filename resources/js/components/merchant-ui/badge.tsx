import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const merchantBadgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-[color,box-shadow] overflow-auto",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#2563EB] text-white shadow-none",
        secondary:
          "border-transparent bg-[#2563EB]/12 text-[#0A2540] border border-[#2563EB]/25",
        destructive: "border-transparent bg-red-600 text-white",
        outline: "text-[#0A2540] border-2 border-[#2563EB] bg-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function MerchantBadge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof merchantBadgeVariants>) {
  return (
    <span
      data-slot="merchant-badge"
      className={cn(merchantBadgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { MerchantBadge, merchantBadgeVariants }
