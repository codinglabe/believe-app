import { CheckCircle, XCircle, TriangleAlert, InfoIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type * as React from "react"

interface NotificationProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description: React.ReactNode // Still accepts React.ReactNode, which includes strings
}

export function Warning({ title, description, className, ...props }: NotificationProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 rounded-lg shadow-lg",
        "bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-700 text-yellow-700 dark:text-yellow-200",
        className,
      )}
      role="alert"
      {...props}
    >
      <div className="flex-shrink-0">
        <TriangleAlert className="h-8 w-8" /> {/* Increased icon size */}
      </div>
      <div className="flex-grow">
        {title && <h3 className="text-lg font-semibold mb-1">{title}</h3>}
        <p className="text-sm">{description}</p>
      </div>
    </div>
  )
}

export function Success({ title, description, className, ...props }: NotificationProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 rounded-lg shadow-lg",
        "bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-200",
        className,
      )}
      role="alert"
      {...props}
    >
      <div className="flex-shrink-0">
        <CheckCircle className="h-8 w-8" /> {/* Increased icon size for consistency */}
      </div>
      <div className="flex-grow">
        {title && <h3 className="text-lg font-semibold mb-1">{title}</h3>}
        <p className="text-sm">{description}</p>
      </div>
    </div>
  )
}

export function Error({ title, description, className, ...props }: NotificationProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 rounded-lg shadow-lg",
        "bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200",
        className,
      )}
      role="alert"
      {...props}
    >
      <div className="flex-shrink-0">
        <XCircle className="h-8 w-8" /> {/* Increased icon size */}
      </div>
      <div className="flex-grow">
        {title && <h3 className="text-lg font-semibold mb-1">{title}</h3>}
        <p className="text-sm">{description}</p>
      </div>
    </div>
  )
}

export function Info({ title, description, className, ...props }: NotificationProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 rounded-lg shadow-lg",
        "bg-blue-100 dark:bg-blue-900 border border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-200",
        className,
      )}
      role="alert"
      {...props}
    >
      <div className="flex-shrink-0">
        <InfoIcon className="h-8 w-8" /> {/* Increased icon size for consistency */}
      </div>
      <div className="flex-grow">
        {title && <h3 className="text-lg font-semibold mb-1">{title}</h3>}
        <p className="text-sm">{description}</p>
      </div>
    </div>
  )
}
