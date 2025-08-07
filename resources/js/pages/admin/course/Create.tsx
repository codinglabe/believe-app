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

  const { data, setData, post, processing, errors, reset } = useForm({
    // Basic Information
    name: "",
    description: "",
    topic_id: topics.length > 0 ? topics[0].id.toString() : "",

    // Pricing (Simplified)
    pricing_type: "free", // free, paid
    course_fee: "",

    // Schedule & Logistics
    start_date: "",
    start_time: "",
    end_date: "",
    duration: "",
    format: "online", // online, in_person, hybrid
    max_participants: "",
    language: "English",

    // Course Content
    learning_outcomes: [] as string[],
    prerequisites: [] as string[],
    materials_needed: [] as string[],

    // Nonprofit Specific
    target_audience: "",
    community_impact: "",
    accessibility_features: [] as string[],
    volunteer_opportunities: false,
    certificate_provided: false,

    // Media
    image: null as File | null,
  })

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
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Create Community Course</h1>
              <p className="text-muted-foreground">Share knowledge and empower your community</p>
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
                      label=""
                      value={data.description}
                      onChange={(value) => setData("description", value)}
                      error={errors.description}
                      className="mt-1 w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Describe what participants will learn and how it benefits the community
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="topic_id" className="text-sm font-semibold text-foreground">
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
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing for Nonprofits */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                  Course Access & Pricing
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Pricing Model *</label>
                    <Select value={data.pricing_type} onValueChange={(value) => setData("pricing_type", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">🆓 Free</SelectItem>
                        <SelectItem value="paid">💰 Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {data.pricing_type === "paid" && (
                    <div className="space-y-2">
                      <label htmlFor="course_fee" className="text-sm font-semibold text-foreground">
                        Course Fee ($) *
                      </label>
                      <Input
                        id="course_fee"
                        type="number"
                        min="0"
                        step="5"
                        value={data.course_fee}
                        onChange={(e) => setData("course_fee", e.target.value)}
                        placeholder="e.g., 50"
                      />
                      <p className="text-xs text-muted-foreground">Set an affordable price for your community course</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Schedule & Format */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Schedule & Format</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="format" className="text-sm font-semibold text-foreground">
                      Course Format *
                    </label>
                    <Select value={data.format} onValueChange={(value) => setData("format", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">💻 Online (Zoom/Virtual)</SelectItem>
                        <SelectItem value="in_person">🏢 In-Person</SelectItem>
                        <SelectItem value="hybrid">🔄 Hybrid (Online + In-Person)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="max_participants" className="text-sm font-semibold text-foreground">
                      Maximum Participants *
                    </label>
                    <Input
                      id="max_participants"
                      type="number"
                      min="1"
                      max="50"
                      value={data.max_participants}
                      onChange={(e) => setData("max_participants", e.target.value)}
                      placeholder="e.g., 20"
                    />
                  </div>

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
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="duration" className="text-sm font-semibold text-foreground">
                      Duration *
                    </label>
                    <Select value={data.duration} onValueChange={(value) => setData("duration", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1_session">Single Session (2-3 hours)</SelectItem>
                        <SelectItem value="1_week">1 Week (Multiple sessions)</SelectItem>
                        <SelectItem value="2_weeks">2 Weeks</SelectItem>
                        <SelectItem value="1_month">1 Month</SelectItem>
                        <SelectItem value="6_weeks">6 Weeks</SelectItem>
                        <SelectItem value="3_months">3 Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="language" className="text-sm font-semibold text-foreground">
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
              </div>

              {/* Course Content */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Course Content</h3>
                <div className="space-y-4">
                  <ArrayInput
                    id="learning_outcomes"
                    label="What Will Participants Learn? *"
                    values={data.learning_outcomes}
                    onChange={(values) => setData("learning_outcomes", values)}
                    error={errors.learning_outcomes}
                    placeholder="e.g., How to use email safely"
                  />

                  <ArrayInput
                    id="prerequisites"
                    label="Prerequisites (if any)"
                    values={data.prerequisites}
                    onChange={(values) => setData("prerequisites", values)}
                    error={errors.prerequisites}
                    placeholder="e.g., Basic computer skills"
                  />

                  <ArrayInput
                    id="materials_needed"
                    label="Materials Needed"
                    values={data.materials_needed}
                    onChange={(values) => setData("materials_needed", values)}
                    error={errors.materials_needed}
                    placeholder="e.g., Laptop or tablet, notebook"
                  />

                  <ArrayInput
                    id="accessibility_features"
                    label="Accessibility Features"
                    values={data.accessibility_features}
                    onChange={(values) => setData("accessibility_features", values)}
                    error={errors.accessibility_features}
                    placeholder="e.g., Sign language interpreter, Large print materials"
                  />
                </div>
              </div>

              {/* Community Impact */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Community Impact</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="community_impact" className="text-sm font-semibold text-foreground">
                      How does this course benefit the community?
                    </label>
                    <RichTextEditor
                      label=""
                      value={data.community_impact}
                      onChange={(value) => setData("community_impact", value)}
                      error={errors.community_impact}
                      className="mt-1 w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Explain the positive impact this course will have on participants and the broader community
                    </p>
                  </div>
                </div>
              </div>

              {/* Course Image */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Course Image</h3>
                <ImageUpload label="Course Image (Optional)" value={null} onChange={(file) => setData("image", file)} />
                <p className="text-xs text-muted-foreground">Add a welcoming image that represents your course topic</p>
              </div>

              {/* Additional Options */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                  Additional Options
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center justify-between px-6 bg-muted/50 rounded-xl border">
                    <div className="space-y-1">
                      <label htmlFor="certificate_provided" className="text-sm font-semibold text-foreground">
                        Provide Certificate of Completion
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Participants receive a certificate when they complete the course
                      </p>
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
                        Volunteer Opportunities Available
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Course participants can volunteer to help with future courses
                      </p>
                    </div>
                    <Switch
                      id="volunteer_opportunities"
                      checked={data.volunteer_opportunities}
                      onCheckedChange={(checked) => setData("volunteer_opportunities", checked)}
                    />
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
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-5 w-5" />
                        Create Community Course
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
