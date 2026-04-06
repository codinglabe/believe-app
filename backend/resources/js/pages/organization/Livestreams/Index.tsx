"use client"

import { Head, Link } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import AppLayout from "@/layouts/app-layout"
import { Video, Plus, Calendar, Play, Square, Eye, Trash2 } from "lucide-react"
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
    if (confirm('Are you sure you want to delete this livestream? This action cannot be undone.')) {
      router.delete(`/livestreams/${id}`, {
        preserveScroll: true,
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Draft", className: "bg-gray-500/20 text-gray-400" },
      scheduled: { label: "Scheduled", className: "bg-blue-500/20 text-blue-400" },
      live: { label: "Live", className: "bg-red-500/20 text-red-400 animate-pulse" },
      ended: { label: "Ended", className: "bg-gray-500/20 text-gray-400" },
      cancelled: { label: "Cancelled", className: "bg-red-500/20 text-red-400" },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    return <Badge className={config.className}>{config.label}</Badge>
  }

  return (
    <AppLayout>
      <Head title="My Livestreams" />
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Livestreams</h1>
            <p className="text-gray-400">{organization.name}</p>
          </div>
          <Link href="/livestreams/create">
            <Button className="bg-gradient-to-r from-[#FF1493] to-[#DC143C] hover:from-[#FF1493]/90 hover:to-[#DC143C]/90">
              <Plus className="w-4 h-4 mr-2" />
              Create New Livestream
            </Button>
          </Link>
        </div>

        {livestreams.data.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Video className="w-16 h-16 mx-auto mb-4 text-gray-500 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No livestreams yet</h3>
              <p className="text-gray-400 mb-6">
                Create your first livestream to start hosting virtual events
              </p>
              <Link href="/livestreams/create">
                <Button className="bg-gradient-to-r from-[#FF1493] to-[#DC143C]">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Livestream
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {livestreams.data.map((livestream) => (
              <Card key={livestream.id} className="hover:border-[#FF1493]/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg">
                      {livestream.title || "Untitled Livestream"}
                    </CardTitle>
                    {getStatusBadge(livestream.status)}
                  </div>
                  <p className="text-sm text-gray-400 font-mono">{livestream.roomName}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    {livestream.scheduledAt && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(livestream.scheduledAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {livestream.startedAt && (
                      <div className="flex items-center gap-2 text-green-400">
                        <Play className="w-4 h-4" />
                        <span>
                          Started: {new Date(livestream.startedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {livestream.endedAt && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Square className="w-4 h-4" />
                        <span>
                          Ended: {new Date(livestream.endedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/livestreams/${livestream.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        <Eye className="w-4 h-4 mr-2" />
                        View Dashboard
                      </Button>
                    </Link>
                    {livestream.status !== 'live' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon" className="text-red-400 hover:text-red-300 hover:border-red-400">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Livestream</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{livestream.title || 'Untitled Livestream'}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(livestream.id)}
                              className="bg-red-600 hover:bg-red-700"
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
        )}

        {/* Pagination */}
        {livestreams.last_page > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {Array.from({ length: livestreams.last_page }, (_, i) => i + 1).map((page) => (
              <Link
                key={page}
                href={`/livestreams?page=${page}`}
                className={`px-4 py-2 rounded ${
                  page === livestreams.current_page
                    ? "bg-[#FF1493] text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {page}
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

