"use client"

import { cn } from "@/lib/utils"
import { User } from "lucide-react"

type Props = {
  name: string
  avatar?: string | null
  subtitle?: string
  pulse?: boolean
  size?: "md" | "lg"
  className?: string
}

export function PhoneCallAvatar({ name, avatar, subtitle, pulse = false, size = "lg", className }: Props) {
  const dimension = size === "lg" ? "h-32 w-32" : "h-20 w-20"
  const iconSize = size === "lg" ? "h-14 w-14" : "h-10 w-10"

  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <div className="relative">
        {pulse ? (
          <>
            <span className="absolute inset-0 animate-ping rounded-full bg-purple-500/30" aria-hidden />
            <span className="absolute -inset-3 animate-pulse rounded-full border border-purple-400/40" aria-hidden />
          </>
        ) : null}
        <div
          className={cn(
            "relative flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-900/40",
            dimension,
          )}
        >
          {avatar ? (
            <img src={avatar} alt="" className={cn("rounded-full object-cover", dimension)} />
          ) : (
            <User className={cn("text-white", iconSize)} />
          )}
        </div>
      </div>
      <h2 className={cn("mt-6 font-semibold text-white", size === "lg" ? "text-2xl" : "text-xl")}>{name}</h2>
      {subtitle ? <p className="mt-1 text-sm text-white/60">{subtitle}</p> : null}
    </div>
  )
}
