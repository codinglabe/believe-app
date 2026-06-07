"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { router } from "@inertiajs/react"
import { useEcho } from "@laravel/echo-react"
import { AnimatePresence, motion } from "framer-motion"
import { Music, Phone, PhoneOff, Settings2, User } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import {
  acceptUnityCall,
  markUnityCallAcceptedLocally,
  terminateUnityCall,
  toInternalAppPath,
  unityCallShowPath,
} from "@/lib/unityCall"
import { startCallRingtone, stopCallRingtone } from "@/lib/callRingtone"
import {
  clearCustomCallRingtone,
  getCallRingtoneMode,
  saveCustomCallRingtone,
  setCallRingtoneMode,
} from "@/lib/callRingtoneSettings"
import { subscribeUnityCallIncoming, subscribeUnityCallTerminated, isUnityCallTerminated } from "@/lib/unityCallEvents"
import { consumeAnyPendingIncomingCall, clearAnyPendingIncomingCall, handleSwIncomingCallPayload, rehydratePendingIncomingCall } from "@/lib/swIncomingCallBridge"
import type { UnityCallStatusEvent } from "@/hooks/useUnityCallNotifications"
import { PhoneCallAvatar } from "@/components/call/PhoneCallAvatar"

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
  const [showRingtoneSettings, setShowRingtoneSettings] = useState(false)
  const [ringtoneMode, setRingtoneMode] = useState<"default" | "custom">("default")
  const [ringtoneLabel, setRingtoneLabel] = useState("Default ringtone")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const userId = authUserId ?? readAuthUserId()

  useEffect(() => {
    setRingtoneMode(getCallRingtoneMode())
  }, [])

  const showIncoming = useCallback((payload: UnityCallStatusEvent) => {
    const self = payload.participants.find((p) => p.userId === userId)
    if (self?.role === "callee" && self.status === "accepted") {
      stopCallRingtone()
      const joinUrl = toInternalAppPath(payload.call.joinUrl || unityCallShowPath(payload.call.id))
      router.visit(joinUrl)
      return
    }
    setIncoming((current) => (current?.call.id === payload.call.id ? current : payload))
    void startCallRingtone()
  }, [userId])

  const dismiss = useCallback(() => {
    stopCallRingtone()
    setIncoming(null)
    setShowRingtoneSettings(false)
    void clearAnyPendingIncomingCall()
  }, [])

  useEffect(() => {
    if (!userId) {
      return
    }

    rehydratePendingIncomingCall()

    const params = new URLSearchParams(window.location.search)
    const callMatch = window.location.pathname.match(/\/unity-call\/(\d+)/)
    if (params.get("ring") !== "1" || !callMatch) {
      return
    }

    const callId = Number(callMatch[1])
    const callerId = Number(params.get("caller_id"))

    if (Number.isFinite(callerId) && callerId === userId) {
      router.visit(unityCallShowPath(callId), { replace: true })
      return
    }

    void consumeAnyPendingIncomingCall().then((pending) => {
      if (pending) {
        handleSwIncomingCallPayload(pending)
        return
      }

      if (!Number.isFinite(callId) || callId <= 0) {
        return
      }

      handleSwIncomingCallPayload({
        type: "incoming_call",
        call_id: String(callId),
        caller_id: params.get("caller_id") ?? "",
        caller_name: params.get("caller_name") ?? "",
        caller_avatar: params.get("caller_avatar") ?? "",
        chat_room_id: params.get("chat_room_id") ?? "",
        chat_room_name: params.get("chat_room_name") ?? "",
        is_group_call: params.get("is_group_call") ?? "",
        join_url: unityCallShowPath(callId),
        ring_url: `${window.location.pathname}${window.location.search}`,
      })
    })
  }, [userId])

  useEffect(() => {
    if (!userId) {
      return
    }

    const retryDelays = [400, 1500, 3500]
    const timers = retryDelays.map((delay) => window.setTimeout(rehydratePendingIncomingCall, delay))

    const onPageShow = () => rehydratePendingIncomingCall()
    const onFocus = () => rehydratePendingIncomingCall()

    window.addEventListener("pageshow", onPageShow)
    window.addEventListener("focus", onFocus)

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      window.removeEventListener("pageshow", onPageShow)
      window.removeEventListener("focus", onFocus)
    }
  }, [userId])

  useEffect(() => {
    if (!incoming) {
      return
    }

    document.body.style.overflow = "hidden"

    let wakeLock: WakeLockSentinel | null = null
    if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
      void navigator.wakeLock.request("screen").then((lock) => {
        wakeLock = lock
      }).catch(() => {})
    }

    return () => {
      document.body.style.overflow = ""
      void wakeLock?.release().catch(() => {})
    }
  }, [incoming])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") {
        return
      }
      rehydratePendingIncomingCall()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [])

  useEffect(() => {
    return subscribeUnityCallIncoming((payload) => {
      if (payload.caller?.id === userId || payload.call.status !== "ringing") {
        return
      }
      const self = payload.participants.find((p) => p.userId === userId)
      if (!self || (self.role === "callee" && self.status === "ringing")) {
        showIncoming(payload)
      }
    })
  }, [userId, showIncoming])

  const onStatus = useCallback(
    (payload: UnityCallStatusEvent) => {
      if (!userId) {
        return
      }

      const self = payload.participants.find((p) => p.userId === userId)
      const isIncomingCallee =
        payload.reason === "incoming" &&
        payload.caller?.id !== userId &&
        payload.call.status === "ringing" &&
        (!self || (self.role === "callee" && self.status === "ringing"))

      if (isIncomingCallee) {
        showIncoming(payload)
        return
      }

      if (incoming?.call.id === payload.call.id && payload.reason === "accepted") {
        const self = payload.participants.find((p) => p.userId === userId)
        if (self?.role === "callee" && self.status === "accepted") {
          markUnityCallAcceptedLocally(payload.call.id)
          const joinUrl = toInternalAppPath(payload.call.joinUrl || unityCallShowPath(payload.call.id))
          dismiss()
          const onCallPage = window.location.pathname === unityCallShowPath(payload.call.id)
          if (!onCallPage || new URLSearchParams(window.location.search).get("ring") === "1") {
            router.visit(joinUrl)
          }
          return
        }
      }

      if (incoming?.call.id === payload.call.id && isUnityCallTerminated(payload)) {
        dismiss()
      }
    },
    [userId, incoming?.call.id, showIncoming, dismiss],
  )

  useEcho<UnityCallStatusEvent>(
    userId ? `user.${userId}` : "user.disabled",
    ".call.status",
    onStatus,
    [userId, onStatus],
    "private",
  )

  useEffect(() => {
    return subscribeUnityCallTerminated((payload) => {
      if (incoming?.call.id === payload.call.id) {
        dismiss()
        return
      }
      const self = payload.participants.find((p) => p.userId === userId)
      if (self && isUnityCallTerminated(payload)) {
        stopCallRingtone()
      }
    })
  }, [incoming?.call.id, dismiss, userId])

  useEffect(() => {
    return () => stopCallRingtone()
  }, [])

  const handleAccept = async () => {
    if (!incoming || busy) {
      return
    }
    setBusy(true)
    stopCallRingtone()
    const { ok } = await acceptUnityCall(incoming.call.id)
    setBusy(false)
    if (!ok) {
      return
    }
    markUnityCallAcceptedLocally(incoming.call.id)
    const joinUrl = toInternalAppPath(incoming.call.joinUrl || unityCallShowPath(incoming.call.id))
    dismiss()
    router.visit(joinUrl)
  }

  const handleDecline = async () => {
    if (!incoming) {
      return
    }
    setBusy(true)
    stopCallRingtone()
    const { ok, message } = await terminateUnityCall({
      callId: incoming.call.id,
      isCaller: false,
      callStatus: incoming.call.status,
      selfStatus: "ringing",
    })
    setBusy(false)
    if (!ok) {
      toast.error(message?.trim() || "Could not decline the call. Please try again.")
      return
    }
    dismiss()
  }

  const handleRingtoneFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) {
      return
    }
    await saveCustomCallRingtone(file)
    setRingtoneMode("custom")
    setRingtoneLabel(file.name)
  }

  const handleUseDefaultRingtone = async () => {
    await clearCustomCallRingtone()
    setCallRingtoneMode("default")
    setRingtoneMode("default")
    setRingtoneLabel("Default ringtone")
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
          className="fixed inset-0 z-[9999] flex flex-col bg-gradient-to-b from-purple-950 via-[#120818] to-blue-950 text-white touch-none"
          data-incoming-call-overlay=""
        >
          <div className="flex items-center justify-between px-4 pt-4 safe-area-inset-top">
            <p className="text-sm font-medium text-purple-200/80">Incoming call</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Ringtone settings"
              onClick={() => setShowRingtoneSettings((open) => !open)}
            >
              <Settings2 className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8">
            <PhoneCallAvatar
              name={
                incoming.call.isGroupCall
                  ? incoming.call.chatRoomName?.trim() || "Group call"
                  : incoming.caller.name
              }
              avatar={incoming.caller.avatar}
              subtitle={
                incoming.call.isGroupCall
                  ? `${incoming.caller.name} is calling`
                  : incoming.call.chatRoomName ?? "Audio call"
              }
              pulse
            />

            {showRingtoneSettings ? (
              <div className="mt-8 w-full max-w-sm rounded-2xl border border-white/10 bg-black/30 p-4 text-left">
                <p className="text-sm font-semibold text-white">Ringtone</p>
                <p className="mt-1 text-xs text-white/60">Use the default ring or choose a sound from your device.</p>
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm ${
                      ringtoneMode === "default" ? "border-purple-400 bg-purple-500/10" : "border-white/10"
                    }`}
                    onClick={() => void handleUseDefaultRingtone()}
                  >
                    <Music className="h-4 w-4 shrink-0" />
                    Default ringtone
                  </button>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm ${
                      ringtoneMode === "custom" ? "border-purple-400 bg-purple-500/10" : "border-white/10"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <User className="h-4 w-4 shrink-0" />
                    {ringtoneMode === "custom" ? ringtoneLabel : "Choose from device…"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    aria-label="Choose ringtone from device"
                    onChange={(event) => void handleRingtoneFile(event)}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-center gap-10 px-6 pb-10 safe-area-inset-bottom">
            <div className="flex flex-col items-center gap-2">
              <Button
                type="button"
                variant="destructive"
                className="h-16 w-16 rounded-full p-0 shadow-lg"
                disabled={busy}
                aria-label="Decline call"
                onClick={() => void handleDecline()}
              >
                <PhoneOff className="h-7 w-7" />
              </Button>
              <span className="text-xs text-white/60">Decline</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Button
                type="button"
                className="h-16 w-16 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 p-0 shadow-lg hover:from-purple-700 hover:to-blue-700"
                disabled={busy}
                aria-label="Accept call"
                onClick={() => void handleAccept()}
              >
                <Phone className="h-7 w-7" />
              </Button>
              <span className="text-xs text-white/60">Accept</span>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
