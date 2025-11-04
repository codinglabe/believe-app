"use client"
import type React from "react"
import { Head, useForm, usePage, Link } from "@inertiajs/react"
import { ArrowLeft, Save, Heart, Calendar, Users, BookOpen, Settings, AlertCircle, CheckCircle } from "lucide-react"
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

interface Organization {
  id: number
  name: string
  email: string
}

interface Creator {
  id: number
  name: string
  email: string
}

interface Course {
  id: number
  type: "course" | "event"
  topic_id: number | null
  event_type_id: number | null
  organization_id: number
  user_id: number
  name: string
  slug: string
  description: string
  pricing_type: "free" | "paid"
  course_fee: number | null
  start_date: string
  start_time: string
  end_date: string | null
  duration: "1_session" | "1_week" | "2_weeks" | "1_month" | "6_weeks" | "3_months"
  format: "online" | "in_person" | "hybrid"
  max_participants: number
  language: string
  target_audience: string
  community_impact: string | null
  learning_outcomes: string[]
  prerequisites: string[]
  materials_needed: string[]
  accessibility_features: string[]
  certificate_provided: boolean
  volunteer_opportunities: boolean
  image: string | null
  enrolled: number
  rating: number
  total_reviews: number
  last_updated: string | null
  created_at: string
  updated_at: string
  topic: Topic | null
  event_type?: EventType | null
  organization: Organization
  creator: Creator
  image_url: string | null
  formatted_price: string
  formatted_duration: string
  formatted_format: string
  meeting_link?: string | null
}

interface EventType {
  id: number
  name: string
  category: string
}

interface AdminCoursesEditProps {
  course: Course
  topics: Topic[]
  eventTypes: EventType[]
}

