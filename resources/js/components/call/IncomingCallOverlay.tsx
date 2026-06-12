"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { router } from "@inertiajs/react"
import { AnimatePresence, motion } from "framer-motion"
import { Music, Phone, PhoneOff, Settings2, User } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import {
  acceptUnityCall,
  clearUnityCallSessionActive,
  isUserBusyWithUnityCall,
  markUnityCallAcceptedLocally,
  markUnityCallSessionActive,
  markLeavingUnityCall,
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
import { subscribeUnityCallIncoming, subscribeUnityCallStatus, subscribeUnityCallTerminated, isUnityCallIncomingForUser, isUnityCallTerminated } from "@/lib/unityCallEvents"
import { consumeAnyPendingIncomingCall, clearAnyPendingIncomingCall, handleSwIncomingCallPayload } from "@/lib/swIncomingCallBridge"
import type { UnityCallStatusEvent } from "@/hooks/useUnityCallNotifications"
import { useUnityCallRingTimeout } from "@/hooks/useUnityCallRingTimeout"
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

function replaceRingUrlWithChat(chatRoomId: string | null): void {
  if (typeof window === "undefined") {
    return
  }
  const chatPath = chatRoomId ? `/chat?room=${encodeURIComponent(chatRoomId)}` : "/chat"
  if (`${window.location.pathname}${window.location.search}` !== chatPath) {
    window.history.replaceState({}, "", chatPath)
  }
}

function useLiveAuthUserId(initial?: number | null | undefined): number | null {
  const [userId, setUserId] = useState<number | null>(() => initial ?? readAuthUserId())

  useEffect(() => {
    setUserId(initial ?? readAuthUserId())
  }, [initial])

  useEffect(() => {
    const refresh = () => setUserId(readAuthUserId())
    refresh()
    return router.on("success", refresh)
  }, [])

  return userId
}

export default function IncomingCallOverlay({ authUserId }: Props) {
  const [incoming, setIncoming] = useState<UnityCallStatusEvent | null>(null)
  const [blockedByActiveCall, setBlockedByActiveCall] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showRingtoneSettings, setShowRingtoneSettings] = useState(false)
  const [ringtoneMode, setRingtoneMode] = useState<"default" | "custom">("default")
  const [ringtoneLabel, setRingtoneLabel] = useState("Default ringtone")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const userId = useLiveAuthUserId(authUserId)

  useEffect(() => {
    setRingtoneMode(getCallRingtoneMode())
  }, [])

  const dismiss = useCallback(() => {
    stopCallRingtone()
    if (incoming?.call.id) {
      clearUnityCallSessionActive(incoming.call.id)
    }
    setIncoming(null)
    setBlockedByActiveCall(false)
    setShowRingtoneSettings(false)
    void clearAnyPendingIncomingCall()
  }, [incoming?.call.id])

  const showIncoming = useCallback((payload: UnityCallStatusEvent) => {
    const self = payload.participants.find((p) => p.userId === userId)
    if (self?.role === "callee" && self.status === "accepted") {
      stopCallRingtone()
      const joinUrl = toInternalAppPath(payload.call.joinUrl || unityCallShowPath(payload.call.id))
      router.visit(joinUrl)
      return
    }

    if (isUserBusyWithUnityCall(payload.call.id)) {
      setBlockedByActiveCall(true)
      setIncoming(payload)
      return
    }

    setBlockedByActiveCall(false)
    markUnityCallSessionActive(payload.call.id)
    setIncoming((current) => (current?.call.id === payload.call.id ? current : payload))
    void startCallRingtone()
  }, [userId])

  useEffect(() => {
    if (!userId) {
      return
    }

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
        replaceRingUrlWithChat(params.get("chat_room_id"))
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
      replaceRingUrlWithChat(params.get("chat_room_id"))
    })
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
    return subscribeUnityCallIncoming((payload) => {
      const activeUserId = userId ?? readAuthUserId()
      if (!activeUserId || !isUnityCallIncomingForUser(payload, activeUserId)) {
        return
      }
      showIncoming(payload)
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

      if (incoming?.call.id === payload.call.id && payload.reason === "participant_missed") {
        const self = payload.participants.find((p) => p.userId === userId)
        if (self?.status === "missed") {
          dismiss()
        }
        return
      }

      if (incoming?.call.id === payload.call.id && isUnityCallTerminated(payload)) {
        dismiss()
      }
    },
    [userId, incoming?.call.id, showIncoming, dismiss],
  )

  useEffect(() => {
    return subscribeUnityCallStatus(onStatus)
  }, [onStatus])

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

  useUnityCallRingTimeout({
    callId: incoming?.call.id ?? 0,
    callStatus: incoming?.call.status ?? "",
    ringExpiresAt: incoming?.call.ringExpiresAt,
    enabled: Boolean(incoming) && !blockedByActiveCall,
    onExpired: dismiss,
  })

  const handleAccept = async () => {
    if (!incoming || busy || blockedByActiveCall) {
      return
    }
    setBusy(true)
    stopCallRingtone()
    const { ok, message } = await acceptUnityCall(incoming.call.id)
    setBusy(false)
    if (!ok) {
      toast.error(message?.trim() || "Could not join this call.")
      return
    }
    markUnityCallAcceptedLocally(incoming.call.id)
    const joinUrl = toInternalAppPath(incoming.call.joinUrl || unityCallShowPath(incoming.call.id))
    dismiss()
    router.visit(joinUrl)
  }

  const handleDecline = () => {
    if (!incoming) {
      return
    }

    const snapshot = incoming
    stopCallRingtone()
    markLeavingUnityCall(snapshot.call.id)
    dismiss()

    void terminateUnityCall({
      callId: snapshot.call.id,
      isCaller: false,
      callStatus: snapshot.call.status,
      selfStatus: "ringing",
    }).then(({ ok, message }) => {
      if (!ok) {
        toast.error(message?.trim() || "Could not decline the call.")
      }
    })
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

  const overlay = (
    <AnimatePresence>
      {incoming ? (
        <motion.div
          key={incoming.call.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex flex-col bg-gradient-to-b from-purple-950 via-[#120818] to-blue-950 text-white touch-none"
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

            {blockedByActiveCall ? (
              <div className="mt-8 max-w-sm rounded-2xl border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-center">
                <p className="text-sm font-medium text-amber-100">You are already in a call</p>
                <p className="mt-1 text-xs text-amber-100/80">
                  End your current call first, then you can answer this one.
                </p>
              </div>
            ) : null}

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
                disabled={busy || blockedByActiveCall}
                aria-label="Accept call"
                onClick={() => void handleAccept()}
              >
                <Phone className="h-7 w-7" />
              </Button>
              <span className="text-xs text-white/60">{blockedByActiveCall ? "Busy" : "Accept"}</span>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )

  if (typeof document === "undefined") {
    return overlay
  }

  return createPortal(overlay, document.body)
}
