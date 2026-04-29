"use client"

import type React from "react"
import { useState } from "react"
import { Head, useForm, Link, router } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/admin/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Video, ArrowLeft, Download, Calendar, Clock, Mail } from "lucide-react"
import UnityMeetLayout from "@/layouts/UnityMeetLayout"
import { PageHead } from "@/components/frontend/PageHead"

const BRAND = {
  from: "#9333ea",
  to: "#2563eb",
  fromMuted: "rgba(147,51,234,0.15)",
  toMuted: "rgba(37,99,235,0.1)",
}

interface Props {
  authUserDisplayName?: string
  unityMeetingId?: string
  organization?: { id: number; name: string; slug: string }
  hasYoutubeIntegrated?: boolean
}

export default function SupporterCreateLivestream({ authUserDisplayName = "", unityMeetingId = "" }: Props) {
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)
  const [participantEmailInput, setParticipantEmailInput] = useState("")
  const { data, setData, post, processing, errors } = useForm({
    title: "",
    display_name: authUserDisplayName,
    is_public: true,
    require_passcode: true,
    passcode: "",
    record_meeting: true,
    schedule_date: "",
    schedule_time: "",
    participant_emails: [] as string[],
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post("/livestreams/supporter")
  }

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsScheduling(true)
    const extra = participantEmailInput.trim()
    const emails =
      extra.length > 0
        ? Array.from(new Set([...(data.participant_emails ?? []), extra]))
        : (data.participant_emails ?? [])
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

  return (
    <UnityMeetLayout
      breadcrumbs={[
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Unity Meet Communications', href: '/livestreams/supporter' },
        { title: 'Create', href: '/livestreams/supporter/create' },
      ]}
    >
      <PageHead title="Start a New Meeting" description="Create a meeting in one click. Invite others and go live when you're ready." />
      <Head title="Start a New Meeting" />
      <div className="bg-background">
        <div
          className="relative overflow-hidden border-b border-purple-200 dark:border-purple-500/20"
          style={{
            background: `linear-gradient(135deg, ${BRAND.fromMuted} 0%, rgba(147,51,234,0.2) 50%, ${BRAND.toMuted} 100%)`,
          }}
        >
          <div className="relative w-full px-4 py-6 md:px-6 lg:px-8">
            <Link
              href="/livestreams/supporter"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Start a New Meeting
            </h1>
            <p className="mt-1 text-muted-foreground">
              Create a meeting in one click. Invite others and go live when you're ready.
            </p>
          </div>
        </div>

        <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl mx-auto px-4 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Meeting details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="title">Meeting name</Label>
                  <Input
                    id="title"
                    value={data.title}
                    onChange={(e) => setData("title", e.target.value)}
                    placeholder="e.g. Sunday Service"
                    className="h-10"
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="display_name">Your display name</Label>
                    <Input
                      id="display_name"
                      value={data.display_name}
                      onChange={(e) => setData("display_name", e.target.value)}
                      placeholder="Your name"
                      className="h-10"
                    />
                    {errors.display_name && (
                      <p className="text-sm text-destructive">{errors.display_name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="meeting_id">Meeting ID</Label>
                      <span className="text-xs text-muted-foreground">From profile</span>
                    </div>
                    <Input
                      id="meeting_id"
                      value={unityMeetingId}
                      readOnly
                      className="h-10 font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <Label htmlFor="require_passcode" className="text-sm font-medium">
                        Passcode
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Require a passcode to join
                      </p>
                    </div>
                    <Switch
                      id="require_passcode"
                      checked={data.require_passcode}
                      onCheckedChange={(checked) => setData("require_passcode", checked)}
                    />
                  </div>
                  {data.require_passcode && (
                    <div className="space-y-2">
                      <Input
                        value={data.passcode}
                        onChange={(e) => setData("passcode", e.target.value)}
                        placeholder="Enter a passcode"
                        className="h-10"
                      />
                      {errors.passcode && (
                        <p className="text-sm text-destructive">{errors.passcode}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Passcode must be at least 6 characters.
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                  <div className="space-y-0.5 min-w-0">
                    <Label htmlFor="record_meeting" className="text-sm font-medium">
                      Recorded meeting
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Yes, record this meeting
                    </p>
                  </div>
                  <Switch
                    id="record_meeting"
                    checked={data.record_meeting}
                    onCheckedChange={(checked) => setData("record_meeting", checked)}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                  <div className="space-y-0.5 min-w-0">
                    <Label htmlFor="is_public" className="text-sm font-medium">
                      Public meeting
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      When live, show on Unity Live page. Off = private (only people with your viewer link can watch).
                    </p>
                  </div>
                  <Switch
                    id="is_public"
                    checked={data.is_public}
                    onCheckedChange={(checked) => setData("is_public", checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  type="submit"
                  disabled={processing}
                  size="lg"
                  className="h-12 w-full text-base font-semibold text-white sm:order-2"
                  style={{
                    background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})`,
                  }}
                >
                  <Video className="mr-2 h-5 w-5" />
                  {processing ? "Creating…" : "Create meeting"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-12 w-full sm:order-1"
                  onClick={() => setScheduleOpen(true)}
                >
                  <Calendar className="mr-2 h-5 w-5" />
                  Schedule a meeting
                </Button>
              </div>
              <Link href="/unity-live" className="block w-full">
                <Button type="button" variant="outline" size="lg" className="h-12 w-full">
                  Back to Unity Live
                </Button>
              </Link>
              <Link href="/livestreams/supporter" className="block w-full">
                <Button type="button" variant="ghost" size="lg" className="h-12 w-full text-muted-foreground">
                  My meetings
                </Button>
              </Link>
            </div>

            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between gap-3">
                <a
                  href="https://obsproject.com/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Download className="h-4 w-4" />
                  Download OBS (optional)
                </a>
                <Link
                  href="/livestreams/supporter"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  My meetings
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule a Meeting</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add the date, time and participant emails to schedule your meeting.
            </p>
            <div className="space-y-2">
              <Label htmlFor="schedule_date">Date</Label>
              <div className="relative">
                <Input
                  id="schedule_date"
                  type="date"
                  value={data.schedule_date}
                  onChange={(e) => setData("schedule_date", e.target.value)}
                  className="h-11 pr-10"
                />
                <Calendar className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {errors.schedule_date && <p className="text-sm text-destructive">{errors.schedule_date}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule_time">Time</Label>
              <div className="relative">
                <Input
                  id="schedule_time"
                  type="time"
                  value={data.schedule_time}
                  onChange={(e) => setData("schedule_time", e.target.value)}
                  className="h-11 pr-10"
                />
                <Clock className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {errors.schedule_time && <p className="text-sm text-destructive">{errors.schedule_time}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="participant_emails">Participant Emails</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="participant_emails"
                    type="text"
                    value={participantEmailInput}
                    onChange={(e) => setParticipantEmailInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "," ) {
                        e.preventDefault()
                        addParticipantEmail()
                      }
                    }}
                    placeholder="Type an email and press Enter"
                    className="h-11 pr-10"
                    autoComplete="off"
                  />
                  <Mail className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <Button type="button" variant="outline" className="h-11" onClick={addParticipantEmail}>
                  Add
                </Button>
              </div>
              {(errors.participant_emails || (errors as any)?.["participant_emails.0"]) && (
                <p className="text-sm text-destructive">
                  {errors.participant_emails ?? (errors as any)?.["participant_emails.0"]}
                </p>
              )}
              {(data.participant_emails?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {data.participant_emails.map((email) => (
                    <button
                      key={email}
                      type="button"
                      onClick={() => removeParticipantEmail(email)}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-foreground hover:bg-muted"
                      title="Click to remove"
                    >
                      <span className="font-mono">{email}</span>
                      <span className="text-muted-foreground">×</span>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Tip: paste a comma-separated list, then press Enter.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
              <Button type="button" variant="outline" className="h-11" onClick={() => setScheduleOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-11 text-white"
                disabled={isScheduling}
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
