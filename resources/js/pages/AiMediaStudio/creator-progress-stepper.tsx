"use client"

import type { LucideIcon } from "lucide-react"
import { CloudDownload, Loader2, PenLine, Play, Share2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export const CREATOR_PIPELINE_STEPS = [
  {
    title: "Tell us about your video",
    subtitle: "Add your story details.",
    icon: PenLine,
  },
  {
    title: "BIU AI builds your video",
    subtitle: "Our AI crafts the perfect prompt.",
    icon: Sparkles,
  },
  {
    title: "BIU renders your video",
    subtitle: "Our AI engine creates your video.",
    icon: Play,
  },
  {
    title: "Saved to your Dropbox",
    subtitle: "Automatically saved to your account.",
    icon: CloudDownload,
  },
  {
    title: "Ready to share",
    subtitle: "Download or share your video.",
    icon: Share2,
  },
] as const

export type CreatorProgressVariant = "compose" | "track"

function trackStepState(
  status: string,
  hints: { hasFalPrompt: boolean; hasFalCdn: boolean },
): { done: boolean[]; active: number | null; failedAt: number | null } {
  const n = CREATOR_PIPELINE_STEPS.length
  const done = Array(n).fill(false) as boolean[]
  const terminalOk = new Set(["ready_for_review", "approved", "published"])
  if (terminalOk.has(status)) {
    for (let i = 0; i < n; i++) done[i] = true
    return { done, active: null, failedAt: null }
  }

  if (status === "failed") {
    done[0] = true
    if (!hints.hasFalPrompt) {
      return { done, active: null, failedAt: 1 }
    }
    done[1] = true
    if (!hints.hasFalCdn) {
      return { done, active: null, failedAt: 2 }
    }
    done[2] = true
    return { done, active: null, failedAt: 3 }
  }

  done[0] = true

  if (status === "pending_prompt" || status === "building_prompt") {
    return { done, active: 1, failedAt: null }
  }

  if (status === "generating" || status === "rendering_video") {
    done[1] = true
    return { done, active: 2, failedAt: null }
  }

  if (status === "video_generated" || status === "uploading_to_dropbox") {
    done[1] = true
    done[2] = true
    return { done, active: 3, failedAt: null }
  }

  return { done: [true, false, false, false, false], active: 1, failedAt: null }
}

export function CreatorProgressStepper({
  variant,
  status,
  hasFalPrompt = false,
  hasFalCdn = false,
  className,
}: {
  variant: CreatorProgressVariant
  status?: string
  hasFalPrompt?: boolean
  hasFalCdn?: boolean
  className?: string
}) {
  let done: boolean[] = CREATOR_PIPELINE_STEPS.map(() => false)
  let active: number | null = 0
  let failedAt: number | null = null

  if (variant === "compose") {
    done = [false, false, false, false, false]
    active = 0
  } else if (status) {
    const s = trackStepState(status, { hasFalPrompt, hasFalCdn })
    done = s.done
    active = s.active
    failedAt = s.failedAt
  }

  return (
    <div
      className={cn(
        "overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <div className="flex min-w-[720px] gap-0 md:min-w-0">
        {CREATOR_PIPELINE_STEPS.map((step, i) => {
          const Icon = step.icon as LucideIcon
          const isDone = done[i] === true
          const isActive = active === i
          const isFailed = failedAt === i
          const showSpinner = isActive && variant === "track" && status !== "failed"
          return (
            <div key={step.title} className="relative flex min-w-0 flex-1 flex-col items-center">
              <div
                className={cn(
                  "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors md:h-11 md:w-11",
                  isFailed && "border-red-500 bg-red-500/15 text-red-600 dark:text-red-400",
                  !isFailed && isDone && !isActive && "border-emerald-500/80 bg-emerald-500 text-white dark:border-emerald-400",
                  !isFailed && isActive && "border-[#6338D9] bg-[#6338D9] text-white shadow-md shadow-[#6338D9]/30",
                  !isFailed && !isDone && !isActive && "border-slate-200 bg-white text-slate-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-500",
                )}
              >
                {isFailed ? (
                  <span className="text-xs font-bold">!</span>
                ) : isDone && !isActive ? (
                  <span className="text-xs font-bold">✓</span>
                ) : showSpinner ? (
                  <Loader2 className="h-4 w-4 animate-spin md:h-[18px] md:w-[18px]" />
                ) : (
                  <Icon className="h-4 w-4 md:h-[18px] md:w-[18px]" />
                )}
              </div>
              <p
                className={cn(
                  "mt-2 max-w-[140px] text-center text-[11px] font-semibold leading-tight md:text-xs",
                  isFailed && "text-red-600 dark:text-red-400",
                  !isFailed && (isActive || (variant === "compose" && i === 0)) && "text-[#6338D9]",
                  !isFailed && !(isActive || (variant === "compose" && i === 0)) && "text-slate-600 dark:text-zinc-400",
                )}
              >
                {step.title}
              </p>
              <p className="mt-0.5 hidden max-w-[160px] text-center text-[10px] leading-snug text-slate-500 sm:block dark:text-zinc-500">
                {step.subtitle}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
