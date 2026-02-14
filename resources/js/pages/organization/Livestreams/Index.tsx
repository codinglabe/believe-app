"use client"

import { Head, Link } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import AppLayout from "@/layouts/app-layout"
import { Video, Plus, Calendar, Play, Square, Eye, Trash2, Radio } from "lucide-react"
import { router } from "@inertiajs/react"
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

/* Sidebar logo gradient: from-purple-600 to-blue-600 */
const BRAND = {
  from: "#9333ea",   /* purple-600 */
  to: "#2563eb",    /* blue-600 */
  fromMuted: "rgba(147,51,234,0.15)",
  toMuted: "rgba(37,99,235,0.1)",
}

interface Livestream {
  id: number
  title: string | null
  roomName: string
  status: "draft" | "scheduled" | "live" | "ended" | "cancelled"
  scheduledAt: string | null
  startedAt: string | null
  endedAt: string | null
  createdAt: string
}

interface Organization {
  id: number
  name: string
}

interface Props {
  livestreams: {
    data: Livestream[]
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
  organization: Organization
}

export default function LivestreamsIndex({ livestreams, organization }: Props) {
  const handleDelete = (id: number) => {
    router.delete(`/livestreams/${id}`, {
      preserveScroll: true,
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Draft", className: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30" },
      scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30" },
      live: { label: "Live", className: "bg-red-100 text-red-600 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/40 animate-pulse" },
      ended: { label: "Ended", className: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30" },
      cancelled: { label: "Cancelled", className: "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/15 dark:text-red-400/80 dark:border-red-500/30" },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>
  }

  return (
    <AppLayout>
      <Head title="My Livestreams" />
      <div className="min-h-screen bg-background">
        {/* Hero header - project color */}
        <div
          className="relative overflow-hidden border-b border-purple-200 dark:border-purple-500/20"
          style={{
            background: `linear-gradient(135deg, ${BRAND.fromMuted} 0%, rgba(147,51,234,0.25) 30%, rgba(37,99,235,0.2) 70%, ${BRAND.toMuted} 100%)`,
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(147,51,234,0.15),transparent)]" />
          <div className="relative w-full px-4 py-10 sm:py-12 md:px-6 lg:px-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
                  >
                    <Radio className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                      My Livestreams
                    </h1>
                    <p className="text-sm text-muted-foreground">{organization.name}</p>
                  </div>
                </div>
              </div>
              <Link href="/livestreams/create" className="shrink-0">
                <Button
                  size="lg"
                  className="h-11 rounded-lg px-6 text-white shadow-lg transition-all hover:shadow-[0_0_24px_rgba(147,51,234,0.35)]"
                  style={{
                    background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})`,
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Livestream
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="w-full px-4 py-8 md:px-6 lg:px-8">
          {livestreams.data.length === 0 ? (
            /* Empty state */
            <Card className="border-border bg-card shadow-xl">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div
                  className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border border-purple-200 dark:border-purple-500/20"
                  style={{
                    background: `linear-gradient(135deg, ${BRAND.fromMuted}, ${BRAND.toMuted})`,
                  }}
                >
                  <Video className="h-12 w-12 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">No livestreams yet</h3>
                <p className="mb-8 max-w-sm text-muted-foreground">
                  Create your first livestream to host virtual events with VDO.Ninja and YouTube.
                </p>
                <Link href="/livestreams/create">
                  <Button
                    size="lg"
                    className="rounded-lg px-8 text-white"
                    style={{
                      background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})`,
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Livestream
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-6 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{livestreams.total}</span>{" "}
                  {livestreams.total === 1 ? "livestream" : "livestreams"}
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {livestreams.data.map((livestream) => (
                  <Card
                    key={livestream.id}
                    className="group border-border bg-card shadow-lg transition-all duration-200 hover:border-purple-400 hover:shadow-md dark:hover:border-purple-500/30 dark:hover:shadow-[0_0_30px_rgba(147,51,234,0.08)]"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <CardTitle className="line-clamp-2 text-lg font-semibold text-foreground">
                          {livestream.title || "Untitled Livestream"}
                        </CardTitle>
                        {getStatusBadge(livestream.status)}
                      </div>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{livestream.roomName}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm">
                        {livestream.scheduledAt && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4 shrink-0" />
                            <span>{new Date(livestream.scheduledAt).toLocaleString()}</span>
                          </div>
                        )}
                        {livestream.startedAt && (
                          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <Play className="h-4 w-4 shrink-0" />
                            <span>Started: {new Date(livestream.startedAt).toLocaleString()}</span>
                          </div>
                        )}
                        {livestream.endedAt && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Square className="h-4 w-4 shrink-0" />
                            <span>Ended: {new Date(livestream.endedAt).toLocaleString()}</span>
                          </div>
                        )}
                        {!livestream.scheduledAt && !livestream.startedAt && !livestream.endedAt && (
                          <p className="text-muted-foreground">No schedule set</p>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Link href={`/livestreams/${livestream.id}`} className="flex-1">
                          <Button
                            variant="outline"
                            className="w-full border-border bg-muted/30 hover:border-purple-400 hover:bg-purple-500/10 dark:hover:border-purple-500/40 dark:hover:bg-purple-500/10 dark:hover:text-white"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Dashboard
                          </Button>
                        </Link>
                        {livestream.status !== "live" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="shrink-0 border-red-200 text-red-600 hover:border-red-400 hover:bg-red-50 hover:text-red-700 dark:border-red-500/30 dark:text-red-400 dark:hover:border-red-500/50 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Livestream
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &quot;
                                  {livestream.title || "Untitled Livestream"}&quot;?{" "}
                                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                                    This will also delete the livestream from YouTube if it was linked.
                                  </span>{" "}
                                  This action cannot be undone.
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {livestreams.last_page > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              {Array.from({ length: livestreams.last_page }, (_, i) => i + 1).map((page) => (
                <Link
                  key={page}
                  href={`/livestreams?page=${page}`}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    page === livestreams.current_page
                      ? "text-white shadow-lg"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  style={
                    page === livestreams.current_page
                      ? { background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }
                      : undefined
                  }
                >
                  {page}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
