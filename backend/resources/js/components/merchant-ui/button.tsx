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
          "bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/25 hover:bg-[#1D4ED8] focus-visible:ring-[#2563EB]/40 transition-all duration-300",
        destructive:
          "bg-red-600 text-white shadow-xs hover:bg-red-700 focus-visible:ring-red-500/50",
        outline:
          "border-2 border-white/20 bg-transparent text-white shadow-xs hover:bg-white/10 hover:border-white/30 transition-all duration-300",
        secondary:
          "bg-white/10 text-white border border-white/15 shadow-xs hover:bg-white/15",
        ghost:
          "hover:bg-white/10 hover:text-white text-white transition-all duration-300",
        link: "text-[#2563EB] underline-offset-4 hover:text-[#1D4ED8] hover:underline transition-colors",
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
