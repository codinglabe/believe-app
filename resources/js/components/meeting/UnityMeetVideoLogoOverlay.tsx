"use client"

import { cn } from "@/lib/utils"
import { BelieveInUnityBrandMark } from "@/components/site-title"

/** Non-interactive Believe In Unity mark over the VDO iframe (top-right; light + dark logo like {@link SiteTitle}). */
export default function UnityMeetVideoLogoOverlay({ className }: { className?: string }) {
  return (

    <div
      className={cn(
        "pointer-events-none absolute top-2 right-2 z-[2] sm:top-3 sm:right-3",
        "rounded-lg px-2 py-1.5 shadow-md backdrop-blur-sm ring-1",
        "bg-white/75 ring-black/10",
        "dark:bg-black/50 dark:ring-white/15",
        className,
      )}
    >
      <BelieveInUnityBrandMark variant="meet-overlay" className="gap-1.5" />
    </div>
  )
}
