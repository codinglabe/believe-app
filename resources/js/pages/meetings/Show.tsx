"use client"

import { useState } from "react"
import { Head, Link, router } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import AppLayout from "@/layouts/app-layout"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import {
  Calendar,
  Clock,
  Users,
  Video,
  Play,
  Square,
  Copy,
  RefreshCw,
  Download,
  Eye,
  Settings,
  Shield,
  MessageSquare,
  Monitor,
  BarChart3,
} from "lucide-react"

interface Meeting {
  id: number
  title: string
  description: string
  meeting_id: string
  scheduled_at: string
  duration_minutes: number
  status: "scheduled" | "active" | "completed" | "cancelled"
  max_participants: number
  is_recording_enabled: boolean
  is_chat_enabled: boolean
  is_screen_share_enabled: boolean
  meeting_password: string
  course: {
    id: number
    name: string
    slug: string
  }
  instructor: {
    id: number
    name: string
    email: string
  }
  participants: Array<{
    id: number
    user: {
      id: number
      name: string
      email: string
    }
    role: string
    status: string
    joined_at: string
    left_at: string | null
  }>
  recordings: Array<{
    id: number
    filename: string
    file_path: string
    file_size: number
    duration_seconds: number
    created_at: string
  }>
}

interface Props {
  meeting: Meeting
  hostLink: { token: string; expires_at: string } | null
  studentLink: { token: string; expires_at: string } | null
  attendanceStats: {
    total_participants: number
    current_participants: number
    total_duration: number
    average_duration: number
  }
  isInstructor: boolean
}

