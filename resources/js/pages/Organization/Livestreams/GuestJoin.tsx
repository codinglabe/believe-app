"use client"

import { useEffect, useState, type ReactNode } from "react"
import { usePage } from "@inertiajs/react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { GuestMeetJoinExperience } from "@/components/livestreams/GuestMeetJoinExperience"
import { BelieveInUnityBrandMark } from "@/components/site-title"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Calendar, CheckCircle2, AlertCircle, Info, Video } from "lucide-react"

interface Livestream {
  id: number
  title: string | null
  description: string | null
  roomName: string
  roomPassword: string
  participantUrl: string
  status: "draft" | "scheduled" | "meeting_live" | "live" | "ended" | "cancelled"
  scheduledAt?: string | null
  participantEmails?: string[] | null
  recordingEnabled?: boolean
  broadcastChannel?: string
  declineContext?: { kind: "user" | "organization"; id: number }
}

interface Organization {
  id: number
  name: string
}

interface Props {
  livestream: Livestream
  organization: Organization
  recordingDeclineReturnTo: string
}

function formatScheduledAt(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function GuestJoin({ livestream, organization, recordingDeclineReturnTo }: Props) {
  const page = usePage()
  const authUser = (page.props as { auth?: { user?: { id?: number; email?: string; name?: string } } }).auth?.user
  const authEmail = authUser?.email?.trim()
  const authName = authUser?.name?.trim()
  const authUserId = authUser?.id ?? 0

  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteChecked, setInviteChecked] = useState(false)

  useEffect(() => {
    if (authEmail && !inviteEmail) {
      setInviteEmail(authEmail)
    }
  }, [authEmail, inviteEmail])

  const scheduledLabel = formatScheduledAt(livestream.scheduledAt)
  const scheduledTimeReached = (() => {
    if (livestream.status !== "scheduled" || !livestream.scheduledAt) return false
    const d = new Date(livestream.scheduledAt)
    return !Number.isNaN(d.getTime()) && d.getTime() <= Date.now()
  })()

  const normalizedParticipantEmails = (livestream.participantEmails ?? [])
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  const inviteRequired = livestream.status === "scheduled" && normalizedParticipantEmails.length > 0
  const inviteEmailNormalized = inviteEmail.trim().toLowerCase()
  const isInvited =
    !inviteRequired || normalizedParticipantEmails.includes(inviteEmailNormalized)
  const allowedByInvite =
    !inviteRequired || ((authEmail ? true : inviteChecked) && isInvited)

  const activeStatuses = ["draft", "meeting_live", "live", "scheduled"] as const
  const isActive = activeStatuses.includes(livestream.status as (typeof activeStatuses)[number])
  const isEnded = livestream.status === "ended" || livestream.status === "cancelled"
  const isScheduledWaiting =
    livestream.status === "scheduled" && !scheduledTimeReached
  const canEnterMeeting =
    isActive &&
    !isEnded &&
    !isScheduledWaiting &&
    allowedByInvite

  const inviteLobbyBlock =
    inviteRequired && !isScheduledWaiting ? (
      <div className="mb-6 rounded-xl border border-border/80 bg-muted/30 p-4 space-y-3">
        <div>
          <p className="text-sm font-medium text-foreground">Participants only</p>
          <p className="text-xs text-muted-foreground mt-1">
            {authEmail
              ? "We’ll use your account email to confirm you’re on the guest list."
              : "Enter your email to confirm you’re on the guest list."}
          </p>
        </div>
        <div className="flex gap-2">
          <input
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-purple-500/50 disabled:opacity-70"
            type="email"
            autoComplete="email"
            readOnly={!!authEmail}
            disabled={!!authEmail}
          />
          {!authEmail && (
            <Button
              type="button"
              variant="outline"
              className="h-10 shrink-0"
              onClick={() => setInviteChecked(true)}
              disabled={!inviteEmail.trim()}
            >
              Check
            </Button>
          )}
        </div>
        {(authEmail ? true : inviteChecked) && !isInvited && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This email is not on the participant list for this meeting.
            </AlertDescription>
          </Alert>
        )}
        {(authEmail ? true : inviteChecked) && isInvited && livestream.status === "scheduled" && (
          <Alert className="border-purple-500/20 bg-purple-500/5">
            <CheckCircle2 className="h-4 w-4 text-purple-600" />
            <AlertDescription>
              You’re on the participant list. You can join when the host starts the meeting.
            </AlertDescription>
          </Alert>
        )}
      </div>
    ) : null

  if (isEnded) {
    return (
      <FrontendLayout>
        <GuestJoinStatusPage
          icon={<Video className="h-8 w-8 text-muted-foreground" />}
          title={livestream.title || "Meeting"}
          organizationName={organization.name}
          heading="This meeting has ended"
          description="The host has closed this session. Contact them if you need a new invite link."
        />
      </FrontendLayout>
    )
  }

  if (isScheduledWaiting) {
    return (
      <FrontendLayout>
        <GuestJoinStatusPage
          icon={<Calendar className="h-8 w-8 text-purple-600" />}
          title={livestream.title || "Meeting"}
          organizationName={organization.name}
          heading="You’re a bit early"
          description="This meeting hasn’t started yet. Come back at the scheduled time."
          extra={
            <div className="w-full space-y-4">
              {scheduledLabel && (
                <ScheduledTimeRow label={scheduledLabel} />
              )}
              {inviteLobbyBlock}
              <p className="text-center text-xs text-muted-foreground">
                Tip: bookmark this page and refresh near the scheduled time.
              </p>
            </div>
          }
        />
      </FrontendLayout>
    )
  }

  if (inviteRequired && (authEmail ? false : !inviteChecked) && livestream.status === "scheduled") {
    return (
      <FrontendLayout>
        <GuestJoinStatusPage
          icon={<Calendar className="h-8 w-8 text-purple-600" />}
          title={livestream.title || "Meeting"}
          organizationName={organization.name}
          heading="Confirm your invite"
          description="This scheduled meeting is for invited participants only."
          extra={inviteLobbyBlock}
        />
      </FrontendLayout>
    )
  }

  if (inviteRequired && (authEmail ? true : inviteChecked) && !isInvited) {
    return (
      <FrontendLayout>
        <GuestJoinStatusPage
          icon={<AlertCircle className="h-8 w-8 text-destructive" />}
          title={livestream.title || "Meeting"}
          organizationName={organization.name}
          heading="You’re not on the guest list"
          description="This email isn’t invited to this meeting. Use the email your host sent the invite to, or ask them to add you."
          extra={inviteLobbyBlock}
        />
      </FrontendLayout>
    )
  }

  return (
    <FrontendLayout>
      <GuestMeetJoinExperience
        livestream={livestream}
        organization={organization}
        recordingDeclineReturnTo={recordingDeclineReturnTo}
        canEnterMeeting={canEnterMeeting}
        defaultDisplayName={authName ?? ""}
        guestEmail={authEmail ?? (inviteEmailNormalized || null)}
        authUserId={authUserId}
        consentAppearance="light"
        lobbyBeforeJoin={
          <>
            {livestream.description ? (
              <p className="mb-6 text-center text-sm text-muted-foreground">{livestream.description}</p>
            ) : null}
            {inviteLobbyBlock}
            {livestream.status === "scheduled" && scheduledTimeReached && (
              <Alert className="mb-6 border-purple-500/20 bg-purple-500/5">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  The scheduled time has started. If the room is empty, the host may not have opened the meeting yet — try
                  refreshing in a moment.
                </AlertDescription>
              </Alert>
            )}
          </>
        }
        pageClassName="min-h-screen"
      />
    </FrontendLayout>
  )
}

function ScheduledTimeRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
      <span className="text-sm text-muted-foreground">Scheduled for</span>
      <span className="text-sm font-semibold text-foreground text-right">{label}</span>
    </div>
  )
}

function GuestJoinStatusPage({
  icon,
  title,
  organizationName,
  heading,
  description,
  extra,
}: {
  icon: ReactNode
  title: string
  organizationName: string
  heading: string
  description: string
  extra?: ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-6">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <BelieveInUnityBrandMark className="mb-6 justify-center" />
          <p className="mb-1 text-sm text-muted-foreground">{organizationName}</p>
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{title}</h1>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            {icon}
          </div>
          <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          {extra ? <div className="mt-6 text-left">{extra}</div> : null}
        </div>
      </div>
    </div>
  )
}
