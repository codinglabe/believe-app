"use client"
import type React from "react"
import { Head, useForm, usePage, Link } from "@inertiajs/react"
import { ArrowLeft, Save, Heart, Calendar, Users, BookOpen, Settings, AlertCircle } from "lucide-react"
import { Button } from "@/components/admin/ui/button"
import { Input } from "@/components/admin/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/admin/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import RichTextEditor from "@/components/admin/rich-text-editor"
import ArrayInput from "@/components/admin/array-input"
import { ImageUpload } from "@/components/admin/ImageUpload"
import type { User } from "@/types"
import { route } from "ziggy-js"
import { toast } from "sonner"
import AppLayout from "@/layouts/app-layout"
import { useState, useEffect } from "react"

interface Topic {
  id: number
  name: string
}

interface AdminCoursesCreateProps {
  topics: Topic[]
}

export default function NonprofitCoursesCreate() {
  const { topics } = usePage<AdminCoursesCreateProps>().props
  const { auth } = usePage().props as { auth: { user: User } }

  const [currentTab, setCurrentTab] = useState("basics")
  const [tabErrors, setTabErrors] = useState<Record<string, boolean>>({})

  const { data, setData, post, processing, errors, reset } = useForm({
    name: "",
    description: "",
    topic_id: topics.length > 0 ? topics[0].id.toString() : "",
    target_audience: "",
    meeting_link: "",
    pricing_type: "free",
    course_fee: "",
    start_date: "",
    start_time: "",
    end_date: "",
    duration: "",
    format: "online",
    max_participants: "",
    language: "English",
    learning_outcomes: [] as string[],
    prerequisites: [] as string[],
    materials_needed: [] as string[],
    community_impact: "",
    accessibility_features: [] as string[],
    volunteer_opportunities: false,
    certificate_provided: false,
    image: null as File | null,
  })

  const validateTab = (tab: string): boolean => {
    switch (tab) {
      case "basics":
        return !!(data.name && data.description && data.topic_id && data.target_audience)
      case "schedule":
        return !!(
          data.meeting_link &&
          data.format &&
          data.start_date &&
          data.start_time &&
          data.duration &&
          data.max_participants
        )
      case "content":
        return data.learning_outcomes.length > 0
      case "settings":
        return true
      default:
        return true
    }
  }

  useEffect(() => {
    const newTabErrors = {
      basics: !validateTab("basics"),
      schedule: !validateTab("schedule"),
      content: !validateTab("content"),
      settings: !validateTab("settings"),
    }
    setTabErrors(newTabErrors)
  }, [data])

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const errorFields = Object.keys(errors)
      if (
        errorFields.some((field) =>
          ["name", "description", "topic_id", "target_audience", "pricing_type", "course_fee"].includes(field),
        )
      ) {
        setCurrentTab("basics")
      } else if (
        errorFields.some((field) =>
          ["meeting_link", "format", "start_date", "start_time", "duration", "max_participants"].includes(field),
        )
      ) {
        setCurrentTab("schedule")
      } else if (errorFields.some((field) => ["learning_outcomes"].includes(field))) {
        setCurrentTab("content")
      }
    }
  }, [errors])

  const handleTabChange = (newTab: string) => {
    if (validateTab(currentTab)) {
      setCurrentTab(newTab)
    } else {
      toast.error("Please complete all required fields in the current tab before proceeding.")
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post(route("admin.courses.store"), {
      forceFormData: true,
      onSuccess: () => {
        reset()
        toast.success("Course created successfully!", {
          description: "Your community course is now available.",
        })
      },
      onError: (err) => {
        console.error("Form submission error:", err)
        toast.error("Failed to create course.", {
          description: "Please check the form for errors and try again.",
        })
      },
    })
  }

  return (
    <AppLayout>
      <Head title="Create Community Course" />

      <div className="space-y-6 m-6">
        <div className="flex items-center gap-4">
          <Link href={route("admin.courses.index")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Heart className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Create Community Course</h1>
              <p className="text-sm text-muted-foreground">Share knowledge and empower your community</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basics" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Basics
                {tabErrors.basics && <AlertCircle className="h-3 w-3 text-destructive" />}
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedule
                {tabErrors.schedule && <AlertCircle className="h-3 w-3 text-destructive" />}
              </TabsTrigger>
              <TabsTrigger value="content" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Content
                {tabErrors.content && <AlertCircle className="h-3 w-3 text-destructive" />}
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basics">
              <Card>
                <CardHeader>
                  <CardTitle>Course Basics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-medium">
                        Course Name *
                      </label>
                      <Input
                        id="name"
                        value={data.name}
                        onChange={(e) => setData("name", e.target.value)}
                        placeholder="e.g., Digital Literacy for Seniors"
                        className={errors.name ? "border-destructive" : ""}
                      />
                      {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="topic_id" className="text-sm font-medium">
                        Course Topic *
                      </label>
                      <Select value={data.topic_id.toString()} onValueChange={(value) => setData("topic_id", value)}>
                        <SelectTrigger className={errors.topic_id ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select topic" />
                        </SelectTrigger>
                        <SelectContent>
                          {topics.map((topic) => (
                            <SelectItem key={topic.id} value={topic.id.toString()}>
                              {topic.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="target_audience" className="text-sm font-medium">
                        Target Audience *
                      </label>
                      <Input
                        id="target_audience"
                        value={data.target_audience}
                        onChange={(e) => setData("target_audience", e.target.value)}
                        placeholder="e.g., Adults 50+, Job seekers"
                        className={errors.target_audience ? "border-destructive" : ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pricing *</label>
                      <div className="flex gap-2">
                        <Select value={data.pricing_type} onValueChange={(value) => setData("pricing_type", value)}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                          </SelectContent>
                        </Select>
                        {data.pricing_type === "paid" && (
                          <Input
                            type="number"
                            min="0"
                            step="5"
                            value={data.course_fee}
                            onChange={(e) => setData("course_fee", e.target.value)}
                            placeholder="Price ($)"
                            className="flex-1"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="description" className="text-sm font-medium">
                      Course Description *
                    </label>
                    <RichTextEditor
                      label=""
                      value={data.description}
                      onChange={(value) => setData("description", value)}
                      error={errors.description}
                      className="mt-1"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Course Image</label>
                    <ImageUpload label="" value={null} onChange={(file) => setData("image", file)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule">
              <Card>
                <CardHeader>
                  <CardTitle>Schedule & Meeting Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="meeting_link" className="text-sm font-medium">
                      Meeting Link *
                    </label>
                    <Input
                      id="meeting_link"
                      type="url"
                      value={data.meeting_link}
                      onChange={(e) => setData("meeting_link", e.target.value)}
                      placeholder="https://zoom.us/j/123456789 or https://meet.google.com/abc-defg-hij"
                      className={errors.meeting_link ? "border-destructive" : ""}
                    />
                    {errors.meeting_link && <p className="text-sm text-destructive">{errors.meeting_link}</p>}
                    <p className="text-xs text-muted-foreground">
                      Provide the meeting link where participants will join the course
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="format" className="text-sm font-medium">
                        Format *
                      </label>
                      <Select value={data.format} onValueChange={(value) => setData("format", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="online">💻 Online</SelectItem>
                          <SelectItem value="in_person">🏢 In-Person</SelectItem>
                          <SelectItem value="hybrid">🔄 Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="start_date" className="text-sm font-medium">
                        Start Date *
                      </label>
                      <Input
                        id="start_date"
                        type="date"
                        value={data.start_date}
                        onChange={(e) => setData("start_date", e.target.value)}
                        className={errors.start_date ? "border-destructive" : ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="end_date" className="text-sm font-medium">
                        End Date
                      </label>
                      <Input
                        id="end_date"
                        type="date"
                        value={data.end_date}
                        onChange={(e) => setData("end_date", e.target.value)}
                        className={errors.end_date ? "border-destructive" : ""}
                      />
                      {errors.end_date && <p className="text-sm text-destructive">{errors.end_date}</p>}
                      <p className="text-xs text-muted-foreground">Optional: Leave blank for single session courses</p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="start_time" className="text-sm font-medium">
                        Start Time *
                      </label>
                      <Input
                        id="start_time"
                        type="time"
                        value={data.start_time}
                        onChange={(e) => setData("start_time", e.target.value)}
                        className={errors.start_time ? "border-destructive" : ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="duration" className="text-sm font-medium">
                        Duration *
                      </label>
                      <Select value={data.duration} onValueChange={(value) => setData("duration", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1_session">Single Session</SelectItem>
                          <SelectItem value="1_week">1 Week</SelectItem>
                          <SelectItem value="2_weeks">2 Weeks</SelectItem>
                          <SelectItem value="1_month">1 Month</SelectItem>
                          <SelectItem value="6_weeks">6 Weeks</SelectItem>
                          <SelectItem value="3_months">3 Months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="max_participants" className="text-sm font-medium">
                        Max Participants *
                      </label>
                      <Input
                        id="max_participants"
                        type="number"
                        min="1"
                        max="50"
                        value={data.max_participants}
                        onChange={(e) => setData("max_participants", e.target.value)}
                        placeholder="20"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="language" className="text-sm font-medium">
                        Language
                      </label>
                      <Select value={data.language} onValueChange={(value) => setData("language", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="Spanish">Spanish</SelectItem>
                          <SelectItem value="French">French</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content">
              <Card>
                <CardHeader>
                  <CardTitle>Course Content & Impact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ArrayInput
                    id="learning_outcomes"
                    label="Learning Outcomes *"
                    values={data.learning_outcomes}
                    onChange={(values) => setData("learning_outcomes", values)}
                    error={errors.learning_outcomes}
                    placeholder="What will participants learn?"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ArrayInput
                      id="prerequisites"
                      label="Prerequisites"
                      values={data.prerequisites}
                      onChange={(values) => setData("prerequisites", values)}
                      error={errors.prerequisites}
                      placeholder="Required skills or knowledge"
                    />

                    <ArrayInput
                      id="materials_needed"
                      label="Materials Needed"
                      values={data.materials_needed}
                      onChange={(values) => setData("materials_needed", values)}
                      error={errors.materials_needed}
                      placeholder="What should participants bring?"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="community_impact" className="text-sm font-medium">
                      Community Impact
                    </label>
                    <RichTextEditor
                      label=""
                      value={data.community_impact}
                      onChange={(value) => setData("community_impact", value)}
                      error={errors.community_impact}
                      className="mt-1"
                    />
                  </div>

                  <ArrayInput
                    id="accessibility_features"
                    label="Accessibility Features"
                    values={data.accessibility_features}
                    onChange={(values) => setData("accessibility_features", values)}
                    error={errors.accessibility_features}
                    placeholder="Sign language, large print, etc."
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Additional Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <label htmlFor="certificate_provided" className="text-sm font-medium">
                          Provide Certificate
                        </label>
                        <p className="text-xs text-muted-foreground">Issue completion certificates to participants</p>
                      </div>
                      <Switch
                        id="certificate_provided"
                        checked={data.certificate_provided}
                        onCheckedChange={(checked) => setData("certificate_provided", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <label htmlFor="volunteer_opportunities" className="text-sm font-medium">
                          Volunteer Opportunities
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Allow participants to volunteer for future courses
                        </p>
                      </div>
                      <Switch
                        id="volunteer_opportunities"
                        checked={data.volunteer_opportunities}
                        onCheckedChange={(checked) => setData("volunteer_opportunities", checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-4 pt-6">
            <Link href={route("admin.courses.index")}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={processing} className="min-w-[140px]">
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Create Course
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