export default function ShowMeeting({ meeting, hostLink, studentLink, attendanceStats, isInstructor }: Props) {
  const [isRegenerating, setIsRegenerating] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
      case "active":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
      case "completed":
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
    }
  }

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB", "GB"]
    if (bytes === 0) return "0 Bytes"
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  const handleStartMeeting = () => {
    router.post(`/meetings/${meeting.id}/start`)
  }

  const handleEndMeeting = () => {
    router.post(`/meetings/${meeting.id}/end`)
  }

  const handleRegenerateLinks = async () => {
    setIsRegenerating(true)
    try {
      await router.post(`/meetings/${meeting.id}/regenerate-links`)
    } finally {
      setIsRegenerating(false)
    }
  }

  const joinUrl =
    isInstructor && hostLink
      ? `/meetings/join/${hostLink.token}`
      : studentLink
        ? `/meetings/join/${studentLink.token}`
        : null

  const LayoutComponent = isInstructor ? AppLayout : FrontendLayout

  return (
    <LayoutComponent>
      <Head title={`${meeting.title} - Meeting Details`} />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{meeting.title}</h1>
                  <Badge className={getStatusColor(meeting.status)}>{meeting.status}</Badge>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-2">{meeting.course.name}</p>
                {meeting.description && <p className="text-gray-700 dark:text-gray-300">{meeting.description}</p>}
              </div>
              <div className="mt-4 sm:mt-0 sm:ml-6 flex flex-col sm:flex-row gap-2">
                {isInstructor ? (
                  <>
                    {meeting.status === "scheduled" && (
                      <Button
                        onClick={handleStartMeeting}
                        className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Meeting
                      </Button>
                    )}
                    {meeting.status === "active" && (
                      <>
                        {joinUrl && (
                          <Link href={joinUrl}>
                            <Button className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700">
                              <Video className="w-4 h-4 mr-2" />
                              Join Meeting
                            </Button>
                          </Link>
                        )}
                        <Button variant="destructive" onClick={handleEndMeeting}>
                          <Square className="w-4 h-4 mr-2" />
                          End Meeting
                        </Button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {meeting.status === "active" && joinUrl && (
                      <Link href={joinUrl}>
                        <Button className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700">
                          <Video className="w-4 h-4 mr-2" />
                          Join Meeting
                        </Button>
                      </Link>
                    )}
                    {meeting.status === "scheduled" && (
                      <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                        <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <AlertDescription className="text-blue-800 dark:text-blue-300">
                          Meeting will start at {formatDateTime(meeting.scheduled_at)}
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="details" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4 bg-gray-100 dark:bg-gray-800">
                  <TabsTrigger
                    value="details"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="participants"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    Participants
                  </TabsTrigger>
                  <TabsTrigger
                    value="recordings"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    Recordings
                  </TabsTrigger>
                  {isInstructor && (
                    <TabsTrigger
                      value="analytics"
                      className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      Analytics
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="details">
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader>
                      <CardTitle className="flex items-center text-gray-900 dark:text-white">
                        <Settings className="w-5 h-5 mr-2" />
                        Meeting Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Meeting ID</label>
                          <div className="flex items-center space-x-2 mt-1">
                            <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm font-mono text-gray-900 dark:text-white">
                              {meeting.meeting_id}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(meeting.meeting_id)}
                              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Scheduled Time</label>
                          <div className="flex items-center space-x-2 mt-1">
                            <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <span className="text-sm text-gray-900 dark:text-white">
                              {formatDateTime(meeting.scheduled_at)}
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Duration</label>
                          <div className="flex items-center space-x-2 mt-1">
                            <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <span className="text-sm text-gray-900 dark:text-white">
                              {meeting.duration_minutes} minutes
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Max Participants
                          </label>
                          <div className="flex items-center space-x-2 mt-1">
                            <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <span className="text-sm text-gray-900 dark:text-white">
                              {meeting.max_participants || "Unlimited"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {meeting.meeting_password && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Meeting Password
                          </label>
                          <div className="flex items-center space-x-2 mt-1">
                            <Shield className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm font-mono text-gray-900 dark:text-white">
                              {meeting.meeting_password}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(meeting.meeting_password)}
                              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                          Features
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {meeting.is_recording_enabled && (
                            <Badge
                              variant="secondary"
                              className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                            >
                              <Video className="w-3 h-3 mr-1" />
                              Recording
                            </Badge>
                          )}
                          {meeting.is_chat_enabled && (
                            <Badge
                              variant="secondary"
                              className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                            >
                              <MessageSquare className="w-3 h-3 mr-1" />
                              Chat
                            </Badge>
                          )}
                          {meeting.is_screen_share_enabled && (
                            <Badge
                              variant="secondary"
                              className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                            >
                              <Monitor className="w-3 h-3 mr-1" />
                              Screen Share
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="participants">
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader>
                      <CardTitle className="flex items-center text-gray-900 dark:text-white">
                        <Users className="w-5 h-5 mr-2" />
                        Participants ({meeting.participants.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {meeting.participants.length > 0 ? (
                        <div className="space-y-3">
                          {meeting.participants.map((participant) => (
                            <div
                              key={participant.id}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <Avatar>
                                  <AvatarFallback className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                                    {participant.user.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{participant.user.name}</p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">{participant.user.email}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge
                                  variant={participant.role === "host" ? "default" : "secondary"}
                                  className={
                                    participant.role === "host"
                                      ? "bg-purple-600 text-white"
                                      : "bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                                  }
                                >
                                  {participant.role}
                                </Badge>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {participant.status === "joined" ? "In meeting" : "Left"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                          <p className="text-gray-500 dark:text-gray-400">No participants yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="recordings">
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader>
                      <CardTitle className="flex items-center text-gray-900 dark:text-white">
                        <Video className="w-5 h-5 mr-2" />
                        Recordings ({meeting.recordings.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {meeting.recordings.length > 0 ? (
                        <div className="space-y-3">
                          {meeting.recordings.map((recording) => (
                            <div
                              key={recording.id}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                            >
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{recording.filename}</p>
                                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                  <span>{formatFileSize(recording.file_size)}</span>
                                  <span>{formatDuration(recording.duration_seconds)}</span>
                                  <span>{new Date(recording.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Video className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                          <p className="text-gray-500 dark:text-gray-400">No recordings available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {isInstructor && (
                  <TabsContent value="analytics">
                    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <CardHeader>
                        <CardTitle className="flex items-center text-gray-900 dark:text-white">
                          <BarChart3 className="w-5 h-5 mr-2" />
                          Meeting Analytics
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                  Total Participants
                                </p>
                                <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                                  {attendanceStats.total_participants}
                                </p>
                              </div>
                              <Users className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                            </div>
                          </div>

                          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                                  Currently Active
                                </p>
                                <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                                  {attendanceStats.current_participants}
                                </p>
                              </div>
                              <Video className="w-8 h-8 text-green-500 dark:text-green-400" />
                            </div>
                          </div>

                          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                  Average Duration
                                </p>
                                <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                                  {Math.round(attendanceStats.average_duration)}m
                                </p>
                              </div>
                              <Clock className="w-8 h-8 text-purple-500 dark:text-purple-400" />
                            </div>
                          </div>

                          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                                  Total Duration
                                </p>
                                <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">
                                  {Math.round(attendanceStats.total_duration / 60)}h
                                </p>
                              </div>
                              <BarChart3 className="w-8 h-8 text-orange-500 dark:text-orange-400" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {joinUrl && (
                    <Link href={joinUrl} className="block">
                      <Button className="w-full bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700">
                        <Video className="w-4 h-4 mr-2" />
                        {isInstructor ? "Join as Host" : "Join Meeting"}
                      </Button>
                    </Link>
                  )}

                  {isInstructor && (
                    <Button
                      variant="outline"
                      className="w-full bg-transparent border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={handleRegenerateLinks}
                      disabled={isRegenerating}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isRegenerating ? "animate-spin" : ""}`} />
                      Regenerate Links
                    </Button>
                  )}

                  <Link href="/meetings" className="block">
                    <Button
                      variant="ghost"
                      className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Back to Meetings
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Meeting Links */}
              {(hostLink || studentLink) && (
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-gray-900 dark:text-white">Meeting Access</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {hostLink && isInstructor && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Host Link</label>
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            value={`${window.location.origin}/meetings/join/${hostLink.token}`}
                            readOnly
                            className="text-xs bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 flex-1 text-gray-900 dark:text-white"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(`${window.location.origin}/meetings/join/${hostLink.token}`)}
                            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Expires: {new Date(hostLink.expires_at).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {studentLink && !isInstructor && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Your Meeting Link
                        </label>
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            value={`${window.location.origin}/meetings/join/${studentLink.token}`}
                            readOnly
                            className="text-xs bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 flex-1 text-gray-900 dark:text-white"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(`${window.location.origin}/meetings/join/${studentLink.token}`)
                            }
                            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Expires: {new Date(studentLink.expires_at).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Course Info */}
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white">Course Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Course</label>
                      <p className="text-sm mt-1 text-gray-900 dark:text-white">{meeting.course.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Instructor</label>
                      <p className="text-sm mt-1 text-gray-900 dark:text-white">{meeting.instructor.name}</p>
                    </div>
                    <Link href={`/courses/${meeting.course.slug}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-transparent border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        View Course
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </LayoutComponent>
  )
}
