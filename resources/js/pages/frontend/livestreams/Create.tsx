"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Head, useForm, Link, router, usePage } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/admin/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Video,
  ArrowLeft,
  Calendar,
  Clock,
  Mail,
  User,
  Lock,
  Globe,
  CircleDot,
  Radio,
} from "lucide-react"
import UnityMeetLayout from "@/layouts/UnityMeetLayout"
import { PageHead } from "@/components/frontend/PageHead"
import { cn } from "@/lib/utils"
import { useEmailCreditsState } from "@/hooks/use-email-credits-state"
import BuyEmailCreditsDialog, { type EmailPackageOption } from "@/components/meeting/BuyEmailCreditsDialog"
import EmailCreditsMeetingActions from "@/components/meeting/EmailCreditsMeetingActions"
import UnityMeetInviteChannelPicker, {
  type UnityMeetInviteChannel,
} from "@/components/meeting/UnityMeetInviteChannelPicker"

const BRAND = {
  from: "#9333ea",
  to: "#2563eb",
  fromMuted: "rgba(147,51,234,0.15)",
  toMuted: "rgba(37,99,235,0.1)",
}

interface Props {
  authUserDisplayName?: string
  emailCredits?: {
    emails_included: number
    emails_used: number
    emails_left: number
  }
  emailPackages?: EmailPackageOption[]
  stripeMinCheckoutUsd?: number
}

function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        "mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-purple-600 dark:text-purple-400",
        className
      )}
    >
      {children}
    </p>
  )
}

