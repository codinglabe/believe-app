"use client"

import type React from "react"
import { useState } from "react"
import { Head, Link, router } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, Users, Video, Search, Filter, Plus, Play, Eye, Settings } from "lucide-react"
import AppLayout from "@/layouts/app-layout"
import FrontendLayout from "@/layouts/frontend/frontend-layout"

interface Meeting {
  id: number
  title: string
  description: string
  meeting_id: string
  scheduled_at: string
  duration_minutes: number
  status: "scheduled" | "active" | "completed" | "cancelled"
  max_participants: number
  google_meet_url?: string
  google_meet_id?: string
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
  join_url?: string
  participants_count?: number
}

interface Props {
  meetings: {
    data: Meeting[]
    links: any[]
    meta: any
  }
  userRole: "organization" | "user"
  filters: {
    search?: string
    status?: string
  }
}

export default function MeetingsIndex({ meetings, userRole, filters }: Props) {
  const [search, setSearch] = useState(filters.search || "")
  const [status, setStatus] = useState(filters.status || "all")
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.get("/meetings", { search, status }, { preserveState: true })
  }

  const handleStatusFilter = (value: string) => {
    setStatus(value)
    router.get("/meetings", { search, status: value }, { preserveState: true })
  }

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
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const canJoinMeeting = (meeting: Meeting) => {
    if (userRole === "user") return true
    return meeting.status === "active" && (meeting.join_url || meeting.google_meet_url)
  }

  const LayoutComponent = userRole === "organization" ? AppLayout : FrontendLayout

  return (
    <LayoutComponent>
      <Head title="Meetings" />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {userRole === "organization" ? "My Meetings" : "Course Meetings"}
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  {userRole === "organization"
                    ? "Manage and host your course meetings"
                    : "Join meetings for your enrolled courses"}
                </p>
              </div>
              {userRole === "organization" && (
                <div className="mt-4 sm:mt-0">
                  <Link href="/meetings/create">
                    <Button className="inline-flex items-center bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Meeting
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Search meetings..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>
                </div>
                <div className="sm:w-48">
                  <Select value={status} onValueChange={handleStatusFilter}>
                    <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <SelectItem
                        value="all"
                        className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        All Status
                      </SelectItem>
                      <SelectItem
                        value="scheduled"
                        className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Scheduled
                      </SelectItem>
                      <SelectItem
                        value="active"
                        className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Active
                      </SelectItem>
                      <SelectItem
                        value="completed"
                        className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Completed
                      </SelectItem>
                      <SelectItem
                        value="cancelled"
                        className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Cancelled
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700"
                >
                  Search
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Meetings Grid */}
          {meetings.data.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {meetings.data.map((meeting) => (
                <Card
                  key={meeting.id}
                  className="hover:shadow-lg transition-shadow duration-200 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                          {meeting.title}
                        </CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{meeting.course.name}</p>
                      </div>
                      <Badge className={`ml-2 ${getStatusColor(meeting.status)}`}>{meeting.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {meeting.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{meeting.description}</p>
                      )}

                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="w-4 h-4 mr-2" />
                        {formatDateTime(meeting.scheduled_at)}
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          {meeting.duration_minutes} minutes
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2" />
                          {meeting.participants_count || 0}/{meeting.max_participants || "∞"}
                        </div>
                      </div>

                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Video className="w-4 h-4 mr-2" />
                        ID: {meeting.meeting_id}
                        {meeting.google_meet_id && (
                          <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 px-2 py-1 rounded">
                            Google Meet
                          </span>
                        )}
                      </div>

                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex gap-2">
                          {userRole === "organization" ? (
                            <>
                              <Link href={`/meetings/${meeting.id}`} className="flex-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full bg-transparent border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                  <Settings className="w-4 h-4 mr-2" />
                                  Manage
                                </Button>
                              </Link>
                              {meeting.status === "scheduled" && (
                                <Button
                                  size="sm"
                                  className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                                  onClick={() => router.post(`/meetings/${meeting.id}/start`)}
                                >
                                  <Play className="w-4 h-4 mr-2" />
                                  Start
                                </Button>
                              )}
                              {meeting.status === "active" && (
                                <Link href={`/meetings/${meeting.meeting_id}/join`} className="flex-1">
                                  <Button
                                    size="sm"
                                    className="w-full bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700"
                                  >
                                    <Video className="w-4 h-4 mr-2" />
                                    Join
                                  </Button>
                                </Link>
                              )}
                            </>
                          ) : (
                            <>
                              <Link href={`/meetings/${meeting.id}`} className="flex-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full bg-transparent border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Details
                                </Button>
                              </Link>
                              {canJoinMeeting(meeting) && (meeting.join_url || meeting.google_meet_url) && (
                                <Link
                                  href={meeting.google_meet_url || meeting.join_url || "#"}
                                  target={meeting.google_meet_url ? "_blank" : undefined}
                                  rel={meeting.google_meet_url ? "noopener noreferrer" : undefined}
                                  className="flex-1"
                                >
                                  <Button
                                    size="sm"
                                    className="w-full bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700"
                                  >
                                    <Video className="w-4 h-4 mr-2" />
                                    {meeting.google_meet_url ? "Join Google Meet" : "Join"}
                                  </Button>
                                </Link>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-12 text-center">
                <Video className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No meetings found</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {userRole === "organization"
                    ? "You haven't created any meetings yet."
                    : "No meetings available for your enrolled courses."}
                </p>
                {userRole === "organization" && (
                  <Link href="/meetings/create">
                    <Button className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Meeting
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {meetings.links && meetings.links.length > 3 && (
            <div className="mt-8 flex justify-center">
              <div className="flex space-x-1">
                {meetings.links.map((link, index) => (
                  <Link
                    key={index}
                    href={link.url || "#"}
                    className={`px-3 py-2 text-sm rounded-md transition-colors ${
                      link.active
                        ? "bg-purple-600 text-white dark:bg-purple-600"
                        : link.url
                          ? "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    }`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </LayoutComponent>
  )
}
