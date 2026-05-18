"use client"

import { cn } from "@/lib/utils"

/** Preview-only BIU mark (top-right) when FFmpeg has not burned the logo into the MP4 yet. */
export function AiMediaStudioVideoLogoOverlay({ className }: { className?: string }) {
  return (
    <img
      src="/favicon-96x96.png"
      alt=""
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-3 right-3 z-10 h-10 w-10 object-contain opacity-90 sm:top-4 sm:right-4 sm:h-12 sm:w-12",
        "drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]",
        className,
      )}
    />
  )
}
