"use client"

import type { ReactNode } from "react"
import {
  ChevronDown,
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  Wifi,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PhoneCallAvatar } from "@/components/call/PhoneCallAvatar"
import { cn } from "@/lib/utils"
import type { UnityCallParticipantRow } from "@/hooks/useUnityCallNotifications"

type CallPhase = "ringing" | "connecting" | "connected" | "ended"

type Props = {
  displayName: string
  displayAvatar?: string | null
  statusHint: string
  statusLabel: string
  callPhase: CallPhase
  pulseAvatar: boolean
  isGroupCall: boolean
  groupCallerLine?: string | null
  isCaller: boolean
  callStatus: string
  showMinimize: boolean
  onMinimize: () => void
  showMediaControls: boolean
  isAudioEnabled: boolean
  speakerOn: boolean
  onToggleMute: () => void
  onToggleSpeaker: () => void
  showRingingCalleeControls: boolean
  showRejoinControls: boolean
  isRejoinCallee: boolean
  ringMode: boolean
  ending: boolean
  accepting: boolean
  onAccept: () => void
  onEnd: () => void
  permissionDenied: boolean
  onRetryPermission: () => void
  showConnectingSpinner: boolean
  connectionStatus: string
  acceptedCallees: UnityCallParticipantRow[]
  leftParticipants: UnityCallParticipantRow[]
  showCallerParticipantLists: boolean
  otherParty: UnityCallParticipantRow | null
  mediaConnected: boolean
}

function phaseConfig(phase: CallPhase): { label: string; dot: string; pill: string } {
  switch (phase) {
    case "connected":
      return {
        label: "Connected",
        dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
        pill: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
      }
    case "connecting":
      return {
        label: "Connecting",
        dot: "bg-purple-400 animate-pulse shadow-[0_0_8px_rgba(192,132,252,0.7)]",
        pill: "border-purple-400/30 bg-purple-500/10 text-purple-100",
      }
    case "ringing":
      return {
        label: "Ringing",
        dot: "bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.7)]",
        pill: "border-amber-400/30 bg-amber-500/10 text-amber-100",
      }
    default:
      return {
        label: "Call ended",
        dot: "bg-white/40",
        pill: "border-white/15 bg-white/5 text-white/70",
      }
  }
}

function ControlButton({
  label,
  active,
  activeClass,
  onClick,
  children,
  disabled = false,
  variant = "default",
}: {
  label: string
  active?: boolean
  activeClass?: string
  onClick: () => void
  children: ReactNode
  disabled?: boolean
  variant?: "default" | "danger" | "accept"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex flex-col items-center gap-2.5 touch-manipulation disabled:opacity-50"
    >
      <span
        className={cn(
          "flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full transition-all duration-200",
          "ring-1 ring-white/10 backdrop-blur-md",
          variant === "danger" &&
            "bg-gradient-to-b from-rose-500 to-rose-600 shadow-lg shadow-rose-950/50 group-active:scale-95",
          variant === "accept" &&
            "bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-950/40 group-active:scale-95",
          variant === "default" &&
            (active
              ? cn("bg-white/20 shadow-inner", activeClass)
              : "bg-white/10 hover:bg-white/15 group-active:scale-95"),
        )}
      >
        {children}
      </span>
      <span className="text-[11px] font-medium tracking-wide text-white/65">{label}</span>
    </button>
  )
}

