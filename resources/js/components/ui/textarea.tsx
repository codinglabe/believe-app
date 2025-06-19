import * as React from "react"
import { cn } from "@/lib/utils"

function TextArea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
      <textarea
        rows={4}
        className={cn("w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm", className)}
        {...props}
      />
  );
};

export {TextArea};
