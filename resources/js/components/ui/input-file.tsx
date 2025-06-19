import * as React from "react"
import { cn } from "@/lib/utils"


function InputFile({ className, ...props }: React.ComponentProps<"input">) {
    return (
      <input
        type="file"
        className={cn(
          "block w-full cursor-pointer sm:border border-input bg-transparent px-1 py-1 text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100",
          "dark:file:bg-blue-900 dark:file:text-blue-300 dark:hover:file:bg-blue-800",
          "rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
          className
        )}
        {...props}
      />
    )
  }

export { InputFile }
