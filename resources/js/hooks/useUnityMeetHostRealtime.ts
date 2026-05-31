import { useEcho } from "@laravel/echo-react"
import { useCallback, useEffect, useState } from "react"
import type { UnityMeetParticipant } from "@/components/meeting/UnityMeetParticipantPanel"

export type RecordingConsentDeclineRow = {
  id: number
  guestLabel: string | null
  createdAt: string | null
}

type StreamingQueueStatus = {
  status?: string | null
  livestreamStatus?: string
  streamStopRequested?: boolean
  updatedAt?: string | null
  failureReason?: string | null
}

type LivestreamRealtimeSlice = {
  status?: string
  isPublic?: boolean
  startedAt?: string | null
  endedAt?: string | null
  meetingSessionKey?: number
  canStartMeeting?: boolean
  canSetUnityLive?: boolean
  canQueueYoutubeLive?: boolean
  canGoLive?: boolean
  streamingQueueStatus?: StreamingQueueStatus | null
  hasActiveStreamingJob?: boolean
}

export type UnityMeetHostDashboardPayload = {
  reason: string
  livestream?: LivestreamRealtimeSlice
  recordingConsentDeclines?: RecordingConsentDeclineRow[]
  participantRoster?: UnityMeetParticipant[]
}

type Options<TLivestream extends LivestreamRealtimeSlice> = {
  broadcastChannel: string | null | undefined
  livestream: TLivestream
  recordingConsentDeclines: RecordingConsentDeclineRow[]
  participantRoster?: UnityMeetParticipant[]
}

/**
 * Push host dashboard updates over Reverb — no polling or router.reload().
 */
export function useUnityMeetHostRealtime<TLivestream extends LivestreamRealtimeSlice>({
  broadcastChannel,
  livestream,
  recordingConsentDeclines,
  participantRoster = [],
}: Options<TLivestream>) {
  const [liveLivestream, setLiveLivestream] = useState(livestream)
  const [liveDeclines, setLiveDeclines] = useState(recordingConsentDeclines)
  const [liveRoster, setLiveRoster] = useState(participantRoster)

  useEffect(() => {
    setLiveLivestream(livestream)
  }, [livestream])

  useEffect(() => {
    setLiveDeclines(recordingConsentDeclines)
  }, [recordingConsentDeclines])

  useEffect(() => {
    setLiveRoster(participantRoster)
  }, [participantRoster])

  const applyDashboard = useCallback((payload: UnityMeetHostDashboardPayload) => {
    if (payload.livestream) {
      setLiveLivestream((prev) => ({ ...prev, ...payload.livestream }))
    }
    if (payload.recordingConsentDeclines) {
      setLiveDeclines(payload.recordingConsentDeclines)
    }
    if (payload.participantRoster) {
      setLiveRoster(payload.participantRoster)
    }
  }, [])

  const applyViewerStatus = useCallback((payload: { status?: string; isPublic?: boolean }) => {
    setLiveLivestream((prev) => ({
      ...prev,
      ...(payload.status !== undefined ? { status: payload.status } : {}),
      ...(payload.isPublic !== undefined ? { isPublic: payload.isPublic } : {}),
    }))
  }, [])

  const channel = broadcastChannel ?? "unity-live.disabled"

  useEcho<UnityMeetHostDashboardPayload>(
    channel,
    ".host.dashboard",
    applyDashboard,
    [channel, applyDashboard],
    "public",
  )

  useEcho<{ status?: string; isPublic?: boolean }>(
    channel,
    ".viewer.status",
    applyViewerStatus,
    [channel, applyViewerStatus],
    "public",
  )

  return {
    livestream: liveLivestream,
    recordingConsentDeclines: liveDeclines,
    participantRoster: liveRoster,
  }
}
