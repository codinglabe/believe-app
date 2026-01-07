import * as React from "react"
import { cn } from "@/lib/utils"

function MerchantCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="merchant-card"
      className={cn(
        "w-full text-card-foreground flex flex-col gap-6 py-6 bg-gradient-to-br from-black/90 via-gray-900/80 to-black/90 backdrop-blur px-6 rounded-2xl shadow-xl transition-all duration-300",
        className
      )}
      {...props}
    />
  )
}

function MerchantCardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="merchant-card-header"
      className={cn("flex flex-col gap-1.5 px-4 md:px-6", className)}
      {...props}
    />
  )
}

function MerchantCardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <h1
      data-slot="merchant-card-title"
      className={cn("leading-none text-2xl font-bold text-white", className)}
      {...props}
    />
  )
}

function MerchantCardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="merchant-card-description"
      className={cn("text-gray-300 text-sm", className)}
      {...props}
    />
  )
}

function MerchantCardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="merchant-card-content"
      className={cn("px-4 md:px-6", className)}
      {...props}
    />
  )
}

function MerchantCardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="merchant-card-footer"
      className={cn("flex items-center px-6", className)}
      {...props}
    />
  )
}

export { 
  MerchantCard, 
  MerchantCardHeader, 
  MerchantCardFooter, 
  MerchantCardTitle, 
  MerchantCardDescription, 
  MerchantCardContent 
}

