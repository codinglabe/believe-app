"use client"
import type React from "react"
import { Head, useForm, usePage, Link } from "@inertiajs/react"
import { ArrowLeft, Save, Heart, Calendar, BookOpen, Settings, AlertCircle } from "lucide-react"
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
import AppLayout from "@/layouts/app-layout"
import { useState, useEffect, useMemo } from "react"
import {
  OrganizationPrimaryActionCategoriesField,
  type PrimaryActionCategoryOption,
} from "@/components/organization-primary-action-categories-field"
import BiuCourseTaxIntake from "@/components/biu-course-tax-intake"
import { connectionHubTypeLabel, isEventsHubType, type ConnectionHubType } from "@/lib/connection-hub-type"
import { SESSION_DURATION_MINUTES_OPTIONS, sessionDurationLabel } from "@/lib/session-duration-options"

interface EventType {
  id: number
  name: string
  category: string
}

interface AdminCoursesCreateProps {
  eventTypes: EventType[]
  organizationPrimaryActionCategories: PrimaryActionCategoryOption[]
  organizationName?: string | null
  sellerNameLabel?: string
}

export default function NonprofitCoursesCreate() {
  const { eventTypes, organizationPrimaryActionCategories, organizationName, sellerNameLabel } =
    usePage<AdminCoursesCreateProps>().props
  const { auth } = usePage().props as { auth: { user: User } }

  const [currentTab, setCurrentTab] = useState("basics")
  const [tabErrors, setTabErrors] = useState<Record<string, boolean>>({})

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
    type: "companion" as ConnectionHubType,
    name: "",
    description: "",
    event_type_id: eventTypes.length > 0 ? eventTypes[0].id.toString() : "",
    target_audience: "",
    meeting_link: "",
    pricing_type: "free",
    course_fee: "",
    start_date: "",
    start_time: "",
    end_date: "",
    session_duration_minutes: "60",
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
    primary_action_category_ids: [] as string[],
    course_delivery_type: "online" as "online" | "live" | "hybrid" | "",
    course_content_type: "general" as "written_material" | "video_streamed" | "video_streamed_downloadable" | "general" | "",
    has_physical_materials: false,
    pricing_structure: "" as "bundled" | "separate" | "",
    requires_shipping: false,
    digital_course_fee: "",
    materials_fee: "",
    shipping_fee_amount: "",
    tax_ack_outside_ca: false,
    tax_ack_auto_calculate: false,
  })

  const formattedProgramLengthPreview = useMemo(() => {
    if (!data.start_date || !data.end_date) return null
    const start = new Date(`${data.start_date}T12:00:00`)
    const end = new Date(`${data.end_date}T12:00:00`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null
    const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1
    const weeks = days / 7
    if (weeks <= 1) return "About 1 week"
    const rounded = Math.round(weeks * 10) / 10
    return `${rounded} weeks`
  }, [data.start_date, data.end_date])

  const validateTab = (tab: string): boolean => {
    switch (tab) {
      case "basics": {
        const hasType = !!data.type
        const hasTopicOrEventType = !!data.event_type_id
        const feeSplit =
          data.pricing_type === "paid" &&
          data.has_physical_materials &&
          data.pricing_structure === "separate"
        const hasPricing =
          !!data.pricing_type &&
          (data.pricing_type === "free" ||
            (data.pricing_type === "paid" &&
              (feeSplit
                ? !!(data.digital_course_fee && data.materials_fee)
                : !!data.course_fee)))
        const basicsOk = !!(
          data.name &&
          data.description &&
          hasType &&
          hasTopicOrEventType &&
          data.target_audience &&
          hasPricing
        )
        const needsBiuTax = data.pricing_type === "paid"
        if (!basicsOk) {
          return false
        }
        if (!needsBiuTax) {
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
          data.session_duration_minutes &&
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
            "event_type_id",
            "type",
            "target_audience",
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
          ["meeting_link", "format", "start_date", "start_time", "session_duration_minutes", "max_participants"].includes(
            field,
          ),
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

  const isFormValid = () => validateTab("basics") && validateTab("schedule")

  const tabOrder = ["basics", "schedule", "settings"] as const

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate all required tabs before submission
    if (!validateTab("basics")) {
      setCurrentTab("basics")
      toast.error("Please complete all required fields in the Basics tab before submitting.")
      return
    }
    
    if (!validateTab("schedule")) {
      setCurrentTab("schedule")
      toast.error("Please complete all required fields in the Schedule tab before submitting.")
      return
    }

    post(route("admin.courses.store"), {
      forceFormData: true,
      onSuccess: () => {
        reset()
        toast.success(`${connectionHubTypeLabel(data.type)} listing created successfully!`, {
          description: `Your ${connectionHubTypeLabel(data.type)} listing is now available.`,
        })
      },
      onError: (err) => {
        console.error("Form submission error:", err)
        toast.error(`Failed to create ${connectionHubTypeLabel(data.type)} listing.`, {
          description: "Please check the form for errors and try again.",
        })
      },
    })
  }

  return (
    <AppLayout>
      <Head title={`Create ${connectionHubTypeLabel(data.type)} - Connection Hub`} />

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
            <h1 className="text-2xl font-bold">Create {connectionHubTypeLabel(data.type)}</h1>
            <p className="text-sm text-muted-foreground">
              {isEventsHubType(data.type)
                ? "Create an event for your community"
                : "Share knowledge and empower your community"}
            </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
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
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
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
                      <Select value={data.type} onValueChange={(value) => {
                        setData("type", value as ConnectionHubType)
                      }}>
                        <SelectTrigger className={errors.type ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="companion">Companion</SelectItem>
                          <SelectItem value="learning">Learning</SelectItem>
                          <SelectItem value="events">Events</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.type && <p className="text-sm text-destructive">{errors.type}</p>}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-medium">
                        {connectionHubTypeLabel(data.type)} name *
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
                      <Select value={data.event_type_id || ""} onValueChange={(value) => setData("event_type_id", value)}>
                        <SelectTrigger className={errors.event_type_id ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select topic" />
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
                              Set digital, materials, and optional shipping in the BIU section — total updates the price.
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
                    <label className="text-sm font-medium">Image</label>
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
                      Provide the meeting link where participants will join this {connectionHubTypeLabel(data.type)} listing
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
                        Optional. When set with a start date, program length is calculated for display (weeks).
                      </p>
                      {formattedProgramLengthPreview ? (
                        <p className="text-xs font-medium text-purple-700 dark:text-purple-300">
                          Program length: ~{formattedProgramLengthPreview}
                        </p>
                      ) : null}
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
                      <label htmlFor="session_duration_minutes" className="text-sm font-medium">
                        Session duration *
                      </label>
                      <Select
                        value={data.session_duration_minutes}
                        onValueChange={(value) => setData("session_duration_minutes", value)}
                      >
                        <SelectTrigger id="session_duration_minutes" className={errors.session_duration_minutes ? "border-destructive" : ""}>
                          <SelectValue placeholder="Minutes per session" />
                        </SelectTrigger>
                        <SelectContent>
                          {SESSION_DURATION_MINUTES_OPTIONS.map((m) => (
                            <SelectItem key={m} value={String(m)}>
                              {sessionDurationLabel(m)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.session_duration_minutes && (
                        <p className="text-sm text-destructive">{errors.session_duration_minutes}</p>
                      )}
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
            <Button 
              type={currentTab === "settings" ? "submit" : "button"} 
              disabled={processing || (currentTab === "settings" && !isFormValid()) || (currentTab !== "settings" && !validateTab(currentTab))} 
              onClick={currentTab !== "settings" ? () => {
                if (validateTab(currentTab)) {
                  const currentIndex = tabOrder.indexOf(currentTab as (typeof tabOrder)[number])
                  if (currentIndex >= 0 && currentIndex < tabOrder.length - 1) {
                    setCurrentTab(tabOrder[currentIndex + 1])
                  }
                } else {
                  toast.error("Please complete all required fields in the current tab before proceeding.")
                }
              } : undefined}
              className="min-w-[140px]"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  {currentTab === "settings" ? `Creating ${connectionHubTypeLabel(data.type)}...` : "Processing..."}
                </>
              ) : currentTab === "settings" ? (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Create {connectionHubTypeLabel(data.type)}
                </>
              ) : (
                <>
                  Continue
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
