"use client"

import type React from "react"
import { Head, useForm, Link } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/admin/ui/switch"
import { Video, ArrowLeft, Download } from "lucide-react"
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
  const { data, setData, post, processing, errors } = useForm({
    title: "",
    display_name: authUserDisplayName,
    is_public: true,
    require_passcode: true,
    passcode: "",
    record_meeting: true,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post("/livestreams/supporter")
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
                <Link href="/unity-live" className="block w-full sm:order-1">
                  <Button type="button" variant="outline" size="lg" className="h-12 w-full">
                    Back to Unity Live
                  </Button>
                </Link>
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
              </div>
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
    </UnityMeetLayout>
  )
}
