"use client"

import { useState } from "react"
import * as React from "react"
import { Link, useForm, usePage, Head } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle2, FileText, Loader2, Shield } from "lucide-react"
import type { BreadcrumbItem } from "@/types"

interface OrganizationInfo {
  id: number
  name: string
  tax_compliance_status: string | null
  tax_compliance_meta: Record<string, any> | null
  is_compliance_locked: boolean
  registration_status: string | null
}

interface ApplicationSummary {
  id: number
  application_number: string
  status: string
  payment_status: string
  assistance_types: string[]
  amount: number
  submitted_at: string | null
  reviewed_at: string | null
}

interface ExistingApplication extends ApplicationSummary {
  description: string | null
  documents: { name: string; url: string | null }[]
}

interface PageProps {
  organization: OrganizationInfo
  applicationFee: number
  existingApplication: ExistingApplication | null
  applicationHistory: ApplicationSummary[]
  activeApplication: { id: number; status: string; payment_status: string } | null
  contactDefaults: {
    name: string | null
    email: string | null
    phone: string | null
  }
}

const assistanceOptions: { value: string; title: string; description: string }[] = [
  {
    value: "tax_exemption",
    title: "501(c)(3) determination assistance",
    description: "Guidance and preparation to help secure or reinstate your federal tax-exempt status.",
  },
  {
    value: "form_990",
    title: "Annual Form 990 preparation",
    description: "Professional support to get your annual Form 990 filing completed accurately and on time.",
  },
]

const statusLabels: Record<string, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "bg-gray-100 text-gray-700" },
  pending_payment: { label: "Payment Pending", tone: "bg-amber-100 text-amber-700" },
  awaiting_review: { label: "Awaiting Review", tone: "bg-blue-100 text-blue-700" },
  needs_more_info: { label: "Needs Info", tone: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", tone: "bg-emerald-100 text-emerald-700" },
  declined: { label: "Declined", tone: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelled", tone: "bg-gray-100 text-gray-700" },
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount)

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Compliance Application", href: "/dashboard/compliance/apply" },
]

