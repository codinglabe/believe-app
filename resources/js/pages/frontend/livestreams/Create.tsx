"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Head, useForm, Link, router } from "@inertiajs/react"
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
  IdCard,
  Lock,
  Globe,
  CircleDot,
  Radio,
  Copy,
  Check,
} from "lucide-react"
import UnityMeetLayout from "@/layouts/UnityMeetLayout"
import { PageHead } from "@/components/frontend/PageHead"
import { cn } from "@/lib/utils"

const BRAND = {
  from: "#9333ea",
  to: "#2563eb",
}

interface Props {
  authUserDisplayName?: string
  unityMeetingId?: string
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
        "mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-purple-400/90",
        className
      )}
    >
      {children}
    </p>
  )
}

export default function SupporterCreateLivestream({ authUserDisplayName = "", unityMeetingId = "" }: Props) {
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)
  const [participantEmailInput, setParticipantEmailInput] = useState("")
  const [meetingIdCopied, setMeetingIdCopied] = useState(false)

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

  const copyMeetingId = () => {
    if (!unityMeetingId.trim()) return
    void navigator.clipboard.writeText(unityMeetingId)
    setMeetingIdCopied(true)
    setTimeout(() => setMeetingIdCopied(false), 2000)
  }

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
    "h-11 rounded-xl border-zinc-800 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-purple-500/50 focus-visible:ring-purple-500/20"

  const toggleClass =
    "shrink-0 data-[state=unchecked]:bg-zinc-700 data-[state=checked]:bg-purple-600 data-[state=unchecked]:border-zinc-600"

  return (
    <UnityMeetLayout>
      <PageHead
        title="Start Instant Meeting"
        description="Minimal setup: name your meeting and choose privacy, recordings, and live options."
      />
      <Head title="Start Instant Meeting" />

      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto flex min-h-screen max-w-xl flex-col px-4 pb-14 pt-6 md:px-6 md:pt-10">
          <Link
            href="/livestreams/supporter"
            className="mb-6 inline-flex w-fit items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Unity Meet
          </Link>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
            <div className="rounded-3xl border border-zinc-800/90 bg-[#0a0a0f] p-6 shadow-2xl shadow-black/40 md:p-8">
              <div className="flex items-start gap-3 pb-8">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
                >
                  <Video className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">Start Instant Meeting</h1>
                </div>
              </div>

              <SectionLabel className="mt-2">Meeting info</SectionLabel>

              <div className="space-y-1">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,140px)_1fr] sm:items-center sm:gap-4">
                  <span className="flex items-center gap-2 pt-3 text-sm text-zinc-400 sm:py-3">
                    <User className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
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
                    {errors.title && <p className="mt-1.5 text-xs text-red-400">{errors.title}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,140px)_1fr] sm:items-center sm:gap-4">
                  <span className="flex items-center gap-2 pt-3 text-sm text-zinc-400 sm:py-3">
                    <User className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
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
                      <p className="mt-1.5 text-xs text-red-400">{errors.display_name}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,140px)_1fr] sm:items-center sm:gap-4">
                  <span className="flex items-center gap-2 pt-3 text-sm text-zinc-400 sm:py-3">
                    <IdCard className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
                    Meeting ID
                  </span>
                  <div className="relative min-w-0">
                    <Input
                      readOnly
                      value={unityMeetingId}
                      className={cn(fieldShell, "font-mono pr-12 text-sm text-zinc-400 shadow-none")}
                      title={unityMeetingId}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-9 w-9 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                      onClick={copyMeetingId}
                      aria-label="Copy meeting ID"
                    >
                      {meetingIdCopied ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <SectionLabel className="mt-10">Security</SectionLabel>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 py-1">
                  <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-zinc-400">
                    <Lock className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
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
                {errors.passcode && <p className="text-xs text-red-400">{errors.passcode}</p>}
              </div>

              <SectionLabel className="mt-10">Options</SectionLabel>

              <div className="divide-y divide-zinc-800/90 rounded-2xl border border-zinc-800/70 bg-zinc-900/30 px-1">
                <div className="flex items-center justify-between gap-4 px-3 py-3">
                  <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-zinc-400">
                    <Globe className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
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
                  <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-zinc-400">
                    <CircleDot className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
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
                  <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-zinc-400">
                    <Radio className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
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

          <p className="mt-8 text-center text-sm text-zinc-500">
            Need a future time?{" "}
            <button
              type="button"
              className="font-medium text-purple-400 underline-offset-4 hover:text-purple-300 hover:underline"
              onClick={() => setScheduleOpen(true)}
            >
              Schedule a meeting
            </button>
          </p>
        </div>
      </div>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="border-zinc-800 bg-[#12121a] text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Schedule a meeting</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schedule_date" className="text-zinc-400">
                Date
              </Label>
              <div className="relative">
                <Input
                  id="schedule_date"
                  type="date"
                  value={data.schedule_date}
                  onChange={(e) => setData("schedule_date", e.target.value)}
                  className="h-11 border-zinc-700 bg-zinc-900 text-zinc-100"
                />
                <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              </div>
              {errors.schedule_date && <p className="text-sm text-red-400">{errors.schedule_date}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule_time" className="text-zinc-400">
                Time
              </Label>
              <div className="relative">
                <Input
                  id="schedule_time"
                  type="time"
                  value={data.schedule_time}
                  onChange={(e) => setData("schedule_time", e.target.value)}
                  className="h-11 border-zinc-700 bg-zinc-900 text-zinc-100"
                />
                <Clock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              </div>
              {errors.schedule_time && <p className="text-sm text-red-400">{errors.schedule_time}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="participant_emails" className="text-zinc-400">
                Participant emails
              </Label>
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
                    className="h-11 border-zinc-700 bg-zinc-900 pr-10 text-zinc-100"
                    autoComplete="off"
                  />
                  <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 border-zinc-600 bg-transparent text-zinc-200 hover:bg-zinc-800"
                  onClick={addParticipantEmail}
                >
                  Add
                </Button>
              </div>
              {(errors.participant_emails || (errors as Record<string, string>)["participant_emails.0"]) && (
                <p className="text-sm text-red-400">
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
                      className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
                      title="Remove"
                    >
                      <span className="font-mono">{email}</span>
                      <span className="text-zinc-500">×</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="border-zinc-600 text-zinc-200 hover:bg-zinc-800"
                onClick={() => setScheduleOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isScheduling}
                className="text-white"
                style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
              >
                {isScheduling ? "Scheduling…" : "Schedule"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </UnityMeetLayout>
  )
}
