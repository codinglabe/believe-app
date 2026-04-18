"use client"
import type React from "react"
import { Head, useForm, usePage, Link } from "@inertiajs/react"
import { Save, Heart, Calendar, BookOpen, Settings, AlertCircle, CheckCircle, ChevronRight } from "lucide-react"
import { Button } from "@/components/admin/ui/button"
import { Input } from "@/components/admin/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/admin/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import RichTextEditor from "@/components/admin/rich-text-editor"
import { ImageUpload } from "@/components/admin/ImageUpload"
import type { User } from "@/types"
import { toast } from "sonner"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { useState, useEffect, useMemo } from "react"
import BiuCourseTaxIntake from "@/components/biu-course-tax-intake"
import {
  OrganizationPrimaryActionCategoriesField,
  type PrimaryActionCategoryOption,
} from "@/components/organization-primary-action-categories-field"
import { connectionHubTypeLabel, isEventsHubType, type ConnectionHubType } from "@/lib/connection-hub-type"

interface EventType {
  id: number
  name: string
  category: string
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

interface Topic {
  id: number
  name: string
}

interface Course {
  id: number
  type: ConnectionHubType
  topic_id: number | null
  event_type_id: number | null
  primary_action_category_ids?: number[]
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
  meeting_link?: string | null
  course_delivery_type?: "online" | "live" | "hybrid" | null
  has_physical_materials?: boolean | null
  pricing_structure?: "bundled" | "separate" | null
  requires_shipping?: boolean | null
  tax_ack_outside_ca?: boolean | null
  tax_ack_auto_calculate?: boolean | null
  tax_classification?: string | null
  course_content_type?: string | null
  digital_course_fee?: number | null
  materials_fee?: number | null
  shipping_fee_amount?: number | null
}

interface AdminCoursesEditProps {
  course: Course
  eventTypes: EventType[]
  organizationPrimaryActionCategories: PrimaryActionCategoryOption[]
  causesCatalogSource?: "organization" | "supporter"
  organizationName?: string | null
  sellerNameLabel?: string
}

export default function AdminCoursesEdit() {
  const {
    course,
    eventTypes,
    organizationPrimaryActionCategories,
    causesCatalogSource,
    organizationName,
    sellerNameLabel,
  } = usePage<AdminCoursesEditProps>().props

  const groupedEventTypes = useMemo(() => {
    return eventTypes.reduce(
      (acc, type) => {
        const category = type.category || "Other"
        if (!acc[category]) acc[category] = []
        acc[category].push(type)
        return acc
      },
      {} as Record<string, EventType[]>,
    )
  }, [eventTypes])
  const { auth } = usePage().props as { auth: { user: User } }

  const [currentTab, setCurrentTab] = useState("basics")
  const [tabErrors, setTabErrors] = useState<Record<string, boolean>>({})
  const [tabCompletion, setTabCompletion] = useState<Record<string, boolean>>({})
  const [canSwitchTab, setCanSwitchTab] = useState<Record<string, boolean>>({})

  const { data, setData, post, processing, errors, reset } = useForm({
    // Basic Information (pre-populated with existing data)
    type: course.type || "companion",
    name: course.name,
    description: course.description,
    event_type_id: course.event_type_id?.toString() || "",
    primary_action_category_ids: (course.primary_action_category_ids ?? []).map((id) => String(id)),

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
    course_delivery_type:
      (course.course_delivery_type as "online" | "live" | "hybrid" | undefined) || "online",
    course_content_type:
      (course.course_content_type as
        | "written_material"
        | "video_streamed"
        | "video_streamed_downloadable"
        | "general"
        | undefined) || "general",
    has_physical_materials: Boolean(course.has_physical_materials),
    pricing_structure: (course.pricing_structure as "bundled" | "separate" | undefined) || "",
    requires_shipping: Boolean(course.requires_shipping),
    digital_course_fee: course.digital_course_fee != null ? String(course.digital_course_fee) : "",
    materials_fee: course.materials_fee != null ? String(course.materials_fee) : "",
    shipping_fee_amount: course.shipping_fee_amount != null ? String(course.shipping_fee_amount) : "",
    tax_ack_outside_ca: Boolean(course.tax_ack_outside_ca),
    tax_ack_auto_calculate: Boolean(course.tax_ack_auto_calculate),
  })

  const validateTab = (tab: string): boolean => {
    switch (tab) {
      case "basics": {
        const feeSplit =
          data.pricing_type === "paid" && data.has_physical_materials && data.pricing_structure === "separate"
        const hasPricing =
          !!data.pricing_type &&
          (data.pricing_type === "free" ||
            (data.pricing_type === "paid" &&
              (feeSplit ? !!(data.digital_course_fee && data.materials_fee) : !!data.course_fee)))
        const basicsOk = !!(data.type && data.name && data.description && data.event_type_id && hasPricing)
        if (!basicsOk) {
          return false
        }
        if (data.pricing_type !== "paid") {
          return true
        }
        if (!data.course_delivery_type) {
          return false
        }
        if (data.course_delivery_type === "online" && !data.course_content_type) {
          return false
        }
        if (data.has_physical_materials && !data.pricing_structure) {
          return false
        }
        if (!data.tax_ack_outside_ca || !data.tax_ack_auto_calculate) {
          return false
        }
        return true
      }
      case "schedule":
        return !!(
          data.meeting_link &&
          data.format &&
          data.start_date &&
          data.start_time &&
          data.duration &&
          data.max_participants
        )
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
      settings: !validateTab("settings"),
    }
    setTabErrors(newTabErrors)
  }, [data])

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const errorFields = Object.keys(errors)
      if (
        errorFields.some((field) =>
          [
            "name",
            "description",
            "type",
            "event_type_id",
            "primary_action_category_ids",
            "pricing_type",
            "course_fee",
            "course_delivery_type",
            "has_physical_materials",
            "pricing_structure",
            "requires_shipping",
            "tax_ack_outside_ca",
            "tax_ack_auto_calculate",
          ].includes(field),
        )
      ) {
        setCurrentTab("basics")
      } else if (
        errorFields.some((field) =>
          ["meeting_link", "format", "start_date", "start_time", "duration", "max_participants"].includes(field),
        )
      ) {
        setCurrentTab("schedule")
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

  const handleSave = () => {
    if (!validateTab("basics")) {
      setCurrentTab("basics")
      toast.error("Please complete all required fields in the Basics tab.")
      return
    }
    if (!validateTab("schedule")) {
      setCurrentTab("schedule")
      toast.error("Please complete all required fields in the Schedule tab.")
      return
    }
    post(route("profile.course.update", course.slug), {
      forceFormData: true,
      onSuccess: () => {
        toast.success("Listing updated successfully!", {
          description: "Your Connection Hub listing has been updated.",
        })
      },
      onError: (err) => {
        console.error("Form submission error:", err)
        toast.error("Failed to update listing.", {
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
    <ProfileLayout title="Edit listing" description={course.name}>
      <Head title={`Edit listing · ${course.name}`} />

      <div className="space-y-6 m-6">
        <Card>
          <CardHeader>
            <CardTitle>Listing statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{course.enrolled}</div>
                <div className="text-sm text-muted-foreground">Enrolled</div>
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

        <form
          onSubmit={(e) => {
            e.preventDefault()
          }}
        >
          <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabTriggerWithStatus value="basics">
                <BookOpen className="h-4 w-4" />
                Basics
              </TabTriggerWithStatus>
              <TabTriggerWithStatus value="schedule">
                <Calendar className="h-4 w-4" />
                Schedule
              </TabTriggerWithStatus>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
                {tabErrors.settings && <AlertCircle className="h-3 w-3 text-destructive" />}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basics">
              <Card>
                <CardHeader>
                  <CardTitle>{connectionHubTypeLabel(data.type)} basics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="type" className="text-sm font-medium">
                        Type *
                      </label>
                      <Select value={data.type} onValueChange={(value) => setData("type", value as ConnectionHubType)}>
                        <SelectTrigger className={errors.type ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="companion">Companion</SelectItem>
                          <SelectItem value="learning">Learning</SelectItem>
                          <SelectItem value="events">Events</SelectItem>
                          <SelectItem value="earning">Earning</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.type && <p className="text-sm text-destructive">{errors.type}</p>}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-medium">
                        Name *
                      </label>
                      <Input
                        id="name"
                        value={data.name}
                        onChange={(e) => setData("name", e.target.value)}
                        placeholder={
                          isEventsHubType(data.type)
                            ? "e.g., Community Health Fair"
                            : "e.g., Digital Literacy for Seniors"
                        }
                        className={errors.name ? "border-destructive" : ""}
                      />
                      {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="event_type_id" className="text-sm font-medium">
                        Topic *
                      </label>
                      <Select
                        value={data.event_type_id || ""}
                        onValueChange={(value) => setData("event_type_id", value)}
                      >
                        <SelectTrigger className={errors.event_type_id ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select topic" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(groupedEventTypes).map(([category, types]) => (
                            <div key={category}>
                              <div className="px-2 py-1.5 text-sm font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800">
                                {category}
                              </div>
                              {types.map((t) => (
                                <SelectItem key={t.id} value={t.id.toString()}>
                                  {t.name}
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.event_type_id && (
                        <p className="text-sm text-destructive">{errors.event_type_id}</p>
                      )}
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
                        {data.pricing_type === "paid" &&
                          !(data.has_physical_materials && data.pricing_structure === "separate") && (
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={data.course_fee}
                              onChange={(e) => setData("course_fee", e.target.value)}
                              placeholder="Price ($)"
                              className="flex-1"
                            />
                          )}
                        {data.pricing_type === "paid" &&
                          data.has_physical_materials &&
                          data.pricing_structure === "separate" && (
                            <p className="text-sm text-muted-foreground flex-1">
                              Set digital, materials, and optional shipping below — total updates the price.
                            </p>
                          )}
                      </div>
                    </div>
                  </div>

                  <BiuCourseTaxIntake
                    show={data.pricing_type === "paid"}
                    data={{
                      course_delivery_type: data.course_delivery_type,
                      course_content_type: data.course_content_type,
                      has_physical_materials: data.has_physical_materials,
                      pricing_structure: data.pricing_structure,
                      requires_shipping: data.requires_shipping,
                      digital_course_fee: data.digital_course_fee,
                      materials_fee: data.materials_fee,
                      shipping_fee_amount: data.shipping_fee_amount,
                      tax_ack_outside_ca: data.tax_ack_outside_ca,
                      tax_ack_auto_calculate: data.tax_ack_auto_calculate,
                    }}
                    setData={setData}
                    errors={errors}
                    organizationName={organizationName}
                    sellerNameLabel={sellerNameLabel}
                    hubType={data.type}
                    pricingType={data.pricing_type}
                  />

                  <OrganizationPrimaryActionCategoriesField
                    categories={organizationPrimaryActionCategories}
                    causesCatalogSource={causesCatalogSource ?? "organization"}
                    selectedIds={data.primary_action_category_ids}
                    onSelectionChange={(ids) => setData("primary_action_category_ids", ids)}
                    error={
                      typeof errors.primary_action_category_ids === "string"
                        ? errors.primary_action_category_ids
                        : undefined
                    }
                  />

                  <div className="space-y-2">
                    <label htmlFor="description" className="text-sm font-medium">
                      Description *
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
                    <label className="text-sm font-medium">Listing image</label>
                    <ImageUpload label="" value={null} onChange={(file) => setData("image", file)} />
                  </div>

                  <div className="flex justify-end border-t pt-6 mt-6">
                    <Button
                      type="button"
                      className="min-w-[160px]"
                      onClick={() => {
                        if (validateTab("basics")) {
                          setCurrentTab("schedule")
                        } else {
                          toast.error("Please complete all required fields in the Basics tab before continuing.")
                        }
                      }}
                    >
                      Continue
                      <ChevronRight className="ml-2 h-4 w-4" aria-hidden />
                    </Button>
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
                      Provide the meeting link where participants will join
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

                  <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-6 mt-6">
                    <Button type="button" variant="outline" onClick={() => setCurrentTab("basics")}>
                      Back
                    </Button>
                    <Button
                      type="button"
                      className="min-w-[160px] sm:ml-auto"
                      onClick={() => {
                        if (validateTab("schedule")) {
                          setCurrentTab("settings")
                        } else {
                          toast.error("Please complete all required fields in the Schedule tab before continuing.")
                        }
                      }}
                    >
                      Continue
                      <ChevronRight className="ml-2 h-4 w-4" aria-hidden />
                    </Button>
                  </div>
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
                          Allow participants to volunteer for future listings
                        </p>
                      </div>
                      <Switch
                        id="volunteer_opportunities"
                        checked={data.volunteer_opportunities}
                        onCheckedChange={(checked) => setData("volunteer_opportunities", checked)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-6 mt-6">
                    <Button type="button" variant="outline" onClick={() => setCurrentTab("schedule")}>
                      Back
                    </Button>
                    <div className="flex flex-wrap justify-end gap-4">
                      <Link href={route("profile.course.index")}>
                        <Button type="button" variant="outline">
                          Cancel
                        </Button>
                      </Link>
                      <Button type="button" disabled={processing} onClick={handleSave} className="min-w-[140px]">
                        {processing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                            Updating...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Update listing
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </div>
    </ProfileLayout>
  )
}
