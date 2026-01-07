import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const merchantBadgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-[color,box-shadow] overflow-auto",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] text-white shadow-lg shadow-[#FF1493]/50",
        secondary:
          "border-transparent bg-gradient-to-r from-[#FF1493]/30 via-[#DC143C]/30 to-[#E97451]/30 text-white border border-[#FF1493]/30",
        destructive:
          "border-transparent bg-red-600 text-white",
        outline:
          "text-white border-2 border-[#FF1493]",
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

