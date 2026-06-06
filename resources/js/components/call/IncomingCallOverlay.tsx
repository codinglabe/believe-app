"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { router } from "@inertiajs/react"
import { useEcho } from "@laravel/echo-react"
import { AnimatePresence, motion } from "framer-motion"
import { Phone, PhoneOff, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { acceptUnityCall, declineUnityCall } from "@/lib/unityCall"
import type { UnityCallStatusEvent } from "@/hooks/useUnityCallNotifications"

type Props = {
  authUserId: number | null | undefined
}

function readAuthUserId(): number | null {
  if (typeof document === "undefined") {
    return null
  }
  const raw = document.querySelector('meta[name="user-id"]')?.getAttribute("content")
  const id = raw ? Number(raw) : NaN
  return Number.isFinite(id) && id > 0 ? id : null
}

export default function IncomingCallOverlay({ authUserId }: Props) {
  const [incoming, setIncoming] = useState<UnityCallStatusEvent | null>(null)
  const [busy, setBusy] = useState(false)
  const ringRef = useRef<HTMLAudioElement | null>(null)
  const userId = authUserId ?? readAuthUserId()

  const stopRingtone = useCallback(() => {
    const audio = ringRef.current
    if (!audio) {
      return
    }
    audio.pause()
    audio.currentTime = 0
  }, [])

  const playRingtone = useCallback(() => {
    stopRingtone()
    const audio = new Audio("/notification-sound.mp3")
    audio.loop = true
    ringRef.current = audio
    void audio.play().catch(() => {})
  }, [stopRingtone])

  const dismiss = useCallback(() => {
    stopRingtone()
    setIncoming(null)
  }, [stopRingtone])

  const onStatus = useCallback(
    (payload: UnityCallStatusEvent) => {
      if (!userId) {
        return
      }

      const self = payload.participants.find((p) => p.userId === userId)
      const isIncomingCallee =
        payload.reason === "incoming" &&
        self?.role === "callee" &&
        self.status === "ringing" &&
        payload.call.status === "ringing"

      if (isIncomingCallee) {
        setIncoming(payload)
        playRingtone()
        return
      }

      if (incoming?.call.id === payload.call.id) {
        if (["declined", "cancelled", "missed", "ended", "accepted"].includes(payload.reason)) {
          dismiss()
        }
      }
    },
    [userId, incoming?.call.id, playRingtone, dismiss],
  )

  useEcho<UnityCallStatusEvent>(
    userId ? `user.${userId}` : "user.disabled",
    ".call.status",
    onStatus,
    [userId, onStatus],
    "private",
  )

  useEffect(() => {
    return () => stopRingtone()
  }, [stopRingtone])

  const handleAccept = async () => {
    if (!incoming) {
      return
    }
    setBusy(true)
    stopRingtone()
    const ok = await acceptUnityCall(incoming.call.id)
    setBusy(false)
    if (!ok) {
      return
    }
    dismiss()
    router.visit(incoming.call.joinUrl)
  }

  const handleDecline = async () => {
    if (!incoming) {
      return
    }
    setBusy(true)
    stopRingtone()
    await declineUnityCall(incoming.call.id)
    setBusy(false)
    dismiss()
  }

  if (!userId) {
    return null
  }

  return (
    <AnimatePresence>
      {incoming ? (
        <motion.div
          key={incoming.call.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.94, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 12 }}
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-950/95 to-blue-950/95 shadow-2xl"
          >
            <div className="px-6 pt-8 pb-4 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600">
                {incoming.caller.avatar ? (
                  <img
                    src={incoming.caller.avatar}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-8 w-8 text-white" />
                )}
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-purple-200/80">
                Incoming audio call
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">{incoming.caller.name}</h2>
              {incoming.call.chatRoomName ? (
                <p className="mt-1 text-sm text-white/60">{incoming.call.chatRoomName}</p>
              ) : null}
            </div>

            <div className="flex gap-3 px-6 pb-8">
              <Button
                type="button"
                variant="destructive"
                className="h-12 flex-1 gap-2"
                disabled={busy}
                onClick={() => void handleDecline()}
              >
                <PhoneOff className="h-4 w-4" />
                Decline
              </Button>
              <Button
                type="button"
                className="h-12 flex-1 gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                disabled={busy}
                onClick={() => void handleAccept()}
              >
                <Phone className="h-4 w-4" />
                Accept
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
