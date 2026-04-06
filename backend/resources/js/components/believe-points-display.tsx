"use client"

import React from "react"
import { Link } from "@inertiajs/react"
import { Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BelievePointsDisplayProps {
  balance: number
  className?: string
  variant?: "default" | "compact" | "mobile"
  showLabel?: boolean
}

export function BelievePointsDisplay({
  balance,
  className,
  variant = "default",
  showLabel = true
}: BelievePointsDisplayProps) {
  const formattedBalance = balance.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })

  const formattedCurrency = balance.toLocaleString('en-US', {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  if (variant === "compact") {
    return (
      <Link href={route("believe-points.index")}>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold",
            "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20",
            "border-blue-200 dark:border-blue-800",
            "hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/30 dark:hover:to-purple-900/30",
            "transition-all duration-200",
            className
          )}
        >
          <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="whitespace-nowrap text-blue-700 dark:text-blue-300">
            {formattedBalance}
          </span>
          {showLabel && (
            <span className="hidden sm:inline text-blue-600 dark:text-blue-400">
              Points
            </span>
          )}
        </Button>
      </Link>
    )
  }

  if (variant === "mobile") {
    return (
      <Link href={route("believe-points.index")}>
        <div className={cn(
          "flex items-center justify-between w-full p-3 rounded-lg",
          "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20",
          "border border-blue-200 dark:border-blue-800",
          className
        )}>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/30">
              <Coins className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Believe Points</p>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                {formattedBalance}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Value</p>
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {formattedCurrency}
            </p>
          </div>
        </div>
      </Link>
    )
  }

  // Default variant
  return (
    <Link href={route("believe-points.index")}>
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold",
          "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20",
          "border-blue-200 dark:border-blue-800",
          "hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/30 dark:hover:to-purple-900/30",
          "transition-all duration-200 shadow-sm hover:shadow-md",
          className
        )}
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          {showLabel && (
            <span className="hidden sm:inline text-blue-600 dark:text-blue-400 font-medium">
              Believe Points:
            </span>
          )}
          <span className="whitespace-nowrap text-blue-700 dark:text-blue-300 font-bold">
            {formattedBalance}
          </span>
        </div>
      </Button>
    </Link>
  )
}

