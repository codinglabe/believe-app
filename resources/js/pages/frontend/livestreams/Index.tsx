"use client"

import { Head, Link, usePage } from "@inertiajs/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Plus, Calendar, Users, Link2, MoreVertical, Play, Check, Pencil, Trash2, LogIn } from "lucide-react"
import { router } from "@inertiajs/react"
import { cn } from "@/lib/utils"
import UnityMeetLayout from "@/layouts/UnityMeetLayout"
import { PageHead } from "@/components/frontend/PageHead"

interface Livestream {
  id: number
  title: string | null
  roomName: string
  status: "draft" | "scheduled" | "meeting_live" | "live" | "ended" | "cancelled"
  isPublic: boolean
  scheduledAt: string | null
  startedAt: string | null
  endedAt: string | null
  createdAt: string
  directorUrl: string
  joinUrl: string
}

interface Paginator {
  data: Livestream[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  from?: number | null
  to?: number | null
}

interface Props {
  livestreams: Paginator
  meetingsView?: boolean
  meetingsTab?: "upcoming" | "past" | null
}

function meetingsListUrl(tab: "upcoming" | "past", page?: number): string {
  const p = new URLSearchParams({ view: "meetings", tab })
  if (page && page > 1) {
    p.set("page", String(page))
  }
  return `/livestreams/supporter?${p.toString()}`
}

function formatMeetingWhen(iso: string | null, fallbackIso: string): string {
  const d = new Date(iso && iso.length > 0 ? iso : fallbackIso)
  if (Number.isNaN(d.getTime())) return "—"
  const datePart = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
  const timePart = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  return `${datePart} · ${timePart}`
}

export default function SupporterLivestreamsIndex({
  livestreams,
  meetingsView = false,
  meetingsTab,
}: Props) {
  const pageCtx = usePage<{ auth?: { user?: { name?: string } } }>()
  const authName = pageCtx.props.auth?.user?.name ?? ""
  const firstName = authName.trim().split(" ")[0] ?? ""
  const welcomeName = firstName.length > 0 ? firstName : "there"

  const tab: "upcoming" | "past" = meetingsView && meetingsTab === "past" ? "past" : "upcoming"
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Livestream | null>(null)

  const handleDelete = (id: number) => {
    router.delete(`/livestreams/supporter/${id}`, {
      preserveScroll: true,
      onFinish: () => setDeleteTarget(null),
    })
  }

  const copyInviteLink = (row: Livestream) => {
    const url =
      typeof row.joinUrl === "string" && row.joinUrl.length > 0
        ? row.joinUrl
        : `${typeof window !== "undefined" ? window.location.origin : ""}/livestreams/join/${row.roomName}`
    void navigator.clipboard.writeText(url)
    setCopiedId(row.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getStatusBadge = (status: Livestream["status"]) => {
    const statusConfig: Record<
      Livestream["status"],
      { label: string; className: string }
    > = {
      draft: {
        label: "Draft",
        className:
          "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30",
      },
      scheduled: {
        label: "Scheduled",
        className:
          "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30",
      },
      meeting_live: {
        label: "Live",
        className:
          "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30",
      },
      live: {
        label: "Live",
        className:
          "bg-red-100 text-red-600 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/40",
      },
      ended: {
        label: "Completed",
        className:
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30",
      },
      cancelled: {
        label: "Cancelled",
        className:
          "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/15 dark:text-red-400/80 dark:border-red-500/30",
      },
    }

    const config = statusConfig[status] ?? statusConfig.draft
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    )
  }

  const meetingsRowBadge = (row: Livestream) => {
    if (tab === "past") {
      if (row.status === "cancelled") {
        return (
          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs dark:bg-red-500/15 dark:border-red-500/30 dark:text-red-400">
            Cancelled
          </Badge>
        )
      }
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs dark:bg-emerald-500/20 dark:border-emerald-500/30 dark:text-emerald-400">
          Completed
        </Badge>
      )
    }
    if (row.status === "live" || row.status === "meeting_live") {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs dark:bg-red-500/15 dark:border-red-500/40 dark:text-red-400">
          Live
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-xs dark:bg-sky-500/15 dark:border-sky-500/30 dark:text-sky-400">
        Upcoming
      </Badge>
    )
  }

  const displayWhen = (row: Livestream) =>
    formatMeetingWhen(row.scheduledAt ?? row.endedAt ?? row.startedAt, row.createdAt)

  const recent = livestreams.data.slice(0, 3)

  const from = livestreams.from ?? 0
  const to = livestreams.to ?? 0

  return (
    <UnityMeetLayout>
      <PageHead
        title={meetingsView ? "My Meetings" : "Unity Meet"}
        description={meetingsView ? "Manage your upcoming and past meetings." : "Start or join a meeting in just a few clicks."}
      />
      <Head title={meetingsView ? "My Meetings" : "Unity Meet"} />

      {!meetingsView ? (
        <div className="min-h-screen bg-background">
          <div className="w-full px-4 py-8 md:px-6 lg:px-8">
            <div className="mb-6 space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Welcome, {welcomeName}
              </h1>
              <p className="text-sm text-muted-foreground">Start or join a meeting in just a few clicks.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Link href="/livestreams/supporter/create" className="block">
                <Card className="h-full border-border bg-card transition-colors hover:bg-accent/20">
                  <CardContent className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white">
                      <Plus className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-foreground">Create</p>
                      <p className="text-lg font-semibold text-foreground">Instant Meeting</p>
                      <p className="text-sm text-muted-foreground">Start a meeting now</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/livestreams/supporter/create?schedule=1" className="block">
                <Card className="h-full border-border bg-card transition-colors hover:bg-accent/20">
                  <CardContent className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                      <Calendar className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-foreground">Schedule</p>
                      <p className="text-lg font-semibold text-foreground">Meeting</p>
                      <p className="text-sm text-muted-foreground">Plan for later</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/livestreams/supporter/join" className="block">
                <Card className="h-full border-border bg-card transition-colors hover:bg-accent/20">
                  <CardContent className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-600 text-white">
                      <LogIn className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-foreground">Join</p>
                      <p className="text-lg font-semibold text-foreground">Meeting</p>
                      <p className="text-sm text-muted-foreground">Meeting ID &amp; passcode if needed</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/livestreams/supporter?view=meetings" className="block">
                <Card className="h-full border-border bg-card transition-colors hover:bg-accent/20">
                  <CardContent className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600 text-white">
                      <Users className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-foreground">My Meetings</p>
                      <p className="text-sm text-muted-foreground">View upcoming and past meetings</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            <Card className="mt-6 border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Recent Meetings</CardTitle>
                <Link href="/livestreams/supporter?view=meetings" className="text-sm font-medium text-primary hover:underline">
                  View all
                </Link>
              </CardHeader>

              <CardContent className="p-0">
                {recent.length === 0 ? (
                  <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                    No meetings yet. Create your first meeting to get started.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {recent.map((livestream) => (
                      <div
                        key={livestream.id}
                        className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {livestream.title || "Untitled Meeting"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {livestream.scheduledAt
                              ? formatMeetingWhen(livestream.scheduledAt, livestream.createdAt)
                              : formatMeetingWhen(null, livestream.createdAt)}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          {getStatusBadge(livestream.status)}
                          <Link href={`/livestreams/supporter/${livestream.id}`}>
                            <Button variant="outline" size="sm" className="h-9">
                              View
                            </Button>
                          </Link>

                          {livestream.status !== "live" && livestream.status !== "meeting_live" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9">
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete &quot;
                                    {livestream.title || "Untitled Meeting"}&quot;? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(livestream.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-background">
          <div className="w-full px-4 py-8 md:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">My Meetings</h1>
                <p className="mt-1 text-sm text-muted-foreground">Meetings tied to your Unity Meet room.</p>
              </div>
              <Link href="/livestreams/supporter/create?schedule=1">
                <Button className="h-10 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Meeting
                </Button>
              </Link>
            </div>

            <div className="border-b border-border">
              <nav className="-mb-px flex gap-10">
                <Link
                  href={meetingsListUrl("upcoming")}
                  className={cn(
                    "border-b-2 pb-3 text-sm font-semibold transition-colors",
                    tab === "upcoming"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Upcoming
                </Link>
                <Link
                  href={meetingsListUrl("past")}
                  className={cn(
                    "border-b-2 pb-3 text-sm font-semibold transition-colors",
                    tab === "past"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Past
                </Link>
              </nav>
            </div>

            <Card className="mt-6 border-border bg-card shadow-sm">
              <CardContent className="p-0">
                {livestreams.data.length === 0 ? (
                  <div className="px-6 py-14 text-center text-sm text-muted-foreground">
                    {tab === "past" ? "No past meetings yet." : "No upcoming meetings. Schedule one or create an instant meeting."}
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-sm">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="px-6 py-3 font-semibold text-muted-foreground">Meeting Title</th>
                            <th className="px-6 py-3 font-semibold text-muted-foreground">Date &amp; Time</th>
                            <th className="px-6 py-3 font-semibold text-muted-foreground">Status</th>
                            <th className="px-6 py-3 font-semibold text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {livestreams.data.map((row) => (
                            <tr key={row.id} className="border-b border-border last:border-0">
                              <td className="max-w-[220px] px-6 py-4 font-medium text-foreground truncate">
                                {row.title || "Untitled Meeting"}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">{displayWhen(row)}</td>
                              <td className="px-6 py-4">{meetingsRowBadge(row)}</td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  {tab === "upcoming" ? (
                                    <>
                                      <Link href={`/livestreams/supporter/${row.id}`}>
                                        <Button variant="outline" size="sm" className="h-9">
                                          Join
                                        </Button>
                                      </Link>
                                      <Button variant="outline" size="sm" className="h-9 gap-2" type="button" onClick={() => copyInviteLink(row)}>
                                        {copiedId === row.id ? (
                                          <>
                                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                                            Copied
                                          </>
                                        ) : (
                                          <>
                                            <Link2 className="h-3.5 w-3.5" />
                                            Copy Link
                                          </>
                                        )}
                                      </Button>
                                    </>
                                  ) : (
                                    <Link href={`/livestreams/supporter/${row.id}`}>
                                      <Button variant="outline" size="sm" className="h-9 gap-2">
                                        <Play className="h-3.5 w-3.5" />
                                        View Recording
                                      </Button>
                                    </Link>
                                  )}

                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="icon" className="h-9 w-9" aria-label="More actions">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuItem asChild>
                                        <Link href={`/livestreams/supporter/${row.id}`} className="cursor-pointer">
                                          Open meeting
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem asChild>
                                        <Link href={`/livestreams/supporter/${row.id}/edit`} className="flex cursor-pointer items-center gap-2">
                                          <Pencil className="h-4 w-4" />
                                          Edit meeting
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      {row.status !== "live" && row.status !== "meeting_live" && (
                                        <DropdownMenuItem
                                          className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                          onSelect={() => setDeleteTarget(row)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          Cancel meeting
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-col gap-4 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-muted-foreground">
                        Showing{" "}
                        <span className="font-medium text-foreground">{livestreams.total === 0 ? 0 : from}</span> to{" "}
                        <span className="font-medium text-foreground">{livestreams.total === 0 ? 0 : to}</span>{" "}
                        of <span className="font-medium text-foreground">{livestreams.total}</span> meetings
                      </p>
                      {livestreams.last_page > 1 ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {Array.from({ length: livestreams.last_page }, (_, i) => i + 1).map((pNum) => (
                            <Link
                              key={pNum}
                              href={meetingsListUrl(tab, pNum)}
                              className={cn(
                                "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-xs font-semibold transition-colors",
                                pNum === livestreams.current_page
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                            >
                              {pNum}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel meeting</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{deleteTarget?.title ?? "Untitled Meeting"}&quot;? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Stay</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
                >
                  Delete meeting
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </UnityMeetLayout>
  )
}
