"use client"

import { useCallback, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/admin/ui/button"
import { Input } from "@/components/admin/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Check, Copy, Loader2, Video } from "lucide-react"
import { useCourseUnityMeetPrepare } from "@/hooks/useCourseUnityMeetPrepare"

type Props = {
  enabled: boolean
  prepareUrl: string
  hubTypeLabel: string
  name: string
  description: string
  format: string
  startDate: string
  startTime: string
  sessionDurationMinutes: string
  maxParticipants: string
  livestreamKind: string
  livestreamId: string | number
  hostMeetingLink: string
  meetingLink: string
  onPrepared: (payload: {
    meeting_link: string
    host_meeting_link: string
    unity_meet_livestream_kind: string
    unity_meet_livestream_id: string
  }) => void
  error?: string
}

export default function UnityMeetCourseScheduleSection({
  enabled,
  prepareUrl,
  hubTypeLabel,
  name,
  description,
  format,
  startDate,
  startTime,
  sessionDurationMinutes,
  maxParticipants,
  livestreamKind,
  livestreamId,
  hostMeetingLink,
  meetingLink,
  onPrepared,
  error,
}: Props) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const handlePrepared = useCallback(
    (meeting: {
      livestream_kind: string
      livestream_id: number
      join_link: string
      host_link: string
    }) => {
      onPrepared({
        meeting_link: meeting.join_link,
        host_meeting_link: meeting.host_link,
        unity_meet_livestream_kind: meeting.livestream_kind,
        unity_meet_livestream_id: String(meeting.livestream_id),
      })
    },
    [onPrepared],
  )

  const { loading, error: prepareError, meeting, usesUnityMeet } = useCourseUnityMeetPrepare({
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
    onPrepared: handlePrepared,
  })

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    window.setTimeout(() => setCopiedKey(null), 2000)
  }

  if (!usesUnityMeet) {
    return (
      <Alert>
        <AlertDescription>
          In-person listings do not need a Unity Meet link. Participants will meet at your physical location.
        </AlertDescription>
      </Alert>
    )
  }

  // Prefer the form wall-clock values so the label matches Start Date / Start Time.
  // (meeting.scheduled_at is UTC and must not be shown as if it were local input.)
  const scheduledLabel =
    startDate && startTime
      ? new Date(`${startDate}T${startTime.length === 5 ? `${startTime}:00` : startTime}`).toLocaleString(
          undefined,
          {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          },
        )
      : meeting?.scheduled_at
        ? new Date(meeting.scheduled_at).toLocaleString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : null

  const joinLink = meetingLink || meeting?.join_link || ""
  const hostLink = hostMeetingLink || meeting?.host_link || ""
  const meetingId = meeting?.meeting_id || meeting?.room_name || ""

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-blue-500/5 p-4 dark:from-purple-950/30 dark:to-blue-950/20">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 p-2 text-white">
            <Video className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">Unity Meet</p>
            <p className="text-sm text-muted-foreground">
              Your {hubTypeLabel} meeting is created automatically from the schedule details below. Host and join links
              update when you change the schedule.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Creating Unity Meet meeting…
        </div>
      ) : null}

      {(prepareError || error) && !loading ? (
        <p className="text-sm text-destructive">{prepareError || error}</p>
      ) : null}

      {scheduledLabel ? (
        <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Scheduled for {scheduledLabel}</p>
      ) : null}

      {joinLink ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Join meeting link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input value={joinLink} readOnly className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={() => copy(joinLink, "join")}>
                {copiedKey === "join" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this link so participants open Unity Meet join at /livestreams/supporter/join (meeting ID is prefilled when copied from here).
            </p>
          </CardContent>
        </Card>
      ) : null}

      {hostLink ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Host meeting link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input value={hostLink} readOnly className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={() => copy(hostLink, "host")}>
                {copiedKey === "host" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Open your scheduled meeting host page at /livestreams/supporter/[id] to start the session.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {meetingId ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Meeting ID</p>
          <div className="flex gap-2">
            <Input value={meetingId} readOnly className="font-mono" />
            <Button type="button" variant="outline" size="icon" onClick={() => copy(meetingId, "id")}>
              {copiedKey === "id" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      ) : null}

      {!loading && !joinLink && !prepareError && !error ? (
        <p className="text-sm text-muted-foreground">
          Fill in the schedule fields above to generate your Unity Meet host and join links.
        </p>
      ) : null}
    </div>
  )
}
