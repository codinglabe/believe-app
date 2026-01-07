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
        "border-[#FF1493]/40 file:text-foreground placeholder:text-gray-400 dark:placeholder:text-gray-500 selection:bg-[#FF1493] selection:text-white flex w-full min-w-0 rounded-md border-2 bg-gray-900/50 backdrop-blur px-3 py-2 text-base transition-all duration-300 outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none text-white",
        "focus-visible:border-[#FF1493] focus-visible:ring-[#FF1493]/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-red-500/20 dark:aria-invalid:ring-red-500/40 aria-invalid:border-red-500",
        className
      )}
      {...props}
    />
  );
});

MerchantTextarea.displayName = "MerchantTextarea";

export { MerchantTextarea };

