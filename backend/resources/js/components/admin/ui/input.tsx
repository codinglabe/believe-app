import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  // Special handling for date and time inputs to preserve native icons
  const isDateTimeInput = type === "date" || type === "time" || type === "datetime-local"

  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        // Special styles for date/time inputs to show native icons
        isDateTimeInput && [
          "[&::-webkit-calendar-picker-indicator]:opacity-100",
          "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
          "[&::-webkit-calendar-picker-indicator]:hover:bg-muted",
          "[&::-webkit-calendar-picker-indicator]:rounded",
          "[&::-webkit-calendar-picker-indicator]:p-1",
          "[&::-webkit-calendar-picker-indicator]:transition-colors",
          "[&::-webkit-datetime-edit]:text-foreground",
          "[&::-webkit-datetime-edit-fields-wrapper]:text-foreground",
          "[&::-webkit-datetime-edit-text]:text-muted-foreground",
          "[&::-webkit-datetime-edit-month-field]:text-foreground",
          "[&::-webkit-datetime-edit-day-field]:text-foreground",
          "[&::-webkit-datetime-edit-year-field]:text-foreground",
          "[&::-webkit-datetime-edit-hour-field]:text-foreground",
          "[&::-webkit-datetime-edit-minute-field]:text-foreground",
          "[&::-webkit-datetime-edit-ampm-field]:text-foreground",
        ],
        className,
      )}
      ref={ref}
      {...props}
    />
  )
})

Input.displayName = "Input"

export { Input }
