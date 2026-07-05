"use client"

import { useState } from "react"
import { Link } from "@inertiajs/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Copy, ExternalLink, Link2, LogIn } from "lucide-react"

export interface ConnectionHubMeetingRow {
  id: number
  listKey: string
  source: "connection_hub"
  title: string | null
  roomName: string
  status: string
  scheduledAt: string | null
  createdAt: string
  joinUrl: string
  hostUrl: string
  courseSlug: string
  connectionHubLabel: string
  courseShowUrl?: string
}

function formatWhen(iso: string | null, fallbackIso: string): string {
  const d = new Date(iso && iso.length > 0 ? iso : fallbackIso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

type Props = {
  meetings: ConnectionHubMeetingRow[]
  title?: string
  description?: string
  emptyMessage?: string
  showHostLink?: boolean
  compact?: boolean
}

export default function ConnectionHubMeetingsList({
  meetings,
  title = "Connection Hub meetings",
  description = "Scheduled Unity Meet sessions from your Companion, Learning, and Meetups listings.",
  emptyMessage = "No Connection Hub meetings scheduled yet.",
  showHostLink = true,
  compact = false,
}: Props) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const copy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text)
    setCopiedKey(key)
    window.setTimeout(() => setCopiedKey(null), 2000)
  }

  if (meetings.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className={compact ? "pb-3" : undefined}>
          <CardTitle className="text-base">{title}</CardTitle>
          {!compact && description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-blue-500/5 dark:from-purple-950/20 dark:to-blue-950/10">
      <CardHeader className={compact ? "pb-3" : undefined}>
        <CardTitle className="text-base">{title}</CardTitle>
        {!compact && description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {meetings.map((meeting) => (
          <div
            key={meeting.listKey}
            className="rounded-xl border border-border/70 bg-card/80 p-4 space-y-3"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground truncate">{meeting.title || "Untitled listing"}</p>
                  <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-700 dark:text-purple-300">
                    {meeting.connectionHubLabel}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{formatWhen(meeting.scheduledAt, meeting.createdAt)}</p>
                <p className="text-xs font-mono text-muted-foreground truncate">ID: {meeting.roomName}</p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button asChild size="sm" className="h-9 gap-1.5">
                  <a href={meeting.joinUrl} target="_blank" rel="noopener noreferrer">
                    <LogIn className="h-3.5 w-3.5" />
                    Join
                  </a>
                </Button>
                {showHostLink ? (
                  <Button asChild variant="outline" size="sm" className="h-9 gap-1.5">
                    <a href={meeting.hostUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Host
                    </a>
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5"
                  onClick={() => copy(meeting.joinUrl, `${meeting.listKey}-join`)}
                >
                  {copiedKey === `${meeting.listKey}-join` ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Link2 className="h-3.5 w-3.5" />
                      Copy join link
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <Link
                href={meeting.courseShowUrl ?? route("admin.courses.show", meeting.courseSlug)}
                className="text-primary hover:underline"
              >
                View listing
              </Link>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