export default function SupporterCreateLivestream({
  authUserDisplayName = "",
  emailCredits,
  emailPackages = [],
  stripeMinCheckoutUsd = 0.5,
}: Props) {
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)
  const [buyCreditsOpen, setBuyCreditsOpen] = useState(false)
  const [participantEmailInput, setParticipantEmailInput] = useState("")
  const [inviteNotifyVia, setInviteNotifyVia] = useState<UnityMeetInviteChannel>("both")
  const { success } = usePage<{ success?: string }>().props
  const { emailsLeft, syncFromServer } = useEmailCreditsState(emailCredits)

  useEffect(() => {
    if (success && emailCredits) {
      syncFromServer(emailCredits)
    }
  }, [success, emailCredits, syncFromServer])

  const { data, setData, post, processing, errors } = useForm({
    title: "",
    display_name: authUserDisplayName,
    is_public: false,
    require_passcode: false,
    passcode: "",
    record_meeting: false,
    go_live: false,
    schedule_date: "",
    schedule_time: "",
    participant_emails: [] as string[],
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("schedule") === "1") {
      setScheduleOpen(true)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post("/livestreams/supporter")
  }

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsScheduling(true)
    const extra = participantEmailInput.trim()
    const emails =
      extra.length > 0 ? Array.from(new Set([...(data.participant_emails ?? []), extra])) : data.participant_emails ?? []
    router.post(
      "/livestreams/supporter/schedule",
      {
        title: data.title,
        display_name: data.display_name,
        is_public: data.is_public,
        require_passcode: data.require_passcode,
        passcode: data.passcode,
        record_meeting: data.record_meeting,
        schedule_date: data.schedule_date,
        schedule_time: data.schedule_time,
        participant_emails: emails,
        invite_notify_via: inviteNotifyVia,
      },
      {
        preserveScroll: true,
        onFinish: () => setIsScheduling(false),
      }
    )
  }

  const addParticipantEmail = () => {
    const raw = participantEmailInput.trim()
    if (!raw) return
    const parts = raw.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean)
    if (parts.length === 0) return
    const next = Array.from(new Set([...(data.participant_emails ?? []), ...parts]))
    setData("participant_emails", next)
    setParticipantEmailInput("")
  }

  const removeParticipantEmail = (email: string) => {
    setData(
      "participant_emails",
      (data.participant_emails ?? []).filter((e) => e !== email)
    )
  }

  const fieldShell =
    "h-11 rounded-xl border-input bg-background text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-purple-500/50 focus-visible:ring-purple-500/20"

  const toggleClass =
    "shrink-0 data-[state=unchecked]:bg-muted data-[state=checked]:bg-purple-600 data-[state=unchecked]:border-border"

  const pendingInviteCount =
    (data.participant_emails?.length ?? 0) + (participantEmailInput.trim() !== "" ? 1 : 0)
  const scheduleUsesEmailCredits = inviteNotifyVia === "email" || inviteNotifyVia === "both"
  const scheduleNeedsCredits = pendingInviteCount > 0 && scheduleUsesEmailCredits
  const hasEnoughCreditsForSchedule = !scheduleNeedsCredits || pendingInviteCount <= emailsLeft

  return (
    <UnityMeetLayout>
      <PageHead
        title="Start Instant Meeting"
        description="Minimal setup: name your meeting and choose privacy, recordings, and live options."
      />
      <Head title="Start Instant Meeting" />

      <div className="min-h-screen bg-background text-foreground">
        <div
          className="border-b border-purple-200 dark:border-purple-500/20"
          style={{
            background: `linear-gradient(135deg, ${BRAND.fromMuted} 0%, rgba(147,51,234,0.12) 50%, ${BRAND.toMuted} 100%)`,
          }}
        >
          <div className="mx-auto max-w-xl px-4 py-6 md:px-6">
            <Link
              href="/livestreams/supporter"
              className="mb-4 inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Unity Meet
            </Link>
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
              >
                <Video className="h-5 w-5" />
              </div>
              <div>
                <h1 className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-xl font-semibold tracking-tight text-transparent md:text-2xl">
                  Start Instant Meeting
                </h1>
                <p className="text-sm text-muted-foreground">Name your meeting and set privacy options.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto flex max-w-xl flex-col px-4 pb-14 pt-6 md:px-6 md:pt-8">
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
              <div className="sr-only">
                <h2>Meeting form</h2>
              </div>

              <SectionLabel className="mt-2">Meeting info</SectionLabel>

              <div className="space-y-1">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,140px)_1fr] sm:items-center sm:gap-4">
                  <span className="flex items-center gap-2 pt-3 text-sm text-muted-foreground sm:py-3">
                    <User className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    Meeting name
                  </span>
                  <div className="min-w-0">
                    <Input
                      id="title"
                      value={data.title}
                      onChange={(e) => setData("title", e.target.value)}
                      placeholder="e.g. Sunday Service"
                      className={cn(fieldShell, "shadow-none")}
                      autoComplete="off"
                    />
                    {errors.title && <p className="mt-1.5 text-xs text-destructive">{errors.title}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,140px)_1fr] sm:items-center sm:gap-4">
                  <span className="flex items-center gap-2 pt-3 text-sm text-muted-foreground sm:py-3">
                    <User className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    Your display name
                  </span>
                  <div className="min-w-0">
                    <Input
                      id="display_name"
                      value={data.display_name}
                      onChange={(e) => setData("display_name", e.target.value)}
                      placeholder="Your name"
                      className={cn(fieldShell, "shadow-none")}
                      autoComplete="name"
                    />
                    {errors.display_name && (
                      <p className="mt-1.5 text-xs text-destructive">{errors.display_name}</p>
                    )}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Each start creates a new meeting with its own ID. You will see the meeting ID on the next screen.
                </p>
              </div>

              <SectionLabel className="mt-10">Security</SectionLabel>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 py-1">
                  <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    Passcode
                  </span>
                  <Switch
                    id="require_passcode"
                    checked={data.require_passcode}
                    onCheckedChange={(checked) => setData("require_passcode", checked)}
                    className={toggleClass}
                  />
                </div>
                {data.require_passcode && (
                  <Input
                    value={data.passcode}
                    onChange={(e) => setData("passcode", e.target.value)}
                    placeholder="Enter passcode"
                    type="password"
                    className={cn(fieldShell, "shadow-none")}
                    autoComplete="new-password"
                  />
                )}
                {errors.passcode && <p className="text-xs text-destructive">{errors.passcode}</p>}
              </div>

              <SectionLabel className="mt-10">Options</SectionLabel>

              <div className="divide-y divide-border rounded-2xl border border-border bg-muted/30 px-1">
                <div className="flex items-center justify-between gap-4 px-3 py-3">
                  <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted-foreground">
                    <Globe className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    Show on Unity Live
                  </span>
                  <Switch
                    id="is_public"
                    checked={data.is_public}
                    onCheckedChange={(checked) => setData("is_public", checked)}
                    className={toggleClass}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 px-3 py-3">
                  <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted-foreground">
                    <CircleDot className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    Record meeting
                  </span>
                  <Switch
                    id="record_meeting"
                    checked={data.record_meeting}
                    onCheckedChange={(checked) => setData("record_meeting", checked)}
                    className={toggleClass}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 px-3 py-3">
                  <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted-foreground">
                    <Radio className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    Go live (optional)
                  </span>
                  <Switch
                    checked={data.go_live}
                    onCheckedChange={(checked) => setData("go_live", checked)}
                    className={toggleClass}
                    aria-label="Prepare to go live to YouTube (optional)"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={processing}
                size="lg"
                className="mt-10 h-12 w-full rounded-xl border-0 text-base font-semibold text-white shadow-lg"
                style={{ background: `linear-gradient(90deg, ${BRAND.from}, ${BRAND.to})` }}
              >
                <Video className="mr-2 h-5 w-5 shrink-0" />
                {processing ? "Starting…" : "Start Meeting"}
              </Button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Need a future time?{" "}
            <button
              type="button"
              className="font-medium text-purple-600 underline-offset-4 hover:text-purple-700 hover:underline dark:text-purple-400 dark:hover:text-purple-300"
              onClick={() => setScheduleOpen(true)}
            >
              Schedule a meeting
            </button>
          </p>
        </div>
      </div>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="border-border bg-card text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule a meeting</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schedule_date" className="text-muted-foreground">
                Date
              </Label>
              <div className="relative">
                <Input
                  id="schedule_date"
                  type="date"
                  value={data.schedule_date}
                  onChange={(e) => setData("schedule_date", e.target.value)}
                  className={cn(fieldShell, "pr-10")}
                />
                <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              {errors.schedule_date && <p className="text-sm text-destructive">{errors.schedule_date}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule_time" className="text-muted-foreground">
                Time
              </Label>
              <div className="relative">
                <Input
                  id="schedule_time"
                  type="time"
                  value={data.schedule_time}
                  onChange={(e) => setData("schedule_time", e.target.value)}
                  className={cn(fieldShell, "pr-10")}
                />
                <Clock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              {errors.schedule_time && <p className="text-sm text-destructive">{errors.schedule_time}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="participant_emails" className="text-muted-foreground">
                Participant emails
              </Label>
              <UnityMeetInviteChannelPicker value={inviteNotifyVia} onChange={setInviteNotifyVia} />
              {scheduleUsesEmailCredits && emailCredits ? (
                <EmailCreditsMeetingActions
                  emailsLeft={emailsLeft}
                  onBuy={() => setBuyCreditsOpen(true)}
                />
              ) : null}
              {scheduleNeedsCredits && !hasEnoughCreditsForSchedule ? (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  You need {pendingInviteCount} credit{pendingInviteCount === 1 ? "" : "s"} to invite these guests, but only {emailsLeft} remain.{" "}
                  <button
                    type="button"
                    className="font-medium underline hover:no-underline"
                    onClick={() => setBuyCreditsOpen(true)}
                  >
                    Buy email credits
                  </button>
                </p>
              ) : null}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="participant_emails"
                    type="text"
                    value={participantEmailInput}
                    onChange={(e) => setParticipantEmailInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault()
                        addParticipantEmail()
                      }
                    }}
                    placeholder="Email, then Enter"
                    className={cn(fieldShell, "pr-10")}
                    autoComplete="off"
                  />
                  <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
                <Button type="button" variant="outline" className="h-11 shrink-0" onClick={addParticipantEmail}>
                  Add
                </Button>
              </div>
              {(errors.participant_emails || (errors as Record<string, string>)["participant_emails.0"]) && (
                <p className="text-sm text-destructive">
                  {errors.participant_emails ?? (errors as Record<string, string>)["participant_emails.0"]}
                </p>
              )}
              {(data.participant_emails?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {data.participant_emails.map((email) => (
                    <button
                      key={email}
                      type="button"
                      onClick={() => removeParticipantEmail(email)}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-foreground hover:bg-muted/80"
                      title="Remove"
                    >
                      <span className="font-mono">{email}</span>
                      <span className="text-muted-foreground">×</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setScheduleOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isScheduling || !hasEnoughCreditsForSchedule}
                className="text-white"
                style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
              >
                {isScheduling ? "Scheduling…" : "Schedule"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <BuyEmailCreditsDialog
        open={buyCreditsOpen}
        onOpenChange={setBuyCreditsOpen}
        emailPackages={emailPackages}
        stripeMinCheckoutUsd={stripeMinCheckoutUsd}
        returnRoute="livestreams.supporter.create"
      />
    </UnityMeetLayout>
  )
}