export default function ComplianceApplyPage({
  organization,
  applicationFee,
  existingApplication,
  applicationHistory,
  activeApplication,
  contactDefaults,
}: PageProps) {
  const { flash } = usePage().props as { flash?: Record<string, string> }
  const [documentsPreview, setDocumentsPreview] = useState<File[]>([])
  const [assistanceTypes, setAssistanceTypes] = useState<string[]>([])

  const { data, setData, post, processing, errors, reset, progress } = useForm({
    assistance_types: [] as string[],
    description: "",
    contact_name: contactDefaults.name ?? "",
    contact_email: contactDefaults.email ?? "",
    contact_phone: contactDefaults.phone ?? "",
    documents: [] as File[],
  })

  // Sync local state with form data
  React.useEffect(() => {
    if (Array.isArray(data.assistance_types)) {
      setAssistanceTypes(data.assistance_types)
    }
  }, [data.assistance_types])

  const hasActiveLock = Boolean(
    activeApplication && ["pending_payment", "awaiting_review"].includes(activeApplication.status)
  )

  const complianceStatusLabel = organization.tax_compliance_status
    ? organization.tax_compliance_status.replace(/_/g, " ")
    : "unknown"

  const toggleAssistanceType = (value: string) => {
    const newTypes = assistanceTypes.includes(value)
      ? assistanceTypes.filter((item) => item !== value)
      : [...assistanceTypes, value]
    setAssistanceTypes(newTypes)
    setData("assistance_types", newTypes)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    setDocumentsPreview(files)
    setData("documents", files)
  }

  const submit = () => {
    post(route("compliance.apply.store"), {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => {
        reset("assistance_types", "description", "documents")
        setDocumentsPreview([])
        setAssistanceTypes([])
      },
    })
  }

  const renderStatusBadge = (status?: string | null) => {
    if (!status) {
      return <Badge variant="outline">Unknown</Badge>
    }
    const config = statusLabels[status] ?? { label: status, tone: "bg-gray-100 text-gray-700" }
    return <Badge className={cn("capitalize", config.tone)}>{config.label}</Badge>
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Compliance Application" />
      <div className="w-full p-4 md:p-6 lg:p-8">
        <div className="w-full flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Compliance status
            </CardTitle>
            <CardDescription>
              Keep your nonprofit in good standing by completing the IRS-related services your organization needs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Organization</p>
              <p className="text-lg font-semibold">{organization.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">Compliance status</span>
              {renderStatusBadge(organization.tax_compliance_status)}
            </div>
            {organization.is_compliance_locked && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Access limited</AlertTitle>
                <AlertDescription>
                  Your dashboard features are locked until a compliance application is approved. Submit the form below to
                  get expert help.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Application fee</span>
            <span className="font-semibold text-foreground">{formatCurrency(applicationFee)}</span>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest application</CardTitle>
            <CardDescription>Track where things stand and what happens next.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {existingApplication ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Application #</span>
                  <span className="font-medium">{existingApplication.application_number}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {renderStatusBadge(existingApplication.status)}
                </div>
                <div className="flex flex-wrap gap-2">
                  {existingApplication.assistance_types?.map((type) => (
                    <Badge key={type} variant="secondary" className="capitalize">
                      {type.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
                {existingApplication.documents && existingApplication.documents.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Submitted documents</p>
                    <ul className="space-y-1 text-sm">
                      {existingApplication.documents.map((doc, index) => (
                        <li key={`${doc.name}-${index}`}>
                          {doc.url ? (
                            <Link href={doc.url} className="text-primary hover:underline" target="_blank">
                              {doc.name}
                            </Link>
                          ) : (
                            <span>{doc.name}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No applications submitted yet. Start a new request below to begin the process.
              </p>
            )}
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            We’ll send status updates to {contactDefaults.email ?? "your primary email"}.
          </CardFooter>
        </Card>
      </div>

      {flash?.success && (
        <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-700 dark:text-emerald-400">{flash.success}</AlertDescription>
        </Alert>
      )}
      {flash?.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{flash.error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Request assistance</CardTitle>
          <CardDescription>
            Select the services you need, upload any supporting documents, and pay the application fee to start your review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {hasActiveLock && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Application in progress</AlertTitle>
              <AlertDescription>
                You already have an application awaiting payment or review. We’ll notify you once it moves forward.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <Label className="text-sm font-medium">What do you need help with? *</Label>
            <div className="grid gap-3 md:grid-cols-2">
              {assistanceOptions.map((option) => {
                const checked = assistanceTypes.includes(option.value)
                return (
                  <div
                    key={option.value}
                    className={cn(
                      "rounded-xl border p-4 text-left transition cursor-pointer flex items-start gap-3",
                      checked
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:border-primary/50",
                      (hasActiveLock || processing) && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => {
                      if (!hasActiveLock && !processing) {
                        toggleAssistanceType(option.value)
                      }
                    }}
                  >
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={!!checked} 
                        onCheckedChange={(isChecked) => {
                          if (!hasActiveLock && !processing) {
                            toggleAssistanceType(option.value)
                          }
                        }}
                        disabled={hasActiveLock || processing}
                      />
                    </div>
                    <div className="space-y-1 flex-1">
                      <p className="font-semibold capitalize">{option.title}</p>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            {errors.assistance_types && <p className="text-sm text-red-600">{errors.assistance_types}</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact_name">Primary contact name</Label>
              <Input
                id="contact_name"
                value={data.contact_name}
                onChange={(e) => setData("contact_name", e.target.value)}
                placeholder="Who should we work with?"
                disabled={hasActiveLock || processing}
              />
              {errors.contact_name && <p className="text-sm text-red-600">{errors.contact_name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email">Primary email *</Label>
              <Input
                id="contact_email"
                type="email"
                value={data.contact_email}
                onChange={(e) => setData("contact_email", e.target.value)}
                placeholder="name@nonprofit.org"
                disabled={hasActiveLock || processing}
              />
              {errors.contact_email && <p className="text-sm text-red-600">{errors.contact_email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Phone</Label>
              <Input
                id="contact_phone"
                value={data.contact_phone}
                onChange={(e) => setData("contact_phone", e.target.value)}
                placeholder="(555) 123-4567"
                disabled={hasActiveLock || processing}
              />
              {errors.contact_phone && <p className="text-sm text-red-600">{errors.contact_phone}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Tell us what you need *</Label>
            <Textarea
              id="description"
              value={data.description}
              onChange={(e) => setData("description", e.target.value)}
              placeholder="Share context, deadlines, or compliance issues we should know about."
              rows={5}
              disabled={hasActiveLock || processing}
            />
            {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="documents">Supporting documents (optional)</Label>
            <Input
              id="documents"
              type="file"
              multiple
              onChange={handleFileChange}
              disabled={hasActiveLock || processing}
            />
            <p className="text-xs text-muted-foreground">Upload IRS letters, Form 990 drafts, or other relevant files (PDF, DOC, JPG up to 10MB each).</p>
            {documentsPreview.length > 0 && (
              <ul className="text-sm text-muted-foreground">
                {documentsPreview.map((file) => (
                  <li key={file.name} className="flex items-center gap-2">
                    <FileText className="h-4 w-4" /> {file.name}
                  </li>
                ))}
              </ul>
            )}
            {errors.documents && <p className="text-sm text-red-600">{errors.documents}</p>}
            {errors["documents.0"] && <p className="text-sm text-red-600">{errors["documents.0"]}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-muted-foreground">
            Your card will be charged <span className="font-semibold text-foreground">{formatCurrency(applicationFee)}</span> once you click submit and complete the secure checkout.
          </div>
          <Button
            size="lg"
            onClick={submit}
            disabled={processing || hasActiveLock}
            className="w-full md:w-auto"
          >
            {processing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </span>
            ) : (
              "Submit & pay"
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Application history</CardTitle>
          <CardDescription>Recent submissions and their outcomes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {applicationHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No applications yet.</p>
          ) : (
            <div className="space-y-4">
              {applicationHistory.map((entry) => (
                <div key={entry.id} className="rounded-lg border bg-muted/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{entry.application_number}</p>
                      <p className="text-xs text-muted-foreground">
                        Submitted {entry.submitted_at ? new Date(entry.submitted_at).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {renderStatusBadge(entry.status)}
                      <Badge variant="outline">{formatCurrency(entry.amount)}</Badge>
                    </div>
                  </div>
                  {entry.assistance_types?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {entry.assistance_types.map((type) => (
                        <Badge key={`${entry.id}-${type}`} variant="secondary" className="capitalize">
                          {type.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      </div>
    </AppLayout>
  )
}
