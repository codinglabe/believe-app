"use client"

import { useState } from "react"
import { router } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Video, X, Check } from "lucide-react"

const BRAND = { from: "#9333ea", to: "#2563eb" }

export type RecordingDeclineKind = "user" | "organization"

type Props = {
  open: boolean
  meetingTitle?: string | null
  organizerLabel?: string | null
  livestreamKind: RecordingDeclineKind
  livestreamId: number
  guestLabel?: string | null
  onAccepted: () => void
  returnToAfterDecline: string
  /** Light card on dim backdrop (guest join) vs dark sheet (Unity Meet join). */
  appearance?: "light" | "dark"
}

/**
 * Blocking consent before VDO.Ninja. Recording enforcement and host notification are ours—VDO.Ninja does not provide this API.
 */
export function RecordingConsentBarrier({
  open,
  meetingTitle,
  organizerLabel,
  livestreamKind,
  livestreamId,
  guestLabel,
  onAccepted,
  returnToAfterDecline,
  appearance = "dark",
}: Props) {
  const [busy, setBusy] = useState(false)

  if (!open) {
    return null
  }

  const decline = () => {
    setBusy(true)
    router.post(
      route("livestreams.recording-decline.store"),
      {
        livestream_kind: livestreamKind,
        livestream_id: livestreamId,
        guest_label: guestLabel?.trim() ? guestLabel.trim() : null,
        return_to: returnToAfterDecline,
      },
      {
        preserveScroll: false,
        onFinish: () => setBusy(false),
      }
    )
  }

  const cardClass =
    appearance === "light"
      ? "w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-2xl dark:border-white/10 dark:bg-neutral-900"
      : "w-full max-w-md rounded-2xl border border-zinc-800 bg-[#12121a] p-8 shadow-2xl"

  const textMain = appearance === "light" ? "text-neutral-900 dark:text-white" : "text-zinc-100"
  const textMuted = appearance === "light" ? "text-neutral-600 dark:text-neutral-400" : "text-zinc-400"

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="recording-consent-title" className={cardClass}>
        <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-purple-600/90 text-white shadow-lg">
          <Video className="h-9 w-9 shrink-0" aria-hidden />
          <span className="absolute right-2 top-2 h-3 w-3 rounded-full bg-red-500 ring-2 ring-purple-700" aria-hidden />
        </div>
        <h2 id="recording-consent-title" className={`text-center text-xl font-semibold tracking-tight ${textMain}`}>
          This meeting is being recorded
        </h2>
        {(meetingTitle ?? "").trim().length > 0 && (
          <p className={`mt-2 text-center text-sm font-medium ${textMuted}`}>{meetingTitle}</p>
        )}
        {(organizerLabel ?? "").trim().length > 0 && (
          <p className={`mt-0.5 text-center text-xs ${textMuted}`}>{organizerLabel}</p>
        )}
        <p className={`mt-4 text-center text-sm leading-relaxed ${textMuted}`}>
          By continuing, you agree to be recorded. If you decline, you cannot enter the meeting and the host will be
          notified.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button type="button" variant="outline" className="h-12 gap-2" disabled={busy} onClick={decline}>
            <X className="h-4 w-4" aria-hidden />
            Decline
          </Button>
          <Button
            type="button"
            className="h-12 gap-2 border-0 text-white"
            style={{ background: `linear-gradient(90deg, ${BRAND.from}, ${BRAND.to})` }}
            disabled={busy}
            onClick={() => onAccepted()}
          >
            <Check className="h-4 w-4" aria-hidden />
            Accept &amp; continue
          </Button>
        </div>
      </div>
    </div>
  )
}
