"use client"

import type React from "react"
import { Head, useForm } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/admin/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/admin/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, Clock, Users, Video, Shield, MessageSquare, Monitor } from "lucide-react"
import AppLayout from "@/layouts/app-layout"

interface Course {
  id: number
  name: string
}

interface Props {
  courses: Course[]
}

export default function CreateMeeting({ courses }: Props) {
  const { data, setData, post, processing, errors } = useForm({
    course_id: "",
    title: "",
    description: "",
    scheduled_at: "",
    duration_minutes: 60,
    max_participants: "",
    is_recording_enabled: true,
    is_chat_enabled: true,
    is_screen_share_enabled: true,
    meeting_password: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post("/meetings")
  }

  const durationOptions = [
    { value: 15, label: "15 minutes" },
    { value: 30, label: "30 minutes" },
    { value: 45, label: "45 minutes" },
    { value: 60, label: "1 hour" },
    { value: 90, label: "1.5 hours" },
    { value: 120, label: "2 hours" },
    { value: 180, label: "3 hours" },
    { value: 240, label: "4 hours" },
  ]

  // Get current date and time for minimum scheduling
  const now = new Date()
  const minDateTime = new Date(now.getTime() + 15 * 60000) // 15 minutes from now
  const minDateTimeString = minDateTime.toISOString().slice(0, 16)

  return (
    <AppLayout>
      <Head title="Create Meeting" />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create New Meeting</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Set up a virtual meeting for your course participants
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Information */}
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center text-gray-900 dark:text-white">
                      <Video className="w-5 h-5 mr-2" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="course_id" className="text-gray-700 dark:text-gray-300">
                        Course *
                      </Label>
                      <Select value={data.course_id} onValueChange={(value) => setData("course_id", value)}>
                        <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                          <SelectValue placeholder="Select a course" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                          {courses.map((course) => (
                            <SelectItem
                              key={course.id}
                              value={course.id.toString()}
                              className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              {course.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.course_id && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.course_id}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="title" className="text-gray-700 dark:text-gray-300">
                        Meeting Title *
                      </Label>
                      <Input
                        id="title"
                        type="text"
                        value={data.title}
                        onChange={(e) => setData("title", e.target.value)}
                        placeholder="Enter meeting title"
                        className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${errors.title ? "border-red-300 dark:border-red-600" : ""}`}
                      />
                      {errors.title && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.title}</p>}
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-gray-700 dark:text-gray-300">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        value={data.description}
                        onChange={(e) => setData("description", e.target.value)}
                        placeholder="Enter meeting description (optional)"
                        rows={3}
                        className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${errors.description ? "border-red-300 dark:border-red-600" : ""}`}
                      />
                      {errors.description && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Schedule & Duration */}
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center text-gray-900 dark:text-white">
                      <Calendar className="w-5 h-5 mr-2" />
                      Schedule & Duration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="scheduled_at" className="text-gray-700 dark:text-gray-300">
                        Scheduled Date & Time *
                      </Label>
                      <Input
                        id="scheduled_at"
                        type="datetime-local"
                        value={data.scheduled_at}
                        onChange={(e) => setData("scheduled_at", e.target.value)}
                        min={minDateTimeString}
                        className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white ${errors.scheduled_at ? "border-red-300 dark:border-red-600" : ""}`}
                      />
                      {errors.scheduled_at && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.scheduled_at}</p>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Meeting must be scheduled at least 15 minutes in advance
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="duration_minutes" className="text-gray-700 dark:text-gray-300">
                        Duration *
                      </Label>
                      <Select
                        value={data.duration_minutes.toString()}
                        onValueChange={(value) => setData("duration_minutes", Number.parseInt(value))}
                      >
                        <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                          <Clock className="w-4 h-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                          {durationOptions.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value.toString()}
                              className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.duration_minutes && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.duration_minutes}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Meeting Settings */}
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center text-gray-900 dark:text-white">
                      <Shield className="w-5 h-5 mr-2" />
                      Meeting Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="max_participants" className="text-gray-700 dark:text-gray-300">
                        Maximum Participants
                      </Label>
                      <Input
                        id="max_participants"
                        type="number"
                        value={data.max_participants}
                        onChange={(e) => setData("max_participants", e.target.value)}
                        placeholder="Leave empty for unlimited"
                        min="1"
                        max="100"
                        className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${errors.max_participants ? "border-red-300 dark:border-red-600" : ""}`}
                      />
                      {errors.max_participants && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.max_participants}</p>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Leave empty for unlimited participants
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="meeting_password" className="text-gray-700 dark:text-gray-300">
                        Meeting Password
                      </Label>
                      <Input
                        id="meeting_password"
                        type="text"
                        value={data.meeting_password}
                        onChange={(e) => setData("meeting_password", e.target.value)}
                        placeholder="Optional password for extra security"
                        maxLength={20}
                        className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${errors.meeting_password ? "border-red-300 dark:border-red-600" : ""}`}
                      />
                      {errors.meeting_password && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.meeting_password}</p>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Optional: Add a password for extra security
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Features & Actions */}
              <div className="space-y-6">
                {/* Features */}
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-gray-900 dark:text-white">Features</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Video className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <Label htmlFor="recording" className="text-gray-700 dark:text-gray-300">
                          Recording
                        </Label>
                      </div>
                      <Switch
                        id="recording"
                        checked={data.is_recording_enabled}
                        onCheckedChange={(checked) => setData("is_recording_enabled", checked)}
                      />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Allow meeting recording for later review</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <Label htmlFor="chat" className="text-gray-700 dark:text-gray-300">
                          Chat
                        </Label>
                      </div>
                      <Switch
                        id="chat"
                        checked={data.is_chat_enabled}
                        onCheckedChange={(checked) => setData("is_chat_enabled", checked)}
                      />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Enable text chat during the meeting</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Monitor className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <Label htmlFor="screen_share" className="text-gray-700 dark:text-gray-300">
                          Screen Share
                        </Label>
                      </div>
                      <Switch
                        id="screen_share"
                        checked={data.is_screen_share_enabled}
                        onCheckedChange={(checked) => setData("is_screen_share_enabled", checked)}
                      />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Allow participants to share their screen</p>
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <Button
                        type="submit"
                        className="w-full bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700"
                        disabled={processing}
                      >
                        {processing ? "Creating Meeting..." : "Create Meeting"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full bg-transparent border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={() => window.history.back()}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Info */}
                <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="text-blue-800 dark:text-blue-300">
                    Meeting links will be automatically generated and sent to enrolled students once the meeting is
                    created.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
