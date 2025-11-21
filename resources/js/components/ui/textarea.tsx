import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      rows={4}
      className={cn("w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm", className)}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";

export { Textarea };
// Export as TextArea for backward compatibility
export { Textarea as TextArea };
