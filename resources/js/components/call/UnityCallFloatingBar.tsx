"use client"

import { useEffect, useMemo, useState } from "react"
import { Mic, MicOff, Phone, PhoneOff, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { UnityCallSessionSnapshot } from "@/contexts/unity-call-session-context"
import { cn } from "@/lib/utils"

type Props = {
  session: UnityCallSessionSnapshot
  mediaConnected: boolean
  isAudioEnabled: boolean
  speakerOn: boolean
  onToggleMute: () => void
  onToggleSpeaker: () => void
  onReturn: () => void
  onEnd: () => void
}

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

export function UnityCallFloatingBar({
  session,
  mediaConnected,
  isAudioEnabled,
  speakerOn,
  onToggleMute,
  onToggleSpeaker,
  onReturn,
  onEnd,
}: Props) {
  const [elapsed, setElapsed] = useState(0)

  const anchor = useMemo(() => {
    if (session.call.answeredAt) {
      return new Date(session.call.answeredAt).getTime()
    }
    return mediaConnected ? Date.now() : null
  }, [mediaConnected, session.call.answeredAt])

  useEffect(() => {
    if (anchor === null) {
      setElapsed(0)
      return
    }

    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - anchor) / 1000)))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [anchor])

  const title = useMemo(() => {
    if (session.isGroupCall) {
      return session.call.chatRoomName?.trim() || "Group call"
    }
    if (session.isCaller) {
      const callee = session.participants.find((p) => p.role === "callee")
      return callee?.name ?? session.caller.name
    }
    return session.caller.name
  }, [session])

  return (
    <div
      className="fixed inset-x-0 top-0 z-[9997] border-b border-purple-500/30 bg-gradient-to-r from-purple-950/95 via-[#120818]/95 to-blue-950/95 px-3 py-2 text-white shadow-lg backdrop-blur-md safe-area-inset-top"
      data-unity-call-floating-bar=""
    >
      <div className="mx-auto flex max-w-lg items-center gap-2">
        <button
          type="button"
          onClick={onReturn}
          className="min-w-0 flex-1 text-left touch-manipulation active:opacity-90"
        >
          <span className="block truncate text-sm font-semibold">{title}</span>
          <span className="block text-xs text-purple-200/80">
            {mediaConnected ? formatElapsed(elapsed) : "Connecting…"} · Tap to return
          </span>
        </button>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn("h-9 w-9 shrink-0 text-white hover:bg-white/10", !isAudioEnabled && "text-amber-300")}
          aria-label={isAudioEnabled ? "Mute" : "Unmute"}
          onClick={onToggleMute}
        >
          {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </Button>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn("h-9 w-9 shrink-0 text-white hover:bg-white/10", speakerOn && "text-purple-300")}
          aria-label={speakerOn ? "Speaker on" : "Earpiece"}
          onClick={onToggleSpeaker}
        >
          <Volume2 className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          size="icon"
          className="h-9 w-9 shrink-0 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          aria-label="Return to call"
          onClick={onReturn}
        >
          <Phone className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          size="icon"
          variant="destructive"
          className="h-9 w-9 shrink-0"
          aria-label="End call"
          onClick={onEnd}
        >
          <PhoneOff className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
