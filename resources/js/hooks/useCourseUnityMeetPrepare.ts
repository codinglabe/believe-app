import { useEffect, useRef, useState } from "react"
import axios from "axios"

export type PreparedUnityMeet = {
  livestream_kind: string
  livestream_id: number
  join_link: string
  host_link: string
  room_name: string
  meeting_id: string
  requires_passcode: boolean
  passcode: string | null
  scheduled_at: string
}

type UseCourseUnityMeetPrepareOptions = {
  enabled: boolean
  prepareUrl: string
  name: string
  description: string
  startDate: string
  startTime: string
  sessionDurationMinutes: string
  maxParticipants: string
  format: string
  livestreamKind: string
  livestreamId: string | number
  onPrepared: (meeting: PreparedUnityMeet) => void
}

function usesUnityMeet(format: string): boolean {
  return format === "online" || format === "hybrid"
}

export function useCourseUnityMeetPrepare({
  enabled,
  prepareUrl,
  name,
  description,
  startDate,
  startTime,
  sessionDurationMinutes,
  maxParticipants,
  format,
  livestreamKind,
  livestreamId,
  onPrepared,
}: UseCourseUnityMeetPrepareOptions) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [meeting, setMeeting] = useState<PreparedUnityMeet | null>(null)
  const timerRef = useRef<number | null>(null)
  const onPreparedRef = useRef(onPrepared)
  const livestreamKindRef = useRef(livestreamKind)
  const livestreamIdRef = useRef(livestreamId)

  useEffect(() => {
    onPreparedRef.current = onPrepared
  }, [onPrepared])

  useEffect(() => {
    livestreamKindRef.current = livestreamKind
    livestreamIdRef.current = livestreamId
  }, [livestreamKind, livestreamId])

  useEffect(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
    }

    if (!enabled || !usesUnityMeet(format)) {
      setLoading(false)
      setError(null)
      return
    }

    if (!name.trim() || !startDate || !startTime || !sessionDurationMinutes || !maxParticipants) {
      return
    }

    timerRef.current = window.setTimeout(async () => {
      setLoading(true)
      setError(null)

      try {
        const { data } = await axios.post(prepareUrl, {
          name: name.trim(),
          description,
          start_date: startDate,
          start_time: startTime,
          session_duration_minutes: Number(sessionDurationMinutes),
          max_participants: Number(maxParticipants),
          format,
          unity_meet_livestream_kind: livestreamKindRef.current || undefined,
          unity_meet_livestream_id: livestreamIdRef.current ? Number(livestreamIdRef.current) : undefined,
        })

        if (data?.success && data?.meeting) {
          const prepared = data.meeting as PreparedUnityMeet
          setMeeting(prepared)
          onPreparedRef.current(prepared)
          return
        }

        setError(typeof data?.message === "string" ? data.message : "Failed to create Unity Meet meeting.")
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const message =
            typeof err.response?.data?.message === "string"
              ? err.response.data.message
              : "Failed to create Unity Meet meeting."
          setError(message)
        } else {
          setError("Failed to create Unity Meet meeting.")
        }
      } finally {
        setLoading(false)
      }
    }, 600)

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [
    enabled,
    prepareUrl,
    name,
    description,
    startDate,
    startTime,
    sessionDurationMinutes,
    maxParticipants,
    format,
  ])

  return { loading, error, meeting, usesUnityMeet: usesUnityMeet(format) }
}

export { usesUnityMeet }
