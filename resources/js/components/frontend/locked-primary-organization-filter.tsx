import { Lock } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/frontend/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export type OrganizationFilterLock = {
  locked: boolean
  primary_id: number | null
  primary_name: string | null
  primary_slug?: string | null
}

type LockedPrimaryOrganizationFilterProps = {
  lock?: OrganizationFilterLock | null
  onUnlock: () => void
  className?: string
  children: ReactNode
}

/**
 * Listing pages only: first visit defaults to primary org and shows a locked control until the user chooses "View all".
 */
export function LockedPrimaryOrganizationFilter({
  lock,
  onUnlock,
  className,
  children,
}: LockedPrimaryOrganizationFilterProps) {
  if (lock?.locked && lock.primary_name) {
    return (
      <div className={cn(className)}>
        <div className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-purple-500/30 bg-purple-500/5 px-3 py-2 dark:border-purple-500/25 dark:bg-purple-500/10">
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="flex min-w-0 cursor-default items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100"
                aria-label={`${lock.primary_name} — your primary organization`}
              >
                <Lock className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" aria-hidden />
                <span className="truncate" title={lock.primary_name}>
                  {lock.primary_name}
                </span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-center">
              It&apos;s your primary organization
            </TooltipContent>
          </Tooltip>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-purple-700 hover:bg-purple-500/10 hover:text-purple-800 dark:text-purple-300"
            onClick={onUnlock}
          >
            View all
          </Button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
