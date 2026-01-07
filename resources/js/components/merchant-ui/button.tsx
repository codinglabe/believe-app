import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const merchantButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] text-white shadow-lg shadow-[#FF1493]/50 hover:from-[#FF1FA3] hover:via-[#EC1F4C] hover:to-[#F98461] focus-visible:ring-[#FF1493]/50 transition-all duration-300",
        destructive:
          "bg-red-600 text-white shadow-xs hover:bg-red-700 focus-visible:ring-red-500/50",
        outline:
          "border-2 border-[#FF1493] bg-transparent shadow-xs shadow-[#FF1493]/20 hover:bg-gradient-to-r hover:from-[#FF1493]/20 hover:via-[#DC143C]/20 hover:to-[#E97451]/20 hover:text-white hover:border-[#FF1493] text-[#FF1493] transition-all duration-300",
        secondary:
          "bg-gradient-to-r from-[#FF1493]/30 via-[#DC143C]/30 to-[#E97451]/30 text-white shadow-xs hover:from-[#FF1493]/50 hover:via-[#DC143C]/50 hover:to-[#E97451]/50 border border-[#FF1493]/30",
        ghost: "hover:bg-[#FF1493]/20 hover:text-[#FF1493] text-white transition-all duration-300",
        link: "text-[#FF1493] underline-offset-4 hover:text-[#DC143C] hover:underline transition-colors",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function MerchantButton({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof merchantButtonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="merchant-button"
      className={cn(merchantButtonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { MerchantButton, merchantButtonVariants }