export default function AdminCoursesEdit() {
  const { course, topics, eventTypes } = usePage<AdminCoursesEditProps>().props
  const { auth } = usePage().props as { auth: { user: User } }

  const [currentTab, setCurrentTab] = useState("basics")
  const [tabErrors, setTabErrors] = useState<Record<string, boolean>>({})
  const [tabCompletion, setTabCompletion] = useState<Record<string, boolean>>({})
  const [canSwitchTab, setCanSwitchTab] = useState<Record<string, boolean>>({})

  // Group event types by category
  const groupedEventTypes = eventTypes.reduce((acc, type) => {
    const category = type.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(type)
    return acc
  }, {} as Record<string, EventType[]>)

  const { data, setData, post, processing, errors, reset } = useForm({
    // Basic Information (pre-populated with existing data)
    type: course.type || "course",
    name: course.name,
    description: course.description,
    topic_id: course.topic_id?.toString() || "",
    event_type_id: course.event_type_id?.toString() || "",

    // Pricing (pre-populated)
    pricing_type: course.pricing_type,
    course_fee: course.course_fee?.toString() || "",

    // Schedule & Format (pre-populated)
    start_date: Date.parse(course.start_date) ? course.start_date.substring(0, 10) : "",
    start_time: course.start_time.substring(0, 5),
    end_date: course.end_date && Date.parse(course.end_date) ? course.end_date.substring(0, 10) : "",
    duration: course.duration,
    format: course.format,
    meeting_link: course.meeting_link || "", // Added meeting_link field

    // Configuration (pre-populated)
    max_participants: course.max_participants.toString(),
    language: course.language,

    // Target Audience & Impact (pre-populated)
    target_audience: course.target_audience,
    community_impact: course.community_impact || "",

    // Course Content (pre-populated)
    learning_outcomes: course.learning_outcomes || [],
    prerequisites: course.prerequisites || [],
    materials_needed: course.materials_needed || [],
    accessibility_features: course.accessibility_features || [],

    // Settings (pre-populated)
    certificate_provided: course.certificate_provided,
    volunteer_opportunities: course.volunteer_opportunities,

    // Media
    image: null as File | null,

    // Laravel method spoofing for updates
    _method: "PUT",
  })

  const validateTab = (tab: string): boolean => {
    switch (tab) {
      case "basics":
        const hasType = !!data.type
        const hasTopicOrEventType = data.type === "course" 
          ? !!data.topic_id 
          : !!data.event_type_id
        return !!(data.name && data.description && hasType && hasTopicOrEventType)
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
        errorFields.some((field) => ["name", "description", "topic_id", "event_type_id", "type", "pricing_type", "course_fee"].includes(field))
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
    post(route("admin.courses.update", course.slug), {
      forceFormData: true,
      onSuccess: () => {
        toast.success(`${data.type === "course" ? "Course" : "Event"} updated successfully!`, {
          description: `Your ${data.type === "course" ? "community course" : "event"} has been updated.`,
        })
      },
      onError: (err) => {
        console.error("Form submission error:", err)
        toast.error("Failed to update course.", {
          description: "Please check the form for errors and try again.",
        })
      },
    })
  }

  const TabTriggerWithStatus = ({ value, children }: { value: string; children: React.ReactNode }) => (
    <TabsTrigger
      value={value}
      className={`relative ${!canSwitchTab[value] ? "opacity-50 cursor-not-allowed" : ""}`}
      onClick={(e) => {
        if (!canSwitchTab[value]) {
          e.preventDefault()
          handleTabChange(value)
        }
      }}
    >
      {children}
      {tabErrors[value] && <AlertCircle className="w-4 h-4 text-destructive ml-2" />}
      {tabCompletion[value] && !tabErrors[value] && <CheckCircle className="w-4 h-4 text-green-500 ml-2" />}
    </TabsTrigger>
  )

  return (
    <AppLayout>
      <Head title={`Edit ${data.type === "course" ? "Course" : "Event"} - ${course.name} - Courses & Events`} />

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
              <h1 className="text-2xl font-bold">Edit {data.type === "course" ? "Course" : "Event"}</h1>
              <p className="text-sm text-muted-foreground">Update your {data.type === "course" ? "course" : "event"} details and settings</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Course Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{course.enrolled}</div>
                <div className="text-sm text-muted-foreground">Enrolled Students</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{course.rating}</div>
                <div className="text-sm text-muted-foreground">Average Rating</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{course.total_reviews}</div>
                <div className="text-sm text-muted-foreground">Total Reviews</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{course.formatted_duration}</div>
                <div className="text-sm text-muted-foreground">Duration</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit}>
          <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabTriggerWithStatus value="basics">
                <BookOpen className="h-4 w-4" />
                Basics
              </TabTriggerWithStatus>
              <TabTriggerWithStatus value="schedule">
                <Calendar className="h-4 w-4" />
                Schedule
              </TabTriggerWithStatus>
              <TabTriggerWithStatus value="content">
                <Users className="h-4 w-4" />
                Content
              </TabTriggerWithStatus>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basics">
              <Card>
                <CardHeader>
                  <CardTitle>{data.type === "course" ? "Course" : "Event"} Basics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="type" className="text-sm font-medium">
                        Type *
                      </label>
                      <Select value={data.type} onValueChange={(value) => {
                        setData("type", value as "course" | "event")
                        // Reset topic/event type when switching
                        if (value === "course") {
                          setData("event_type_id", "")
                          if (!data.topic_id && topics.length > 0) {
                            setData("topic_id", topics[0].id.toString())
                          }
                        } else {
                          setData("topic_id", "")
                          if (!data.event_type_id) {
                            setData("event_type_id", "")
                          }
                        }
                      }}>
                        <SelectTrigger className={errors.type ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="course">Course</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.type && <p className="text-sm text-destructive">{errors.type}</p>}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-medium">
                        {data.type === "course" ? "Course" : "Event"} Name *
                      </label>
                      <Input
                        id="name"
                        value={data.name}
                        onChange={(e) => setData("name", e.target.value)}
                        placeholder={data.type === "course" ? "e.g., Digital Literacy for Seniors" : "e.g., Community Health Fair"}
                        className={errors.name ? "border-destructive" : ""}
                      />
                      {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                    </div>

                    {data.type === "course" && (
                      <div className="space-y-2">
                        <label htmlFor="topic_id" className="text-sm font-medium">
                          Course Topic *
                        </label>
                        <Select value={data.topic_id || ""} onValueChange={(value) => setData("topic_id", value)}>
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
                        {errors.topic_id && <p className="text-sm text-destructive">{errors.topic_id}</p>}
                      </div>
                    )}

                    {data.type === "event" && (
                      <div className="space-y-2">
                        <label htmlFor="event_type_id" className="text-sm font-medium">
                          Event Type *
                        </label>
                        <Select value={data.event_type_id || ""} onValueChange={(value) => setData("event_type_id", value)}>
                          <SelectTrigger className={errors.event_type_id ? "border-destructive" : ""}>
                            <SelectValue placeholder="Select event type" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(groupedEventTypes).map(([category, types]) => (
                              <div key={category}>
                                <div className="px-2 py-1.5 text-sm font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800">
                                  {category}
                                </div>
                                {types.map((type) => (
                                  <SelectItem key={type.id} value={type.id.toString()}>
                                    {type.name}
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.event_type_id && <p className="text-sm text-destructive">{errors.event_type_id}</p>}
                      </div>
                    )}

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
                      {data.type === "course" ? "Course" : "Event"} Description *
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
                    <label className="text-sm font-medium">{data.type === "course" ? "Course" : "Event"} Image</label>
                    <ImageUpload label="" value={course.image_url || null} onChange={(file) => setData("image", file)} />
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
                      Provide the meeting link where participants will join the {data.type === "course" ? "course" : "event"}
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
                      <p className="text-xs text-muted-foreground">
                        Optional: Leave blank for single session {data.type === "course" ? "courses" : "events"}
                      </p>
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
                  <CardTitle>{data.type === "course" ? "Course Content & Impact" : "Event Content & Impact"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ArrayInput
                    id="learning_outcomes"
                    label={data.type === "course" ? "Learning Outcomes *" : "Event Outcomes *"}
                    values={data.learning_outcomes}
                    onChange={(values) => setData("learning_outcomes", values)}
                    error={errors.learning_outcomes}
                    placeholder={data.type === "course" ? "What will participants learn?" : "What will participants experience or gain?"}
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
                          Allow participants to volunteer for future {data.type === "course" ? "courses" : "events"}
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
                  {data.type === "course" ? "Updating Course..." : "Updating Event..."}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update {data.type === "course" ? "Course" : "Event"}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
