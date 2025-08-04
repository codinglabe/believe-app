"use client"
import type React from "react"
import { Head, useForm, usePage, Link } from "@inertiajs/react"
import { ArrowLeft, Save, Heart, X } from "lucide-react"
import { Button } from "@/components/admin/ui/button"
import { Input } from "@/components/admin/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/admin/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import RichTextEditor from "@/components/admin/rich-text-editor"
import ArrayInput from "@/components/admin/array-input"
import { ImageUpload } from "@/components/admin/ImageUpload"
import type { User } from "@/types"
import { route } from "ziggy-js"
import { toast } from "sonner"
import AppLayout from "@/layouts/app-layout"
import { Badge } from "@/components/admin/ui/badge"

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
  topic_id: number | null
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
  organization: Organization
  creator: Creator
  image_url: string | null
  formatted_price: string
  formatted_duration: string
  formatted_format: string
}

interface AdminCoursesEditProps {
  course: Course
  topics: Topic[]
}

export default function AdminCoursesEdit() {
  const { course, topics } = usePage<AdminCoursesEditProps>().props
  const { auth } = usePage().props as { auth: { user: User } }

  const { data, setData, post, processing, errors, reset } = useForm({
    // Basic Information (pre-populated with existing data)
    name: course.name,
    description: course.description,
    topic_id: course.topic_id?.toString() || "",

    // Pricing (pre-populated)
    pricing_type: course.pricing_type,
    course_fee: course.course_fee?.toString() || "",

    // Schedule & Format (pre-populated)
    start_date: course.start_date, // Should already be in YYYY-MM-DD format
    start_time: course.start_time.substring(0, 5), // Ensure HH:MM format
    end_date: course.end_date || "",
    duration: course.duration,
    format: course.format,

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post(route("admin.courses.update", course.slug), {
      forceFormData: true,
      onSuccess: () => {
        toast.success("Course updated successfully!", {
          description: "Your community course has been updated.",
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

  const getDurationOptions = () => [
    { value: "1_session", label: "Single Session (2-3 hours)" },
    { value: "1_week", label: "1 Week" },
    { value: "2_weeks", label: "2 Weeks" },
    { value: "1_month", label: "1 Month" },
    { value: "6_weeks", label: "6 Weeks" },
    { value: "3_months", label: "3 Months" },
  ]

  const getFormatOptions = () => [
    { value: "online", label: "💻 Online (Zoom/Virtual)" },
    { value: "in_person", label: "🏢 In-Person" },
    { value: "hybrid", label: "🔄 Hybrid (Online + In-Person)" },
  ]

  return (
    <AppLayout>
      <Head title={`Edit Course - ${course.name}`} />

      <div className="space-y-6 m-10">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={route("admin.courses.index")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Heart className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Edit Community Course</h1>
              <p className="text-muted-foreground">Update your course details and settings</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Course Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-semibold text-foreground">
                      Course Name *
                    </label>
                    <Input
                      id="name"
                      type="text"
                      value={data.name}
                      onChange={(e) => setData("name", e.target.value)}
                      placeholder="e.g., Digital Literacy for Seniors"
                      className={errors.name ? "border-destructive" : ""}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <X className="h-3 w-3" />
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="description" className="text-sm font-semibold text-foreground">
                      Course Description *
                    </label>
                    <RichTextEditor
                      id="description"
                      label=""
                      value={data.description}
                      onChange={(value) => setData("description", value)}
                      error={errors.description}
                      className="mt-1 w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Describe what participants will learn and how it benefits the community
                    </p>
                    {errors.description && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <X className="h-3 w-3" />
                        {errors.description}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="topic_id" className="text-sm font-semibold text-foreground">
                        Course Topic *
                      </label>
                      <Select value={data.topic_id} onValueChange={(value) => setData("topic_id", value)}>
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
                      {errors.topic_id && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <X className="h-3 w-3" />
                          {errors.topic_id}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Pricing Type *</label>
                      <Select
                        value={data.pricing_type}
                        onValueChange={(value: "free" | "paid") => setData("pricing_type", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">🆓 Free</SelectItem>
                          <SelectItem value="paid">💰 Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Course Fee (conditional) */}
                  {data.pricing_type === "paid" && (
                    <div className="space-y-2">
                      <label htmlFor="course_fee" className="text-sm font-semibold text-foreground">
                        Course Fee ($) *
                      </label>
                      <Input
                        id="course_fee"
                        type="number"
                        step="0.01"
                        min="0"
                        value={data.course_fee}
                        onChange={(e) => setData("course_fee", e.target.value)}
                        placeholder="0.00"
                        className={errors.course_fee ? "border-destructive" : ""}
                      />
                      {errors.course_fee && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <X className="h-3 w-3" />
                          {errors.course_fee}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Course Image */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Course Image</h3>
                <div className="space-y-4">
                  {course.image_url && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Current Image</label>
                      <div className="relative inline-block">
                        <img
                          src={course.image_url || "/placeholder.svg"}
                          alt="Current course image"
                          className="w-48 h-32 object-cover rounded-lg border border-border shadow-sm"
                        />
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                  <ImageUpload
                    label={course.image_url ? "Update Course Image (Optional)" : "Upload Course Image (Optional)"}
                    value={null}
                    onChange={(file) => setData("image", file)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {course.image_url
                      ? "Upload a new image to replace the current one, or leave empty to keep the existing image"
                      : "Add a welcoming image that represents your course topic"}
                  </p>
                </div>
                {errors.image && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive flex items-center gap-2">
                      <X className="h-4 w-4" />
                      {errors.image}
                    </p>
                  </div>
                )}
              </div>

              {/* Course Configuration */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                  Course Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Course Format *</label>
                    <Select
                      value={data.format}
                      onValueChange={(value: "online" | "in_person" | "hybrid") => setData("format", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getFormatOptions().map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Duration *</label>
                    <Select value={data.duration} onValueChange={(value: any) => setData("duration", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getDurationOptions().map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="max_participants" className="text-sm font-semibold text-foreground">
                      Max Participants *
                    </label>
                    <Input
                      id="max_participants"
                      type="number"
                      min="1"
                      max="100"
                      value={data.max_participants}
                      onChange={(e) => setData("max_participants", e.target.value)}
                      className={errors.max_participants ? "border-destructive" : ""}
                    />
                    {errors.max_participants && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <X className="h-3 w-3" />
                        {errors.max_participants}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Language</label>
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

                <div className="space-y-2">
                  <label htmlFor="target_audience" className="text-sm font-semibold text-foreground">
                    Target Audience *
                  </label>
                  <Input
                    id="target_audience"
                    value={data.target_audience}
                    onChange={(e) => setData("target_audience", e.target.value)}
                    placeholder="e.g., Adults 50+, Job seekers, Students"
                    className={errors.target_audience ? "border-destructive" : ""}
                  />
                  {errors.target_audience && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <X className="h-3 w-3" />
                      {errors.target_audience}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="community_impact" className="text-sm font-semibold text-foreground">
                    Community Impact
                  </label>
                  <RichTextEditor
                    id="community_impact"
                    label=""
                    value={data.community_impact}
                    onChange={(value) => setData("community_impact", value)}
                    error={errors.community_impact}
                    className="mt-1 w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional: Explain the positive impact this course will have on your community
                  </p>
                  {errors.community_impact && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <X className="h-3 w-3" />
                      {errors.community_impact}
                    </p>
                  )}
                </div>
              </div>

              {/* Schedule */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Schedule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="start_date" className="text-sm font-semibold text-foreground">
                      Start Date *
                    </label>
                    <Input
                      id="start_date"
                      type="date"
                      value={data.start_date}
                      onChange={(e) => setData("start_date", e.target.value)}
                      className={errors.start_date ? "border-destructive" : ""}
                    />
                    {errors.start_date && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <X className="h-3 w-3" />
                        {errors.start_date}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="start_time" className="text-sm font-semibold text-foreground">
                      Start Time *
                    </label>
                    <Input
                      id="start_time"
                      type="time"
                      value={data.start_time}
                      onChange={(e) => setData("start_time", e.target.value)}
                      className={errors.start_time ? "border-destructive" : ""}
                    />
                    {errors.start_time && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <X className="h-3 w-3" />
                        {errors.start_time}
                      </p>
                    )}
                  </div>

                </div>
              </div>

              {/* Course Content */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Course Content</h3>
                <div className="space-y-4">
                  <ArrayInput
                    id="learning_outcomes"
                    label="Learning Outcomes *"
                    values={data.learning_outcomes}
                    onChange={(values) => setData("learning_outcomes", values)}
                    error={errors.learning_outcomes}
                    placeholder="e.g., Understand basic computer operations"
                  />

                  <ArrayInput
                    id="prerequisites"
                    label="Prerequisites"
                    values={data.prerequisites}
                    onChange={(values) => setData("prerequisites", values)}
                    error={errors.prerequisites}
                    placeholder="e.g., Basic reading skills"
                  />

                  <ArrayInput
                    id="materials_needed"
                    label="Materials Needed"
                    values={data.materials_needed}
                    onChange={(values) => setData("materials_needed", values)}
                    error={errors.materials_needed}
                    placeholder="e.g., Notebook and pen"
                  />

                  <ArrayInput
                    id="accessibility_features"
                    label="Accessibility Features"
                    values={data.accessibility_features}
                    onChange={(values) => setData("accessibility_features", values)}
                    error={errors.accessibility_features}
                    placeholder="e.g., Wheelchair accessible, Sign language interpreter"
                  />
                </div>
              </div>

              {/* Course Features */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Course Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between px-6 bg-muted/50 rounded-xl border">
                    <div className="space-y-1">
                      <label htmlFor="certificate_provided" className="text-sm font-semibold text-foreground">
                        Certificate Provided
                      </label>
                      <p className="text-xs text-muted-foreground">Participants receive a completion certificate</p>
                    </div>
                    <Switch
                      id="certificate_provided"
                      checked={data.certificate_provided}
                      onCheckedChange={(checked) => setData("certificate_provided", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between px-6 bg-muted/50 rounded-xl border">
                    <div className="space-y-1">
                      <label htmlFor="volunteer_opportunities" className="text-sm font-semibold text-foreground">
                        Volunteer Opportunities
                      </label>
                      <p className="text-xs text-muted-foreground">Course includes volunteer opportunities</p>
                    </div>
                    <Switch
                      id="volunteer_opportunities"
                      checked={data.volunteer_opportunities}
                      onCheckedChange={(checked) => setData("volunteer_opportunities", checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Current Course Statistics */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                  Current Course Statistics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-muted/30 rounded-xl">
                    <div className="text-2xl font-bold text-primary mb-1">{course.enrolled}</div>
                    <div className="text-sm text-muted-foreground">Students Enrolled</div>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-xl">
                    <div className="text-2xl font-bold text-primary mb-1">{course.max_participants}</div>
                    <div className="text-sm text-muted-foreground">Max Capacity</div>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-xl">
                    <div className="text-2xl font-bold text-primary mb-1">{course.rating}</div>
                    <div className="text-sm text-muted-foreground">Average Rating</div>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-xl">
                    <div className="text-2xl font-bold text-primary mb-1">{course.total_reviews}</div>
                    <div className="text-sm text-muted-foreground">Total Reviews</div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-6 border-t border-border">
                <div className="flex flex-col sm:flex-row gap-4 justify-end">
                  <Link href={route("admin.courses.index")}>
                    <Button type="button" variant="outline" className="w-full sm:w-auto bg-transparent">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={processing} className="w-full sm:w-auto min-w-[160px] cursor-pointer">
                    {processing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-5 w-5" />
                        Update Course
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </AppLayout>
  )
}
