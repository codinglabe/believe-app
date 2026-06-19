"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Mic, MicOff, PhoneOff, User } from "lucide-react"
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

type Point = { x: number; y: number }

const BUBBLE_WIDTH = 96
const BUBBLE_HEIGHT = 128
const EDGE_PADDING = 12
const MOBILE_BOTTOM_NAV_OFFSET = 84
const POSITION_STORAGE_KEY = "unity_call_bubble_position"
const DRAG_THRESHOLD_PX = 6

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

function readSafeAreaBottom(): number {
  if (typeof window === "undefined") {
    return 0
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue("--sat-bottom").trim()
  const parsed = Number.parseFloat(value)
  if (Number.isFinite(parsed)) {
    return parsed
  }

  return 0
}

function defaultBubblePosition(): Point {
  if (typeof window === "undefined") {
    return { x: EDGE_PADDING, y: EDGE_PADDING }
  }

  const mobileBottomNav = window.matchMedia("(max-width: 1535px)").matches
  const bottomOffset = mobileBottomNav
    ? MOBILE_BOTTOM_NAV_OFFSET + readSafeAreaBottom() + EDGE_PADDING
    : EDGE_PADDING + 8

  return {
    x: Math.max(EDGE_PADDING, window.innerWidth - BUBBLE_WIDTH - EDGE_PADDING),
    y: Math.max(EDGE_PADDING, window.innerHeight - BUBBLE_HEIGHT - bottomOffset),
  }
}

function clampBubblePosition(point: Point): Point {
  if (typeof window === "undefined") {
    return point
  }

  const maxX = Math.max(EDGE_PADDING, window.innerWidth - BUBBLE_WIDTH - EDGE_PADDING)
  const maxY = Math.max(EDGE_PADDING, window.innerHeight - BUBBLE_HEIGHT - EDGE_PADDING)

  return {
    x: Math.min(maxX, Math.max(EDGE_PADDING, point.x)),
    y: Math.min(maxY, Math.max(EDGE_PADDING, point.y)),
  }
}

function readStoredPosition(): Point | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const raw = sessionStorage.getItem(POSITION_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Point
    if (typeof parsed?.x !== "number" || typeof parsed?.y !== "number") {
      return null
    }

    return clampBubblePosition(parsed)
  } catch {
    return null
  }
}

export function UnityCallFloatingBar({
  session,
  mediaConnected,
  isAudioEnabled,
  onToggleMute,
  onReturn,
  onEnd,
}: Props) {
  const bubbleRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; origin: Point; moved: boolean } | null>(null)
  const positionRef = useRef<Point>(defaultBubblePosition())

  const [position, setPosition] = useState<Point>(() => readStoredPosition() ?? defaultBubblePosition())
  const [isDragging, setIsDragging] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  positionRef.current = position

  const anchor = useMemo(() => {
    if (!mediaConnected) {
      return null
    }
    if (session.call.answeredAt) {
      return new Date(session.call.answeredAt).getTime()
    }
    return Date.now()
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
      const callee = session.participants.find((participant) => participant.role === "callee")
      return callee?.name ?? session.caller.name
    }
    return session.caller.name
  }, [session])

  const avatarUrl = useMemo(() => {
    if (session.isCaller) {
      return session.participants.find((participant) => participant.role === "callee")?.avatar ?? null
    }
    return session.caller.avatar ?? null
  }, [session])

  const persistPosition = useCallback((next: Point) => {
    try {
      sessionStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore storage failures
    }
  }, [])

  const updatePosition = useCallback(
    (next: Point) => {
      const clamped = clampBubblePosition(next)
      setPosition(clamped)
      persistPosition(clamped)
    },
    [persistPosition],
  )

  useEffect(() => {
    const handleResize = () => {
      updatePosition(positionRef.current)
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [updatePosition])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("[data-bubble-action]")) {
      return
    }

    event.preventDefault()
    bubbleRef.current?.setPointerCapture(event.pointerId)
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      origin: positionRef.current,
      moved: false,
    }
    setIsDragging(true)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) {
      return
    }

    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY

    if (Math.abs(deltaX) > DRAG_THRESHOLD_PX || Math.abs(deltaY) > DRAG_THRESHOLD_PX) {
      drag.moved = true
    }

    updatePosition({
      x: drag.origin.x + deltaX,
      y: drag.origin.y + deltaY,
    })
  }

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    dragRef.current = null
    setIsDragging(false)

    if (bubbleRef.current?.hasPointerCapture(event.pointerId)) {
      bubbleRef.current.releasePointerCapture(event.pointerId)
    }

    if (drag && !drag.moved) {
      onReturn()
    }
  }

  const statusLabel = mediaConnected ? formatElapsed(elapsed) : "…"

  return (
    <div
      ref={bubbleRef}
      data-unity-call-floating-bar=""
      className={cn(
        "fixed z-[9997] touch-none select-none",
        isDragging ? "cursor-grabbing" : "cursor-grab",
      )}
      style={{
        left: position.x,
        top: position.y,
        width: BUBBLE_WIDTH,
        height: BUBBLE_HEIGHT,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
    >
      <div
        className={cn(
          "relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-purple-900 via-[#120818] to-blue-950 text-white shadow-2xl shadow-purple-950/50 ring-1 ring-purple-500/20",
          isDragging && "scale-[1.02] shadow-purple-900/70",
          !isDragging && "transition-transform duration-150",
        )}
      >
        <div className="relative flex flex-1 items-center justify-center overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
              <User className="h-10 w-10 text-white/90" aria-hidden />
            </div>
          )}

          <span
            className={cn(
              "absolute right-2 top-2 h-2.5 w-2.5 rounded-full border border-white/80",
              mediaConnected ? "bg-emerald-400" : "animate-pulse bg-amber-400",
            )}
            aria-hidden
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-2 pb-2 pt-8">
            <p className="truncate text-center text-[11px] font-semibold leading-tight">{title}</p>
            <p className="mt-0.5 text-center font-mono text-[10px] tabular-nums text-purple-200/90">
              {statusLabel}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-white/10 bg-black/35 px-1.5 py-1">
          <button
            type="button"
            data-bubble-action=""
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg touch-manipulation active:scale-95",
              isAudioEnabled ? "text-white/90 hover:bg-white/10" : "bg-amber-500/20 text-amber-300",
            )}
            aria-label={isAudioEnabled ? "Mute" : "Unmute"}
            onClick={onToggleMute}
          >
            {isAudioEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            data-bubble-action=""
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white touch-manipulation hover:bg-rose-500 active:scale-95"
            aria-label="End call"
            onClick={onEnd}
          >
            <PhoneOff className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