function ParticipantPanel({
  title,
  tone,
  rows,
  trailing,
}: {
  title: string
  tone: "emerald" | "neutral"
  rows: UnityCallParticipantRow[]
  trailing?: (row: UnityCallParticipantRow) => string
}) {
  if (rows.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        "w-full rounded-2xl border px-4 py-3 backdrop-blur-md",
        tone === "emerald" ? "border-emerald-400/25 bg-emerald-500/5" : "border-white/10 bg-white/5",
      )}
    >
      <p
        className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.14em]",
          tone === "emerald" ? "text-emerald-300/80" : "text-white/45",
        )}
      >
        {title}
      </p>
      <ul className="mt-2.5 space-y-2">
        {rows.map((row) => (
          <li key={row.userId} className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium text-white/90">{row.name}</span>
            <span className={cn("shrink-0 text-xs capitalize", tone === "emerald" ? "text-emerald-300" : "text-white/50")}>
              {trailing ? trailing(row) : row.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function UnityCallScreen({
  displayName,
  displayAvatar,
  statusHint,
  statusLabel,
  callPhase,
  pulseAvatar,
  isGroupCall,
  groupCallerLine,
  isCaller,
  callStatus,
  showMinimize,
  onMinimize,
  showMediaControls,
  isAudioEnabled,
  speakerOn,
  onToggleMute,
  onToggleSpeaker,
  showRingingCalleeControls,
  showRejoinControls,
  isRejoinCallee,
  ringMode,
  ending,
  accepting,
  onAccept,
  onEnd,
  permissionDenied,
  onRetryPermission,
  showConnectingSpinner,
  connectionStatus,
  acceptedCallees,
  leftParticipants,
  showCallerParticipantLists,
  otherParty,
  mediaConnected,
}: Props) {
  const phase = phaseConfig(callPhase)

  return (
    <div className="fixed inset-0 z-[9998] flex min-h-[100dvh] flex-col overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0f0618] via-[#120818] to-[#0a1628]" />
      <div className="pointer-events-none absolute -left-24 top-[8%] h-72 w-72 rounded-full bg-purple-600/20 blur-[100px]" />
      <div className="pointer-events-none absolute -right-20 bottom-[18%] h-80 w-80 rounded-full bg-blue-600/15 blur-[100px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(147,51,234,0.12),transparent_55%)]" />

      <div className="relative flex min-h-[100dvh] flex-col">
        <header className="flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/10">
              <Wifi className="h-4 w-4 text-purple-300" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-300/80">Believe In Unity</p>
              <p className="text-xs text-white/50">Voice call</p>
            </div>
          </div>

          {showMinimize ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-white/80 backdrop-blur-md hover:bg-white/10 hover:text-white"
              onClick={onMinimize}
            >
              <ChevronDown className="h-4 w-4" />
              Minimize
            </Button>
          ) : (
            <span className="h-9 w-20" aria-hidden />
          )}
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-5 pb-4">
          <div className="flex w-full max-w-md flex-col items-center">
            {callPhase === "connected" || callPhase === "ended" ? (
              <div
                className={cn(
                  "mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-md",
                  phase.pill,
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", phase.dot)} aria-hidden />
                {phase.label}
              </div>
            ) : null}

            <PhoneCallAvatar
              name={displayName}
              avatar={displayAvatar}
              subtitle={isGroupCall ? (groupCallerLine ?? undefined) : undefined}
              pulse={pulseAvatar}
              size="xl"
              ringTone={callPhase === "connected" ? "connected" : callPhase === "ringing" ? "ringing" : "idle"}
            />

            {!isGroupCall ? (
              <p className="mt-3 max-w-[16rem] text-center text-sm leading-relaxed text-white/55">{statusHint}</p>
            ) : (
              <p className="mt-3 max-w-[16rem] text-center text-sm leading-relaxed text-white/55">{statusHint}</p>
            )}

            <div className="mt-8 flex flex-col items-center gap-1">
              <p className="font-mono text-4xl font-light tabular-nums tracking-tight text-white sm:text-5xl">
                {statusLabel}
              </p>
              {callPhase === "connected" ? (
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/35">Duration</p>
              ) : null}
            </div>

            {showCallerParticipantLists ? (
              <div className="mt-8 w-full space-y-3">
                <ParticipantPanel
                  title="In call"
                  tone="emerald"
                  rows={acceptedCallees}
                  trailing={() => (mediaConnected ? "Connected" : connectionStatus)}
                />
                <ParticipantPanel title="Unavailable" tone="neutral" rows={leftParticipants} />
              </div>
            ) : null}

            {!isGroupCall && !isCaller && otherParty && callStatus !== "ended" ? (
              <div className="mt-8 w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">With</p>
                <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{otherParty.name}</span>
                  <span className="shrink-0 text-xs capitalize text-emerald-300">
                    {otherParty.status === "accepted"
                      ? mediaConnected
                        ? "Connected"
                        : connectionStatus
                      : otherParty.status}
                  </span>
                </div>
              </div>
            ) : null}

            {permissionDenied ? (
              <div className="mt-8 w-full max-w-sm rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-center backdrop-blur-md">
                <p className="text-sm text-amber-100">Microphone access is required for this call.</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10"
                  onClick={onRetryPermission}
                >
                  Allow microphone
                </Button>
              </div>
            ) : null}

            {showConnectingSpinner ? (
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 backdrop-blur-md">
                <Loader2 className="h-4 w-4 animate-spin text-purple-300" />
                {connectionStatus}
              </div>
            ) : null}
          </div>
        </main>

        <footer className="relative border-t border-white/10 bg-black/25 px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-6 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">
            {showMediaControls ? (
              <div className="flex w-full items-center justify-center gap-10 sm:gap-14">
                <ControlButton
                  label={isAudioEnabled ? "Mute" : "Unmute"}
                  active={!isAudioEnabled}
                  activeClass="ring-amber-400/40"
                  onClick={onToggleMute}
                >
                  {isAudioEnabled ? (
                    <Mic className="h-6 w-6 text-white" />
                  ) : (
                    <MicOff className="h-6 w-6 text-amber-300" />
                  )}
                </ControlButton>

                <ControlButton label="End" variant="danger" onClick={onEnd} disabled={ending || accepting}>
                  <PhoneOff className="h-7 w-7 text-white" />
                </ControlButton>

                <ControlButton
                  label={speakerOn ? "Speaker" : "Earpiece"}
                  active={speakerOn}
                  activeClass="ring-purple-400/40"
                  onClick={onToggleSpeaker}
                >
                  {speakerOn ? (
                    <Volume2 className="h-6 w-6 text-purple-200" />
                  ) : (
                    <VolumeX className="h-6 w-6 text-white" />
                  )}
                </ControlButton>
              </div>
            ) : null}

            {showRingingCalleeControls ? (
              <div className="flex items-center justify-center gap-14 sm:gap-20">
                <ControlButton label="Decline" variant="danger" onClick={onEnd} disabled={ending || accepting}>
                  <PhoneOff className="h-7 w-7 text-white" />
                </ControlButton>
                <ControlButton label="Accept" variant="accept" onClick={onAccept} disabled={ending || accepting}>
                  {accepting ? (
                    <Loader2 className="h-7 w-7 animate-spin text-white" />
                  ) : (
                    <Phone className="h-7 w-7 text-white" />
                  )}
                </ControlButton>
              </div>
            ) : showRejoinControls ? (
              <ControlButton
                label={isRejoinCallee ? "Rejoin call" : "Accept"}
                variant="accept"
                onClick={onAccept}
                disabled={ending || accepting}
              >
                {accepting ? (
                  <Loader2 className="h-7 w-7 animate-spin text-white" />
                ) : (
                  <Phone className="h-7 w-7 text-white" />
                )}
              </ControlButton>
            ) : !showRingingCalleeControls || ringMode ? (
              ending ? (
                <div className="flex flex-col items-center gap-3 py-2">
                  <Loader2 className="h-9 w-9 animate-spin text-white/70" />
                  <span className="text-sm text-white/50">Returning to chat…</span>
                </div>
              ) : !showMediaControls ? (
                <ControlButton
                  label={
                    callStatus === "ringing"
                      ? isCaller
                        ? "Cancel"
                        : "Decline"
                      : isGroupCall && !isCaller
                        ? "Leave"
                        : "End call"
                  }
                  variant="danger"
                  onClick={onEnd}
                  disabled={ending || accepting}
                >
                  <PhoneOff className="h-7 w-7 text-white" />
                </ControlButton>
              ) : null
            ) : null}
          </div>
        </footer>
      </div>
    </div>
  )
}
