"use client"

import { cn } from "@/lib/utils"
import { User } from "lucide-react"

type Props = {
  name: string
  avatar?: string | null
  subtitle?: string
  pulse?: boolean
  size?: "md" | "lg" | "xl"
  ringTone?: "idle" | "ringing" | "connected"
  className?: string
}

export function PhoneCallAvatar({
  name,
  avatar,
  subtitle,
  pulse = false,
  size = "lg",
  ringTone = "idle",
  className,
}: Props) {
  const dimension =
    size === "xl" ? "h-36 w-36 sm:h-40 sm:w-40" : size === "lg" ? "h-32 w-32" : "h-20 w-20"
  const iconSize = size === "xl" ? "h-16 w-16" : size === "lg" ? "h-14 w-14" : "h-10 w-10"
  const titleSize = size === "xl" ? "text-2xl sm:text-3xl" : size === "lg" ? "text-2xl" : "text-xl"

  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <div className="relative">
        {pulse ? (
          <>
            <span className="absolute inset-0 animate-ping rounded-full bg-purple-500/25" aria-hidden />
            <span
              className="absolute -inset-4 animate-pulse rounded-full border border-purple-400/30"
              aria-hidden
            />
          </>
        ) : null}

        <div
          className={cn(
            "rounded-full p-[3px]",
            ringTone === "connected" && "bg-gradient-to-r from-emerald-400 to-teal-400",
            ringTone === "ringing" && "bg-gradient-to-r from-purple-500 to-blue-500",
            ringTone === "idle" && "bg-gradient-to-r from-purple-600/50 to-blue-600/50",
          )}
        >
          <div
            className={cn(
              "relative flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-600 to-blue-600 shadow-2xl shadow-purple-950/50 ring-1 ring-white/10",
              dimension,
            )}
          >
            {avatar ? (
              <img src={avatar} alt="" className={cn("rounded-full object-cover", dimension)} draggable={false} />
            ) : (
              <User className={cn("text-white/90", iconSize)} />
            )}
          </div>
        </div>
      </div>

      <h2 className={cn("mt-7 font-semibold tracking-tight text-white", titleSize)}>{name}</h2>
      {subtitle ? <p className="mt-1.5 max-w-[18rem] text-sm leading-snug text-white/55">{subtitle}</p> : null}
    </div>
  )
}
