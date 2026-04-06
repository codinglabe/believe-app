"use client"

import { useState, useEffect } from "react"
import { useForm, usePage } from "@inertiajs/react"
import { router } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle2, FileText, Loader2, Building2, ChevronLeft, ChevronRight, CheckCircle, Award } from "lucide-react"

interface OrganizationInfo {
  id: number
  name: string
  ein: string
  street: string
  city: string
  state: string
  zip: string
  website: string | null
  email: string
  phone: string
  mission: string
  description: string
}

interface PageProps {
  organization: OrganizationInfo
  applicationFee: number
  existingApplication: {
    id: number
    application_number: string
    status: string
    payment_status: string
    submitted_at: string | null
    amount: number
    legal_name?: string
    mailing_address?: string
    physical_address?: string
    ein?: string
    date_incorporated?: string
    state_of_incorporation?: string
    organizational_structure?: string
    contact_phone?: string
    contact_email?: string
    website?: string
    mission_statement?: string
    activities?: Record<string, unknown>[]
    revenue_sources?: unknown[]
    budget_per_program?: unknown[]
    officers_directors?: Record<string, unknown>[]
    related_organizations?: Record<string, unknown>[]
    political_activities_yes_no?: string
    political_activities_desc?: string
    foreign_activities_yes_no?: string
    foreign_activities_desc?: string
    compensation_arrangements?: Record<string, unknown>[]
    related_party_agreements?: Record<string, unknown>[]
    grants?: Record<string, unknown>[]
    fundraising_activities?: Record<string, unknown>[]
    major_contributors?: unknown[]
    rejected_documents?: Record<string, any>
  } | null
  activeApplication: { id: number; status: string; payment_status: string } | null
}

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

const steps = [
  { number: 1, title: "Identification", description: "Basic organization information" },
  { number: 2, title: "Structure & Provisions", description: "Organizational structure and documents" },
  { number: 3, title: "Activities", description: "Mission and activities description" },
  { number: 4, title: "Financial Data", description: "Financial information" },
  { number: 5, title: "Charity Status", description: "Public charity classification" },
  { number: 6, title: "Documents & Review", description: "Upload documents and submit" },
]

export default function Form1023ApplyPage({
  organization,
  applicationFee,
  existingApplication,
  activeApplication,
}: PageProps) {
  const { flash } = usePage().props as { flash?: Record<string, string> }
  const rejectedDocuments = existingApplication?.rejected_documents || {}

  // Helper function to check if a document field is rejected
  const isDocumentRejected = (fieldName: string, fileIndex: number | null = null): { rejected: boolean; reason?: string } => {
    const key = fileIndex !== null ? `${fieldName}[${fileIndex}]` : fieldName
    const rejection = rejectedDocuments[key]
    if (rejection) {
      return { rejected: true, reason: rejection.reason }
    }
    return { rejected: false }
  }

  // Helper function to render rejection alert
  const renderRejectionAlert = (fieldName: string, fileIndex: number | null = null) => {
    const { rejected, reason } = isDocumentRejected(fieldName, fileIndex)
    if (!rejected) return null

    return (
      <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 mb-3">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-800 dark:text-red-200">Document Rejected</AlertTitle>
        <AlertDescription className="text-red-700 dark:text-red-300">
          This document has been rejected and needs to be re-uploaded.
          {reason && (
            <div className="mt-2">
              <p className="font-semibold">Reason:</p>
              <p className="mt-1">{reason}</p>
            </div>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  const [currentStep, setCurrentStep] = useState(1)
  const [organizingDocsPreview, setOrganizingDocsPreview] = useState<File[]>([])
  const [financialDocsPreview, setFinancialDocsPreview] = useState<File[]>([])
  const [bylawsPreview, setBylawsPreview] = useState<File[]>([])
  const [conflictPolicyPreview, setConflictPolicyPreview] = useState<File | null>(null)
  const [orgChartPreview, setOrgChartPreview] = useState<File | null>(null)
  const [priorYearTaxPreview, setPriorYearTaxPreview] = useState<File[]>([])
  const [ss4Preview, setSs4Preview] = useState<File | null>(null)
  const [boardMinutesPreview, setBoardMinutesPreview] = useState<File | null>(null)
  const [whistleblowerPreview, setWhistleblowerPreview] = useState<File | null>(null)
  const [fundraisingMaterialsPreview, setFundraisingMaterialsPreview] = useState<File[]>([])
  
  // Dynamic arrays for officers/directors, major contributors, revenue sources, budget per program, activities, related organizations, compensation, agreements, fundraising activities, and grants
  const [officersDirectors, setOfficersDirectors] = useState<Record<string, unknown>[]>([])
  const [majorContributors, setMajorContributors] = useState<Record<string, unknown>[]>([])
  const [revenueSources, setRevenueSources] = useState<Record<string, unknown>[]>([])
  const [budgetPerProgram, setBudgetPerProgram] = useState<Record<string, unknown>[]>([])
  const [activities, setActivities] = useState<Record<string, unknown>[]>([])
  const [relatedOrganizations, setRelatedOrganizations] = useState<Record<string, unknown>[]>([])
  const [compensationArrangements, setCompensationArrangements] = useState<Record<string, unknown>[]>([])
  const [relatedPartyAgreements, setRelatedPartyAgreements] = useState<Record<string, unknown>[]>([])
  const [fundraisingActivities, setFundraisingActivities] = useState<Record<string, unknown>[]>([])
  const [grants, setGrants] = useState<Record<string, unknown>[]>([])

  const hasActiveLock = Boolean(
    activeApplication && ["pending_payment", "awaiting_review"].includes(activeApplication.status)
  )

  // @ts-expect-error - TypeScript inference issue with complex form data
  const form = useForm({
    _method: undefined as string | undefined,
    // A. Basic Organization Information
    legal_name: organization.name || "",
    mailing_address: organization.street ? `${organization.street}, ${organization.city}, ${organization.state} ${organization.zip}` : "",
    physical_address: "",
    ein: organization.ein || "",
    date_incorporated: "",
    state_of_incorporation: "",
    organizational_structure: "",
    contact_phone: organization.phone || "",
    contact_email: organization.email || "",
    website: organization.website || "",

    // B. Organizational Structure & Governance
    organizing_documents: [] as File[],
    bylaws_document: [] as File[],
    officers_directors: [] as Record<string, unknown>[],
    conflict_of_interest_policy_document: null as File | null,
    organizational_chart_document: null as File | null,
    related_organizations: [] as Record<string, unknown>[],

    // C. Purpose & Activities
    mission_statement: organization.mission || "",
    activities: [] as Record<string, unknown>[],
    fundraising_materials: [] as File[],

    // D. Financial Information
    financial_statements: [] as File[],
    revenue_sources: [] as unknown[],
    budget_per_program: [] as unknown[],
    major_contributors: [] as unknown[],
    fundraising_activities: [] as Record<string, unknown>[],
    prior_year_tax_filings: [] as File[],

    // E. Operational Details
    compensation_arrangements: [] as Record<string, unknown>[],
    related_party_agreements: [] as Record<string, unknown>[],
    political_activities_yes_no: "",
    political_activities_desc: "",
    grants: [] as Record<string, unknown>[],
    foreign_activities_yes_no: "",
    foreign_activities_desc: "",

    // F. Supporting Documents
    form_ss4_confirmation: null as File | null,
    board_meeting_minutes: null as File | null,
    whistleblower_policy_document: null as File | null,
  })

  const handleOrganizingDocsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    setOrganizingDocsPreview(files)
    setData("organizing_documents", files)
  }

  const handleFinancialDocsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    setFinancialDocsPreview(files)
    setData("financial_statements", files)
  }

  const handleBylawsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    setBylawsPreview(files)
    setData("bylaws_document", files)
  }

  const handleConflictPolicyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setConflictPolicyPreview(file)
    setData("conflict_of_interest_policy_document", file)
  }

  const handleOrgChartChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setOrgChartPreview(file)
    setData("organizational_chart_document", file)
  }

  const handlePriorYearTaxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    setPriorYearTaxPreview(files)
    setData("prior_year_tax_filings", files)
  }

  const handleSs4Change = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setSs4Preview(file)
    setData("form_ss4_confirmation", file)
  }

  const handleBoardMinutesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setBoardMinutesPreview(file)
    setData("board_meeting_minutes", file)
  }

  const handleWhistleblowerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setWhistleblowerPreview(file)
    setData("whistleblower_policy_document", file)
  }

  const handleFundraisingMaterialsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    setFundraisingMaterialsPreview(files)
    setData("fundraising_materials", files)
  }

  const addOfficerDirector = () => {
    const newOfficer = {
      name: "",
      title: "",
      address: "",
      compensation: "",
      hours_per_week: "",
    }
    const updated = [...officersDirectors, newOfficer]
    setOfficersDirectors(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("officers_directors", updated as any)
  }

  const removeOfficerDirector = (index: number) => {
    const updated = officersDirectors.filter((_, i) => i !== index)
    setOfficersDirectors(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("officers_directors", updated as any)
  }

  const updateOfficerDirector = (index: number, field: string, value: string) => {
    const updated = officersDirectors.map((officer, i) =>
      i === index ? { ...officer, [field]: value } : officer
    )
    setOfficersDirectors(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("officers_directors", updated as any)
  }

  const addMajorContributor = () => {
    const newContributor = {
      name: "",
      amount: "",
      frequency: "",
    }
    const updated = [...majorContributors, newContributor]
    setMajorContributors(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("major_contributors", updated as any)
  }

  const removeMajorContributor = (index: number) => {
    const updated = majorContributors.filter((_, i) => i !== index)
    setMajorContributors(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("major_contributors", updated as any)
  }

  const updateMajorContributor = (index: number, field: string, value: string) => {
    const updated = majorContributors.map((contributor, i) =>
      i === index ? { ...contributor, [field]: value } : contributor
    )
    setMajorContributors(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("major_contributors", updated as any)
  }

  const addRevenueSource = () => {
    const newSource = {
      source: "",
      amount: "",
    }
    const updated = [...revenueSources, newSource]
    setRevenueSources(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("revenue_sources", updated as any)
  }

  const removeRevenueSource = (index: number) => {
    const updated = revenueSources.filter((_, i) => i !== index)
    setRevenueSources(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("revenue_sources", updated as any)
  }

  const updateRevenueSource = (index: number, field: string, value: string) => {
    const updated = revenueSources.map((source, i) =>
      i === index ? { ...source, [field]: value } : source
    )
    setRevenueSources(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("revenue_sources", updated as any)
  }

  const addBudgetProgram = () => {
    const newProgram = {
      program: "",
      amount: "",
    }
    const updated = [...budgetPerProgram, newProgram]
    setBudgetPerProgram(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("budget_per_program", updated as any)
  }

  const removeBudgetProgram = (index: number) => {
    const updated = budgetPerProgram.filter((_, i) => i !== index)
    setBudgetPerProgram(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("budget_per_program", updated as any)
  }

  const updateBudgetProgram = (index: number, field: string, value: string) => {
    const updated = budgetPerProgram.map((program, i) =>
      i === index ? { ...program, [field]: value } : program
    )
    setBudgetPerProgram(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("budget_per_program", updated as any)
  }

  // Activities repeater handlers
  const addActivity = () => {
    const newActivity = {
      activity_name: "",
      description: "",
      beneficiaries: "",
      funding_source: "",
    }
    const updated = [...activities, newActivity]
    setActivities(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("activities", updated as any)
  }

  const removeActivity = (index: number) => {
    const updated = activities.filter((_, i) => i !== index)
    setActivities(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("activities", updated as any)
  }

  const updateActivity = (index: number, field: string, value: string) => {
    const updated = activities.map((activity, i) =>
      i === index ? { ...activity, [field]: value } : activity
    )
    setActivities(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("activities", updated as any)
  }

  // Related Organizations repeater handlers
  const addRelatedOrganization = () => {
    const newOrg = {
      name: "",
      type: "",
      relationship: "",
      description: "",
    }
    const updated = [...relatedOrganizations, newOrg]
    setRelatedOrganizations(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("related_organizations", updated as any)
  }

  const removeRelatedOrganization = (index: number) => {
    const updated = relatedOrganizations.filter((_, i) => i !== index)
    setRelatedOrganizations(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("related_organizations", updated as any)
  }

  const updateRelatedOrganization = (index: number, field: string, value: string) => {
    const updated = relatedOrganizations.map((org, i) =>
      i === index ? { ...org, [field]: value } : org
    )
    setRelatedOrganizations(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("related_organizations", updated as any)
  }

  // Compensation Arrangements repeater handlers
  const addCompensationArrangement = () => {
    const newArrangement = {
      name: "",
      role: "",
      details: "",
    }
    const updated = [...compensationArrangements, newArrangement]
    setCompensationArrangements(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("compensation_arrangements", updated as any)
  }

  const removeCompensationArrangement = (index: number) => {
    const updated = compensationArrangements.filter((_, i) => i !== index)
    setCompensationArrangements(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("compensation_arrangements", updated as any)
  }

  const updateCompensationArrangement = (index: number, field: string, value: string) => {
    const updated = compensationArrangements.map((arrangement, i) =>
      i === index ? { ...arrangement, [field]: value } : arrangement
    )
    setCompensationArrangements(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("compensation_arrangements", updated as any)
  }

  // Related Party Agreements repeater handlers
  const addRelatedPartyAgreement = () => {
    const newAgreement = {
      description: "",
      document: null as File | null,
    }
    const updated = [...relatedPartyAgreements, newAgreement]
    setRelatedPartyAgreements(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("related_party_agreements", updated as any)
  }

  const removeRelatedPartyAgreement = (index: number) => {
    const updated = relatedPartyAgreements.filter((_, i) => i !== index)
    setRelatedPartyAgreements(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("related_party_agreements", updated as any)
  }

  const updateRelatedPartyAgreement = (index: number, field: string, value: string | File | null) => {
    const updated = relatedPartyAgreements.map((agreement, i) =>
      i === index ? { ...agreement, [field]: value } : agreement
    )
    setRelatedPartyAgreements(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("related_party_agreements", updated as any)
  }

  // Fundraising Activities repeater handlers
  const addFundraisingActivity = () => {
    const newActivity = {
      activity_name: "",
      description: "",
      contract: null as File | null,
    }
    const updated = [...fundraisingActivities, newActivity]
    setFundraisingActivities(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("fundraising_activities", updated as any)
  }

  const removeFundraisingActivity = (index: number) => {
    const updated = fundraisingActivities.filter((_, i) => i !== index)
    setFundraisingActivities(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("fundraising_activities", updated as any)
  }

  const updateFundraisingActivity = (index: number, field: string, value: string | File | null) => {
    const updated = fundraisingActivities.map((activity, i) =>
      i === index ? { ...activity, [field]: value } : activity
    )
    setFundraisingActivities(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("fundraising_activities", updated as any)
  }

  // Grants repeater handlers
  const addGrant = () => {
    const newGrant = {
      recipient: "",
      purpose: "",
      amount: "",
    }
    const updated = [...grants, newGrant]
    setGrants(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("grants", updated as any)
  }

  const removeGrant = (index: number) => {
    const updated = grants.filter((_, i) => i !== index)
    setGrants(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("grants", updated as any)
  }

  const updateGrant = (index: number, field: string, value: string) => {
    const updated = grants.map((grant, i) =>
      i === index ? { ...grant, [field]: value } : grant
    )
    setGrants(updated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData("grants", updated as any)
  }


  const { data, setData, post, processing, errors } = form
  const [showCertificationModal, setShowCertificationModal] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [fieldValidationErrors, setFieldValidationErrors] = useState<Record<string, string>>({})

  // Load existing application data when editing
  useEffect(() => {
    if (existingApplication) {
      // Load basic fields
      if (existingApplication.legal_name) setData("legal_name", existingApplication.legal_name)
      if (existingApplication.mailing_address) setData("mailing_address", existingApplication.mailing_address)
      if (existingApplication.physical_address) setData("physical_address", existingApplication.physical_address || "")
      if (existingApplication.ein) setData("ein", existingApplication.ein)
      if (existingApplication.date_incorporated) {
        // Format date for input field (YYYY-MM-DD)
        const date = new Date(existingApplication.date_incorporated)
        const formattedDate = date.toISOString().split('T')[0]
        setData("date_incorporated", formattedDate)
      }
      if (existingApplication.state_of_incorporation) setData("state_of_incorporation", existingApplication.state_of_incorporation)
      if (existingApplication.organizational_structure) setData("organizational_structure", existingApplication.organizational_structure)
      if (existingApplication.contact_phone) setData("contact_phone", existingApplication.contact_phone)
      if (existingApplication.contact_email) setData("contact_email", existingApplication.contact_email)
      if (existingApplication.website) setData("website", existingApplication.website || "")
      if (existingApplication.mission_statement) setData("mission_statement", existingApplication.mission_statement)
      if (existingApplication.political_activities_yes_no) setData("political_activities_yes_no", existingApplication.political_activities_yes_no)
      if (existingApplication.political_activities_desc) setData("political_activities_desc", existingApplication.political_activities_desc || "")
      if (existingApplication.foreign_activities_yes_no) setData("foreign_activities_yes_no", existingApplication.foreign_activities_yes_no)
      if (existingApplication.foreign_activities_desc) setData("foreign_activities_desc", existingApplication.foreign_activities_desc || "")

      // Load file previews from existing application
      // Helper to create file-like objects for preview
      const createFilePreview = (fileData: any) => {
        if (!fileData) return null
        if (Array.isArray(fileData) && fileData.length > 0) {
          return fileData.map((file: any) => ({
            name: file.name || 'Uploaded file',
            path: file.path,
            size: file.size,
            type: file.mime || 'application/pdf',
          }))
        }
        if (fileData.name || fileData.path) {
          return {
            name: fileData.name || 'Uploaded file',
            path: fileData.path,
            size: fileData.size,
            type: fileData.mime || 'application/pdf',
          }
        }
        return null
      }

      // Set file previews
      if (existingApplication.organizing_documents) {
        const files = createFilePreview(existingApplication.organizing_documents)
        if (files) setOrganizingDocsPreview(Array.isArray(files) ? files : [files])
      }
      if (existingApplication.bylaws_document) {
        const files = createFilePreview(existingApplication.bylaws_document)
        if (files) setBylawsPreview(Array.isArray(files) ? files : [files])
      }
      if (existingApplication.conflict_of_interest_policy_document) {
        const file = createFilePreview(existingApplication.conflict_of_interest_policy_document)
        if (file) setConflictPolicyPreview(Array.isArray(file) ? file[0] : file)
      }
      if (existingApplication.organizational_chart_document) {
        const file = createFilePreview(existingApplication.organizational_chart_document)
        if (file) setOrgChartPreview(Array.isArray(file) ? file[0] : file)
      }
      if (existingApplication.financial_statements) {
        const files = createFilePreview(existingApplication.financial_statements)
        if (files) setFinancialDocsPreview(Array.isArray(files) ? files : [files])
      }
      if (existingApplication.form_ss4_confirmation) {
        const file = createFilePreview(existingApplication.form_ss4_confirmation)
        if (file) setSs4Preview(Array.isArray(file) ? file[0] : file)
      }
      if (existingApplication.board_meeting_minutes) {
        const file = createFilePreview(existingApplication.board_meeting_minutes)
        if (file) setBoardMinutesPreview(Array.isArray(file) ? file[0] : file)
      }
      if (existingApplication.whistleblower_policy_document) {
        const file = createFilePreview(existingApplication.whistleblower_policy_document)
        if (file) setWhistleblowerPreview(Array.isArray(file) ? file[0] : file)
      }
      if (existingApplication.fundraising_materials) {
        const files = createFilePreview(existingApplication.fundraising_materials)
        if (files) setFundraisingMaterialsPreview(Array.isArray(files) ? files : [files])
      }
      if (existingApplication.prior_year_tax_filings) {
        const files = createFilePreview(existingApplication.prior_year_tax_filings)
        if (files) setPriorYearTaxPreview(Array.isArray(files) ? files : [files])
      }

      // Load array fields
      if (existingApplication.activities && Array.isArray(existingApplication.activities)) {
        setActivities(existingApplication.activities)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setData("activities", existingApplication.activities as any)
      }
      if (existingApplication.revenue_sources && Array.isArray(existingApplication.revenue_sources)) {
        setRevenueSources(existingApplication.revenue_sources)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setData("revenue_sources", existingApplication.revenue_sources as any)
      }
      if (existingApplication.budget_per_program && Array.isArray(existingApplication.budget_per_program)) {
        setBudgetPerProgram(existingApplication.budget_per_program)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setData("budget_per_program", existingApplication.budget_per_program as any)
      }
      if (existingApplication.officers_directors && Array.isArray(existingApplication.officers_directors)) {
        setOfficersDirectors(existingApplication.officers_directors)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setData("officers_directors", existingApplication.officers_directors as any)
      }
      if (existingApplication.related_organizations && Array.isArray(existingApplication.related_organizations)) {
        setRelatedOrganizations(existingApplication.related_organizations)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setData("related_organizations", existingApplication.related_organizations as any)
      }
      if (existingApplication.compensation_arrangements && Array.isArray(existingApplication.compensation_arrangements)) {
        setCompensationArrangements(existingApplication.compensation_arrangements)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setData("compensation_arrangements", existingApplication.compensation_arrangements as any)
      }
      if (existingApplication.related_party_agreements && Array.isArray(existingApplication.related_party_agreements)) {
        setRelatedPartyAgreements(existingApplication.related_party_agreements)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setData("related_party_agreements", existingApplication.related_party_agreements as any)
      }
      if (existingApplication.grants && Array.isArray(existingApplication.grants)) {
        setGrants(existingApplication.grants)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setData("grants", existingApplication.grants as any)
      }
      if (existingApplication.fundraising_activities && Array.isArray(existingApplication.fundraising_activities)) {
        setFundraisingActivities(existingApplication.fundraising_activities)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setData("fundraising_activities", existingApplication.fundraising_activities as any)
      }
      if (existingApplication.major_contributors && Array.isArray(existingApplication.major_contributors)) {
        setMajorContributors(existingApplication.major_contributors)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setData("major_contributors", existingApplication.major_contributors as any)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingApplication])

  const validateAllSteps = (): boolean => {
    for (let step = 1; step <= steps.length; step++) {
      if (!validateStep(step)) {
        // Go to the first invalid step
        setCurrentStep(step)
        return false
      }
    }
    return true
  }

  const submit = () => {
    // Validate all steps before submitting
    if (!validateAllSteps()) {
      return
    }
    
    // If editing existing application, use PUT to update endpoint
    // Check both existingApplication and activeApplication for edit mode
    const isEditing = existingApplication?.id || (activeApplication && ['draft', 'needs_more_info'].includes(activeApplication.status))
    const applicationId = existingApplication?.id || activeApplication?.id
    
    if (isEditing && applicationId) {
      console.log('Editing application:', applicationId, 'existingApplication:', existingApplication, 'activeApplication:', activeApplication)
      // Use router.post with FormData and _method PUT for file uploads (Laravel method spoofing)
      const formData = new FormData()
      
      // Helper to append nested data
      const appendToFormData = (key: string, value: unknown) => {
        if (value === null || value === undefined) return
        
        if (value instanceof File) {
          formData.append(key, value)
        } else if (Array.isArray(value)) {
          if (value.length > 0 && value[0] instanceof File) {
            value.forEach((file) => formData.append(`${key}[]`, file))
          } else {
            value.forEach((item, idx) => {
              if (typeof item === 'object' && item !== null) {
                Object.entries(item).forEach(([subKey, subVal]) => {
                  if (subVal instanceof File) {
                    formData.append(`${key}[${idx}][${subKey}]`, subVal)
                  } else if (subVal !== null && subVal !== undefined) {
                    formData.append(`${key}[${idx}][${subKey}]`, String(subVal))
                  }
                })
              } else {
                formData.append(`${key}[${idx}]`, String(item))
              }
            })
          }
        } else if (typeof value === 'object') {
          Object.entries(value).forEach(([subKey, subVal]) => {
            if (subVal instanceof File) {
              formData.append(`${key}[${subKey}]`, subVal)
            } else if (subVal !== null && subVal !== undefined) {
              formData.append(`${key}[${subKey}]`, String(subVal))
            }
          })
        } else {
          formData.append(key, String(value))
        }
      }
      
      // Append all form data
      Object.entries(data).forEach(([key, value]) => {
        if (key !== '_method') {
          appendToFormData(key, value)
        }
      })
      
      // Add method spoofing
      formData.append('_method', 'PUT')
      
      router.post(route("form1023.apply.update", applicationId), formData, {
        forceFormData: true,
        preserveScroll: true,
      })
    } else {
      console.log('Creating new application')
      post(route("form1023.apply.store"), {
        forceFormData: true,
        preserveScroll: true,
      })
    }
  }

  const saveAsDraft = () => {
    setSavingDraft(true)
    
    // Check if editing existing application
    const isEditing = existingApplication?.id || (activeApplication && ['draft', 'needs_more_info'].includes(activeApplication.status))
    const applicationId = existingApplication?.id || activeApplication?.id
    
    if (isEditing && applicationId) {
      // Use update endpoint for editing
      const formData = new FormData()
      
      // Helper to append nested data
      const appendToFormData = (key: string, value: unknown) => {
        if (value === null || value === undefined) return
        
        if (value instanceof File) {
          formData.append(key, value)
        } else if (Array.isArray(value)) {
          if (value.length > 0 && value[0] instanceof File) {
            value.forEach((file) => formData.append(`${key}[]`, file))
          } else {
            value.forEach((item, idx) => {
              if (typeof item === 'object' && item !== null) {
                Object.entries(item).forEach(([subKey, subVal]) => {
                  if (subVal instanceof File) {
                    formData.append(`${key}[${idx}][${subKey}]`, subVal)
                  } else if (subVal !== null && subVal !== undefined) {
                    formData.append(`${key}[${idx}][${subKey}]`, String(subVal))
                  }
                })
              } else {
                formData.append(`${key}[${idx}]`, String(item))
              }
            })
          }
        } else if (typeof value === 'object') {
          Object.entries(value).forEach(([subKey, subVal]) => {
            if (subVal instanceof File) {
              formData.append(`${key}[${subKey}]`, subVal)
            } else if (subVal !== null && subVal !== undefined) {
              formData.append(`${key}[${subKey}]`, String(subVal))
            }
          })
        } else {
          formData.append(key, String(value))
        }
      }
      
      // Append all form data
      Object.entries(data).forEach(([key, value]) => {
        if (key !== '_method') {
          appendToFormData(key, value)
        }
      })
      
      // Add method spoofing and draft flag
      formData.append('_method', 'PUT')
      formData.append('save_as_draft', '1')
      
      router.post(route("form1023.apply.update", applicationId), formData, {
        forceFormData: true,
        preserveScroll: true,
        onFinish: () => {
          setSavingDraft(false)
          setShowCertificationModal(false)
        },
      })
    } else {
      // Use draft endpoint for new applications
      post(route("form1023.apply.draft"), {
        forceFormData: true,
        preserveScroll: true,
        onFinish: () => {
          setSavingDraft(false)
          setShowCertificationModal(false)
        },
      })
    }
  }

  const handleSubmitClick = () => {
    if (currentStep === steps.length) {
      if (validateStep(currentStep)) {
        setShowCertificationModal(true)
      }
    } else {
      submit()
    }
  }

  // Validation functions for each step
  const validateStep = (step: number): boolean => {
    const newFieldErrors: Record<string, string> = {}

    switch (step) {
      case 1:
        // Step 1: Basic Organization Information
        if (!data.legal_name || String(data.legal_name).trim() === "") {
          newFieldErrors.legal_name = "Legal name is required"
        }
        const einStr = String(data.ein || "").replace(/\D/g, "")
        if (!einStr || einStr.length !== 9 || !/^[0-9]{9}$/.test(einStr)) {
          newFieldErrors.ein = "EIN must be exactly 9 digits"
        }
        if (!data.mailing_address || String(data.mailing_address).trim() === "") {
          newFieldErrors.mailing_address = "Mailing address is required"
        }
        if (!data.date_incorporated || data.date_incorporated === "") {
          newFieldErrors.date_incorporated = "Date of incorporation is required"
        }
        if (!data.state_of_incorporation || String(data.state_of_incorporation).trim() === "") {
          newFieldErrors.state_of_incorporation = "State of incorporation is required"
        }
        if (!data.contact_phone || String(data.contact_phone).trim() === "") {
          newFieldErrors.contact_phone = "Contact phone is required"
        }
        const emailStr = String(data.contact_email || "").trim()
        if (!emailStr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
          newFieldErrors.contact_email = "Valid contact email is required"
        }
        break

      case 2:
        // Step 2: Organizational Structure & Governance
        if (!data.organizational_structure || data.organizational_structure === "") {
          newFieldErrors.organizational_structure = "Organizational structure is required"
        }
        if (!organizingDocsPreview.length) {
          newFieldErrors.organizing_documents = "Organizing documents are required"
        }
        if (!bylawsPreview.length) {
          newFieldErrors.bylaws_document = "Bylaws document is required"
        }
        if (!conflictPolicyPreview) {
          newFieldErrors.conflict_of_interest_policy_document = "Conflict of Interest Policy document is required"
        }
        if (officersDirectors.length === 0) {
          newFieldErrors.officers_directors = "At least one officer/director is required"
        } else {
          // Validate each officer/director
          officersDirectors.forEach((officer, index) => {
            if (!(officer.name as string)?.trim()) {
              newFieldErrors[`officer_${index}_name`] = "Name is required"
            }
            if (!(officer.title as string)?.trim()) {
              newFieldErrors[`officer_${index}_title`] = "Title is required"
            }
          })
        }
        break

      case 3:
        // Step 3: Purpose & Activities
        if (!data.mission_statement?.trim() || data.mission_statement.length < 10) {
          newFieldErrors.mission_statement = "Mission statement is required (minimum 10 characters)"
        }
        if (activities.length === 0) {
          newFieldErrors.activities = "At least one activity is required"
        } else {
          // Validate each activity
          activities.forEach((activity, index) => {
            if (!(activity.activity_name as string)?.trim()) {
              newFieldErrors[`activity_${index}_name`] = "Activity name is required"
            }
            if (!(activity.description as string)?.trim() || (activity.description as string).length < 20) {
              newFieldErrors[`activity_${index}_description`] = "Description is required (minimum 20 characters)"
            }
            if (!(activity.beneficiaries as string)?.trim() || (activity.beneficiaries as string).length < 10) {
              newFieldErrors[`activity_${index}_beneficiaries`] = "Beneficiaries description is required (minimum 10 characters)"
            }
            if (!(activity.funding_source as string)?.trim() || (activity.funding_source as string).length < 20) {
              newFieldErrors[`activity_${index}_funding_source`] = "Funding source description is required (minimum 20 characters)"
            }
          })
        }
        break

      case 4:
        // Step 4: Financial Information
        if (!financialDocsPreview.length) {
          newFieldErrors.financial_statements = "Financial statements are required"
        }
        if (revenueSources.length === 0) {
          newFieldErrors.revenue_sources = "At least one revenue source is required"
        } else {
          revenueSources.forEach((source, index) => {
            if (!(source.source as string)?.trim()) {
              newFieldErrors[`revenue_${index}_source`] = "Source type is required"
            }
            if (!(source.amount as string)?.trim()) {
              newFieldErrors[`revenue_${index}_amount`] = "Amount is required"
            }
          })
        }
        if (budgetPerProgram.length === 0) {
          newFieldErrors.budget_per_program = "At least one program budget is required"
        } else {
          budgetPerProgram.forEach((program, index) => {
            if (!(program.program as string)?.trim()) {
              newFieldErrors[`program_${index}_name`] = "Program name is required"
            }
            if (!(program.amount as string)?.trim()) {
              newFieldErrors[`program_${index}_amount`] = "Budget amount is required"
            }
          })
        }
        break

      case 5:
        // Step 5: Operational Details (mostly optional, but validate if filled)
        if (data.political_activities_yes_no === "Yes" && !data.political_activities_desc?.trim()) {
          newFieldErrors.political_activities_desc = "Political activities description is required when 'Yes' is selected"
        }
        if (data.foreign_activities_yes_no === "Yes" && !data.foreign_activities_desc?.trim()) {
          newFieldErrors.foreign_activities_desc = "Foreign activities description is required when 'Yes' is selected"
        }
        break

      case 6:
        // Step 6: Supporting Documents
        if (!ss4Preview) {
          newFieldErrors.form_ss4_confirmation = "IRS Form SS-4 confirmation letter is required"
        }
        break

      default:
        break
    }

    // Update field validation errors - only show errors for current step
    // Clear all previous errors and only show errors for the current step being validated
    setFieldValidationErrors(newFieldErrors)

    const isValid = Object.keys(newFieldErrors).length === 0
    return isValid
  }

  const nextStep = () => {
    if (currentStep < steps.length) {
      // Validate current step first
      const isValid = validateStep(currentStep)
      
      if (isValid) {
        // Clear errors when moving to next step
        setFieldValidationErrors({})
        setCurrentStep(currentStep + 1)
        window.scrollTo({ top: 0, behavior: "smooth" })
      } else {
        // Scroll to top to show validation errors
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      // Clear validation errors when going back
      setFieldValidationErrors({})
      setCurrentStep(currentStep - 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const goToStep = (step: number) => {
    if (step >= 1 && step <= steps.length) {
      // Allow going back, but validate when going forward
      if (step > currentStep) {
        if (validateStep(currentStep)) {
          // Clear errors when moving to next step
          setFieldValidationErrors({})
          setCurrentStep(step)
          window.scrollTo({ top: 0, behavior: "smooth" })
        } else {
          // Scroll to top to show validation errors (errors already set by validateStep)
          window.scrollTo({ top: 0, behavior: "smooth" })
        }
      } else {
        // Allow going back without validation - clear errors
        setFieldValidationErrors({})
        setCurrentStep(step)
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    }
  }

  const renderStatusBadge = (status?: string | null) => {
    if (!status) {
      return <Badge variant="outline">Unknown</Badge>
    }
    const config = statusLabels[status] ?? { label: status, tone: "bg-gray-100 text-gray-700" }
    return <Badge className={cn("capitalize", config.tone)}>{config.label}</Badge>
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Part I: Identification of Applicant
              </CardTitle>
              <CardDescription>Basic information about your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="legal_name">Legal name *</Label>
                  <Input
                    id="legal_name"
                    value={data.legal_name}
                    onChange={(e) => {
                      setData("legal_name", e.target.value)
                      if (fieldValidationErrors.legal_name) {
                        setFieldValidationErrors((prev) => {
                          const newErrors = { ...prev }
                          delete newErrors.legal_name
                          return newErrors
                        })
                      }
                    }}
                    disabled={hasActiveLock || processing}
                  />
                  {(errors.legal_name || fieldValidationErrors.legal_name) && (
                    <p className="text-sm text-red-600">{errors.legal_name || fieldValidationErrors.legal_name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ein">EIN (9 digits) *</Label>
                  <Input
                    id="ein"
                    value={data.ein}
                    onChange={(e) => {
                      setData("ein", e.target.value.replace(/\D/g, "").slice(0, 9))
                      if (fieldValidationErrors.ein) {
                        setFieldValidationErrors((prev) => {
                          const newErrors = { ...prev }
                          delete newErrors.ein
                          return newErrors
                        })
                      }
                    }}
                    maxLength={9}
                    disabled={hasActiveLock || processing}
                  />
                  {(errors.ein || fieldValidationErrors.ein) && (
                    <p className="text-sm text-red-600">{errors.ein || fieldValidationErrors.ein}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mailing_address">Mailing address *</Label>
                <Textarea
                  id="mailing_address"
                  value={data.mailing_address}
                  onChange={(e) => {
                    setData("mailing_address", e.target.value)
                    if (fieldValidationErrors.mailing_address) {
                      setFieldValidationErrors((prev) => {
                        const newErrors = { ...prev }
                        delete newErrors.mailing_address
                        return newErrors
                      })
                    }
                  }}
                  rows={3}
                  disabled={hasActiveLock || processing}
                  placeholder="Enter full mailing address including street, city, state, and ZIP code"
                />
                {(errors.mailing_address || fieldValidationErrors.mailing_address) && (
                  <p className="text-sm text-red-600">{errors.mailing_address || fieldValidationErrors.mailing_address}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={data.website}
                    onChange={(e) => setData("website", e.target.value)}
                    disabled={hasActiveLock || processing}
                  />
                  {errors.website && <p className="text-sm text-red-600">{errors.website}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_incorporated">Date incorporated *</Label>
                  <Input
                    id="date_incorporated"
                    type="date"
                    value={data.date_incorporated}
                    onChange={(e) => {
                      setData("date_incorporated", e.target.value)
                      if (fieldValidationErrors.date_incorporated) {
                        setFieldValidationErrors((prev) => {
                          const newErrors = { ...prev }
                          delete newErrors.date_incorporated
                          return newErrors
                        })
                      }
                    }}
                    disabled={hasActiveLock || processing}
                  />
                  {(errors.date_incorporated || fieldValidationErrors.date_incorporated) && (
                    <p className="text-sm text-red-600">{errors.date_incorporated || fieldValidationErrors.date_incorporated}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="state_of_incorporation">State of incorporation *</Label>
                <Input
                  id="state_of_incorporation"
                  value={data.state_of_incorporation}
                  onChange={(e) => {
                    setData("state_of_incorporation", e.target.value)
                    if (fieldValidationErrors.state_of_incorporation) {
                      setFieldValidationErrors((prev) => {
                        const newErrors = { ...prev }
                        delete newErrors.state_of_incorporation
                        return newErrors
                      })
                    }
                  }}
                  disabled={hasActiveLock || processing}
                />
                {(errors.state_of_incorporation || fieldValidationErrors.state_of_incorporation) && (
                  <p className="text-sm text-red-600">{errors.state_of_incorporation || fieldValidationErrors.state_of_incorporation}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Contact email *</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={data.contact_email}
                    onChange={(e) => {
                      setData("contact_email", e.target.value)
                      if (fieldValidationErrors.contact_email) {
                        setFieldValidationErrors((prev) => {
                          const newErrors = { ...prev }
                          delete newErrors.contact_email
                          return newErrors
                        })
                      }
                    }}
                    disabled={hasActiveLock || processing}
                  />
                  {(errors.contact_email || fieldValidationErrors.contact_email) && (
                    <p className="text-sm text-red-600">{errors.contact_email || fieldValidationErrors.contact_email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Contact phone *</Label>
                  <Input
                    id="contact_phone"
                    value={data.contact_phone}
                    onChange={(e) => {
                      setData("contact_phone", e.target.value)
                      if (fieldValidationErrors.contact_phone) {
                        setFieldValidationErrors((prev) => {
                          const newErrors = { ...prev }
                          delete newErrors.contact_phone
                          return newErrors
                        })
                      }
                    }}
                    disabled={hasActiveLock || processing}
                  />
                  {(errors.contact_phone || fieldValidationErrors.contact_phone) && (
                    <p className="text-sm text-red-600">{errors.contact_phone || fieldValidationErrors.contact_phone}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="physical_address">Physical address (if different from mailing)</Label>
                <Textarea
                  id="physical_address"
                  value={data.physical_address}
                  onChange={(e) => setData("physical_address", e.target.value)}
                  rows={3}
                  disabled={hasActiveLock || processing}
                  placeholder="Enter full physical address if different from mailing address"
                />
                {errors.physical_address && <p className="text-sm text-red-600">{errors.physical_address}</p>}
              </div>
            </CardContent>
          </Card>
        )

      case 2:
        return (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Part II: Organizational Structure</CardTitle>
                <CardDescription>Describe your organization's legal structure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="organizational_structure">Organizational structure *</Label>
                  <Select
                    value={data.organizational_structure}
                    onValueChange={(value) => {
                      setData("organizational_structure", value)
                      if (fieldValidationErrors.organizational_structure) {
                        setFieldValidationErrors((prev) => {
                          const newErrors = { ...prev }
                          delete newErrors.organizational_structure
                          return newErrors
                        })
                      }
                    }}
                    disabled={hasActiveLock || processing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select structure" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corporation">Corporation</SelectItem>
                      <SelectItem value="trust">Trust</SelectItem>
                      <SelectItem value="association">Association</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {(errors.organizational_structure || fieldValidationErrors.organizational_structure) && (
                    <p className="text-sm text-red-600">{errors.organizational_structure || fieldValidationErrors.organizational_structure}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organizing_documents">Organizing documents (PDF) *</Label>
                  {renderRejectionAlert("organizing_documents")}
                  <Input
                    id="organizing_documents"
                    type="file"
                    multiple
                    accept=".pdf"
                    onChange={(e) => {
                      handleOrganizingDocsChange(e)
                      if (fieldValidationErrors.organizing_documents) {
                        setFieldValidationErrors((prev) => {
                          const newErrors = { ...prev }
                          delete newErrors.organizing_documents
                          return newErrors
                        })
                      }
                    }}
                    disabled={hasActiveLock || processing}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload your articles of incorporation, trust agreement, or other organizing documents (PDF, up to 10MB each).
                  </p>
                  {organizingDocsPreview.length > 0 && (
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {organizingDocsPreview.map((file, index) => {
                        const { rejected, reason } = isDocumentRejected("organizing_documents", index)
                        return (
                          <li key={index} className={cn(
                            "flex items-center gap-2 p-2 rounded",
                            rejected && "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                          )}>
                            <FileText className={cn("h-4 w-4", rejected && "text-red-600")} /> 
                            <span className={cn(rejected && "text-red-700 dark:text-red-300")}>
                              {file.name || 'Uploaded file'}
                            </span>
                            {rejected && (
                              <Badge variant="destructive" className="text-xs ml-2">
                                Rejected
                              </Badge>
                            )}
                            {file.path && (
                              <a 
                                href={`/storage/${file.path}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline ml-2"
                              >
                                (View)
                              </a>
                            )}
                            {rejected && reason && (
                              <span className="text-xs text-red-600 dark:text-red-400 ml-2">
                                - {reason}
                              </span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  {(errors.organizing_documents || fieldValidationErrors.organizing_documents) && (
                    <p className="text-sm text-red-600">{errors.organizing_documents || fieldValidationErrors.organizing_documents}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>B. Organizational Structure & Governance</CardTitle>
                <CardDescription>Additional governance documents and information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bylaws_document">Bylaws (signed and dated) *</Label>
                  {renderRejectionAlert("bylaws_document")}
                  <Input
                    id="bylaws_document"
                    type="file"
                    multiple
                    accept=".pdf"
                    onChange={(e) => {
                      handleBylawsChange(e)
                      if (fieldValidationErrors.bylaws_document) {
                        setFieldValidationErrors((prev) => {
                          const newErrors = { ...prev }
                          delete newErrors.bylaws_document
                          return newErrors
                        })
                      }
                    }}
                    disabled={hasActiveLock || processing}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload your signed and dated bylaws (PDF, up to 10MB each).
                  </p>
                  {bylawsPreview.length > 0 && (
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {bylawsPreview.map((file, index) => {
                        const { rejected, reason } = isDocumentRejected("bylaws_document", index)
                        return (
                          <li key={index} className={cn(
                            "flex items-center gap-2 p-2 rounded",
                            rejected && "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                          )}>
                            <FileText className={cn("h-4 w-4", rejected && "text-red-600")} /> 
                            <span className={cn(rejected && "text-red-700 dark:text-red-300")}>
                              {file.name || 'Uploaded file'}
                            </span>
                            {rejected && (
                              <Badge variant="destructive" className="text-xs ml-2">
                                Rejected
                              </Badge>
                            )}
                            {file.path && (
                              <a 
                                href={`/storage/${file.path}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline ml-2"
                              >
                                (View)
                              </a>
                            )}
                            {rejected && reason && (
                              <span className="text-xs text-red-600 dark:text-red-400 ml-2">
                                - {reason}
                              </span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  {(errors.bylaws_document || fieldValidationErrors.bylaws_document) && (
                    <p className="text-sm text-red-600">{errors.bylaws_document || fieldValidationErrors.bylaws_document}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conflict_of_interest_policy_document">Conflict of Interest Policy Document *</Label>
                  {renderRejectionAlert("conflict_of_interest_policy_document")}
                  <Input
                    id="conflict_of_interest_policy_document"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      handleConflictPolicyChange(e)
                      if (fieldValidationErrors.conflict_of_interest_policy_document) {
                        setFieldValidationErrors((prev) => {
                          const newErrors = { ...prev }
                          delete newErrors.conflict_of_interest_policy_document
                          return newErrors
                        })
                      }
                    }}
                    disabled={hasActiveLock || processing}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload your Conflict of Interest Policy document (PDF, up to 10MB).
                  </p>
                  {conflictPolicyPreview && (
                    <div className={cn(
                      "text-sm flex items-center gap-2 p-2 rounded",
                      isDocumentRejected("conflict_of_interest_policy_document").rejected 
                        ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                        : "text-muted-foreground"
                    )}>
                      <FileText className="h-4 w-4" /> 
                      <span>{conflictPolicyPreview.name || 'Uploaded file'}</span>
                      {isDocumentRejected("conflict_of_interest_policy_document").rejected && (
                        <Badge variant="destructive" className="text-xs ml-2">
                          Rejected
                        </Badge>
                      )}
                      {conflictPolicyPreview.path && (
                        <a 
                          href={`/storage/${conflictPolicyPreview.path}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline ml-2"
                        >
                          (View)
                        </a>
                      )}
                      {isDocumentRejected("conflict_of_interest_policy_document").reason && (
                        <span className="text-xs ml-2">
                          - {isDocumentRejected("conflict_of_interest_policy_document").reason}
                        </span>
                      )}
                    </div>
                  )}
                  {(errors.conflict_of_interest_policy_document || fieldValidationErrors.conflict_of_interest_policy_document) && (
                    <p className="text-sm text-red-600">
                      {errors.conflict_of_interest_policy_document || fieldValidationErrors.conflict_of_interest_policy_document}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organizational_chart_document">Organizational Chart</Label>
                  <Input
                    id="organizational_chart_document"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleOrgChartChange}
                    disabled={hasActiveLock || processing}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload your organizational chart showing control structure (PDF, JPG, PNG up to 10MB).
                  </p>
                  {orgChartPreview && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" /> 
                      <span>{orgChartPreview.name || 'Uploaded file'}</span>
                      {orgChartPreview.path && (
                        <a 
                          href={`/storage/${orgChartPreview.path}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline ml-2"
                        >
                          (View)
                        </a>
                      )}
                    </p>
                  )}
                  {errors.organizational_chart_document && (
                    <p className="text-sm text-red-600">{errors.organizational_chart_document}</p>
                  )}
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Related Organizations</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addRelatedOrganization}
                      disabled={hasActiveLock || processing}
                    >
                      Add Organization
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Information on related organizations (subsidiaries, parent orgs, affiliates, etc.).
                  </p>

                  {relatedOrganizations.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No related organizations added yet.</p>
                  )}

                  {relatedOrganizations.map((org, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-medium">Organization #{index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRelatedOrganization(index)}
                          disabled={hasActiveLock || processing}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Organization Name *</Label>
                          <Input
                            value={(org.name as string) || ""}
                            onChange={(e) => updateRelatedOrganization(index, "name", e.target.value)}
                            disabled={hasActiveLock || processing}
                            placeholder="Organization name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Input
                            value={(org.type as string) || ""}
                            onChange={(e) => updateRelatedOrganization(index, "type", e.target.value)}
                            disabled={hasActiveLock || processing}
                            placeholder="e.g., Subsidiary, Parent"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Relationship</Label>
                          <Select
                            value={(org.relationship as string) || ""}
                            onValueChange={(value) => updateRelatedOrganization(index, "relationship", value)}
                            disabled={hasActiveLock || processing}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select relationship" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Parent">Parent</SelectItem>
                              <SelectItem value="Subsidiary">Subsidiary</SelectItem>
                              <SelectItem value="Affiliate">Affiliate</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Description</Label>
                          <Textarea
                            value={(org.description as string) || ""}
                            onChange={(e) => updateRelatedOrganization(index, "description", e.target.value)}
                            rows={3}
                            disabled={hasActiveLock || processing}
                            placeholder="Describe the relationship..."
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                  {errors.related_organizations && <p className="text-sm text-red-600">{errors.related_organizations}</p>}
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Officers, Directors, and Key Employees</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addOfficerDirector}
                      disabled={hasActiveLock || processing}
                    >
                      Add Officer/Director
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Provide names, titles, addresses, and compensation for all officers, directors, and key employees.
                  </p>

                  {officersDirectors.length === 0 && (
                    <>
                      <p className="text-sm text-muted-foreground italic">No officers/directors added yet.</p>
                      {fieldValidationErrors.officers_directors && (
                        <p className="text-sm text-red-600">{fieldValidationErrors.officers_directors}</p>
                      )}
                    </>
                  )}

                  {officersDirectors.map((officer, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-medium">Officer/Director #{index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOfficerDirector(index)}
                          disabled={hasActiveLock || processing}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Name *</Label>
                          <Input
                            value={(officer.name as string) || ""}
                            onChange={(e) => {
                              updateOfficerDirector(index, "name", e.target.value)
                              if (fieldValidationErrors[`officer_${index}_name`]) {
                                setFieldValidationErrors((prev) => {
                                  const newErrors = { ...prev }
                                  delete newErrors[`officer_${index}_name`]
                                  return newErrors
                                })
                              }
                            }}
                            disabled={hasActiveLock || processing}
                            placeholder="Full name"
                          />
                          {fieldValidationErrors[`officer_${index}_name`] && (
                            <p className="text-sm text-red-600">{fieldValidationErrors[`officer_${index}_name`]}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Title/Position *</Label>
                          <Input
                            value={(officer.title as string) || ""}
                            onChange={(e) => {
                              updateOfficerDirector(index, "title", e.target.value)
                              if (fieldValidationErrors[`officer_${index}_title`]) {
                                setFieldValidationErrors((prev) => {
                                  const newErrors = { ...prev }
                                  delete newErrors[`officer_${index}_title`]
                                  return newErrors
                                })
                              }
                            }}
                            disabled={hasActiveLock || processing}
                            placeholder="e.g., President, Treasurer"
                          />
                          {fieldValidationErrors[`officer_${index}_title`] && (
                            <p className="text-sm text-red-600">{fieldValidationErrors[`officer_${index}_title`]}</p>
                          )}
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Address</Label>
                          <Input
                            value={(officer.address as string) || ""}
                            onChange={(e) => updateOfficerDirector(index, "address", e.target.value)}
                            disabled={hasActiveLock || processing}
                            placeholder="Full address"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Compensation (annual)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={(officer.compensation as string) || ""}
                            onChange={(e) => updateOfficerDirector(index, "compensation", e.target.value)}
                            disabled={hasActiveLock || processing}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Hours per week</Label>
                          <Input
                            type="number"
                            value={(officer.hours_per_week as string) || ""}
                            onChange={(e) => updateOfficerDirector(index, "hours_per_week", e.target.value)}
                            disabled={hasActiveLock || processing}
                            placeholder="Hours"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Part IV: Narrative Description of Your Activities</CardTitle>
              <CardDescription>Describe your organization's mission, activities, and programs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mission_statement">Mission statement *</Label>
                <Textarea
                  id="mission_statement"
                  value={data.mission_statement}
                  onChange={(e) => {
                    setData("mission_statement", e.target.value)
                    if (fieldValidationErrors.mission_statement) {
                      setFieldValidationErrors((prev) => {
                        const newErrors = { ...prev }
                        delete newErrors.mission_statement
                        return newErrors
                      })
                    }
                  }}
                  rows={5}
                  disabled={hasActiveLock || processing}
                />
                {(errors.mission_statement || fieldValidationErrors.mission_statement) && (
                  <p className="text-sm text-red-600">{errors.mission_statement || fieldValidationErrors.mission_statement}</p>
                )}
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Past, Present, and Planned Activities *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addActivity}
                    disabled={hasActiveLock || processing}
                  >
                    Add Activity
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Detailed description of past, present, and planned activities. What does the organization do? Who benefits? How are activities funded?
                </p>

                {activities.length === 0 && (
                  <>
                    <p className="text-sm text-muted-foreground italic">No activities added yet.</p>
                    {fieldValidationErrors.activities && (
                      <p className="text-sm text-red-600">{fieldValidationErrors.activities}</p>
                    )}
                  </>
                )}

                {activities.map((activity, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium">Activity #{index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeActivity(index)}
                        disabled={hasActiveLock || processing}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Activity Name *</Label>
                        <Input
                          value={(activity.activity_name as string) || ""}
                          onChange={(e) => {
                            updateActivity(index, "activity_name", e.target.value)
                            if (fieldValidationErrors[`activity_${index}_name`]) {
                              setFieldValidationErrors((prev) => {
                                const newErrors = { ...prev }
                                delete newErrors[`activity_${index}_name`]
                                return newErrors
                              })
                            }
                          }}
                          disabled={hasActiveLock || processing}
                          placeholder="e.g., Education Program, Food Assistance"
                        />
                        {fieldValidationErrors[`activity_${index}_name`] && (
                          <p className="text-sm text-red-600">{fieldValidationErrors[`activity_${index}_name`]}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Description *</Label>
                        <Textarea
                          value={(activity.description as string) || ""}
                          onChange={(e) => {
                            updateActivity(index, "description", e.target.value)
                            if (fieldValidationErrors[`activity_${index}_description`]) {
                              setFieldValidationErrors((prev) => {
                                const newErrors = { ...prev }
                                delete newErrors[`activity_${index}_description`]
                                return newErrors
                              })
                            }
                          }}
                          rows={4}
                          disabled={hasActiveLock || processing}
                          placeholder="What does the organization do?"
                        />
                        {fieldValidationErrors[`activity_${index}_description`] && (
                          <p className="text-sm text-red-600">{fieldValidationErrors[`activity_${index}_description`]}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Who Benefits? *</Label>
                        <Textarea
                          value={(activity.beneficiaries as string) || ""}
                          onChange={(e) => {
                            updateActivity(index, "beneficiaries", e.target.value)
                            if (fieldValidationErrors[`activity_${index}_beneficiaries`]) {
                              setFieldValidationErrors((prev) => {
                                const newErrors = { ...prev }
                                delete newErrors[`activity_${index}_beneficiaries`]
                                return newErrors
                              })
                            }
                          }}
                          rows={3}
                          disabled={hasActiveLock || processing}
                          placeholder="Who benefits from its services?"
                        />
                        {fieldValidationErrors[`activity_${index}_beneficiaries`] && (
                          <p className="text-sm text-red-600">{fieldValidationErrors[`activity_${index}_beneficiaries`]}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Funding Source *</Label>
                        <Textarea
                          value={(activity.funding_source as string) || ""}
                          onChange={(e) => {
                            updateActivity(index, "funding_source", e.target.value)
                            if (fieldValidationErrors[`activity_${index}_funding_source`]) {
                              setFieldValidationErrors((prev) => {
                                const newErrors = { ...prev }
                                delete newErrors[`activity_${index}_funding_source`]
                                return newErrors
                              })
                            }
                          }}
                          rows={3}
                          disabled={hasActiveLock || processing}
                          placeholder="How are activities carried out and funded?"
                        />
                        {fieldValidationErrors[`activity_${index}_funding_source`] && (
                          <p className="text-sm text-red-600">{fieldValidationErrors[`activity_${index}_funding_source`]}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
                {errors.activities && <p className="text-sm text-red-600">{errors.activities}</p>}
              </div>
            </CardContent>
          </Card>
        )

      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Part IX: Financial Data</CardTitle>
              <CardDescription>Provide financial information about your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="financial_statements">Financial Statements (Current + 3-Year Projection) (PDF) *</Label>
                {renderRejectionAlert("financial_statements")}
                <Input
                  id="financial_statements"
                  type="file"
                  multiple
                  accept=".pdf"
                    onChange={(e) => {
                      handleFinancialDocsChange(e)
                      if (fieldValidationErrors.financial_statements) {
                        setFieldValidationErrors((prev) => {
                          const newErrors = { ...prev }
                          delete newErrors.financial_statements
                          return newErrors
                        })
                      }
                    }}
                    disabled={hasActiveLock || processing}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload current year and three-year projected financial statements showing income and expenses (PDF, up to 10MB each).
                  </p>
                  {financialDocsPreview.length > 0 && (
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {financialDocsPreview.map((file, index) => {
                        const { rejected, reason } = isDocumentRejected("financial_statements", index)
                        return (
                          <li key={index} className={cn(
                            "flex items-center gap-2 p-2 rounded",
                            rejected && "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                          )}>
                            <FileText className={cn("h-4 w-4", rejected && "text-red-600")} /> 
                            <span className={cn(rejected && "text-red-700 dark:text-red-300")}>
                              {file.name || 'Uploaded file'}
                            </span>
                            {rejected && (
                              <Badge variant="destructive" className="text-xs ml-2">
                                Rejected
                              </Badge>
                            )}
                            {file.path && (
                              <a 
                                href={`/storage/${file.path}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline ml-2"
                              >
                                (View)
                              </a>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  {(errors.financial_statements || fieldValidationErrors.financial_statements) && (
                    <p className="text-sm text-red-600">{errors.financial_statements || fieldValidationErrors.financial_statements}</p>
                  )}
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Sources of Revenue</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRevenueSource}
                    disabled={hasActiveLock || processing}
                  >
                    Add Revenue Source
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  List all sources of revenue with estimated amounts (donations, grants, membership fees, sales, etc.).
                </p>

                {revenueSources.length === 0 && (
                  <>
                    <p className="text-sm text-muted-foreground italic">No revenue sources added yet.</p>
                    {fieldValidationErrors.revenue_sources && (
                      <p className="text-sm text-red-600">{fieldValidationErrors.revenue_sources}</p>
                    )}
                  </>
                )}

                {revenueSources.map((source, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium">Revenue Source #{index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRevenueSource(index)}
                        disabled={hasActiveLock || processing}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Source Type *</Label>
                        <Input
                          value={(source.source as string) || ""}
                          onChange={(e) => {
                            updateRevenueSource(index, "source", e.target.value)
                            if (fieldValidationErrors[`revenue_${index}_source`]) {
                              setFieldValidationErrors((prev) => {
                                const newErrors = { ...prev }
                                delete newErrors[`revenue_${index}_source`]
                                return newErrors
                              })
                            }
                          }}
                          disabled={hasActiveLock || processing}
                          placeholder="e.g., Donations, Grants, Membership Fees, Sales"
                        />
                        {fieldValidationErrors[`revenue_${index}_source`] && (
                          <p className="text-sm text-red-600">{fieldValidationErrors[`revenue_${index}_source`]}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Amount (annual) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={(source.amount as string) || ""}
                          onChange={(e) => {
                            updateRevenueSource(index, "amount", e.target.value)
                            if (fieldValidationErrors[`revenue_${index}_amount`]) {
                              setFieldValidationErrors((prev) => {
                                const newErrors = { ...prev }
                                delete newErrors[`revenue_${index}_amount`]
                                return newErrors
                              })
                            }
                          }}
                          disabled={hasActiveLock || processing}
                          placeholder="0.00"
                        />
                        {fieldValidationErrors[`revenue_${index}_amount`] && (
                          <p className="text-sm text-red-600">{fieldValidationErrors[`revenue_${index}_amount`]}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
                {errors.revenue_sources && <p className="text-sm text-red-600">{errors.revenue_sources}</p>}
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Estimated Budget for Each Major Program Activity</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addBudgetProgram}
                    disabled={hasActiveLock || processing}
                  >
                    Add Program
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Provide estimated budget for each major program or activity.
                </p>

                {budgetPerProgram.length === 0 && (
                  <>
                    <p className="text-sm text-muted-foreground italic">No programs added yet.</p>
                    {fieldValidationErrors.budget_per_program && (
                      <p className="text-sm text-red-600">{fieldValidationErrors.budget_per_program}</p>
                    )}
                  </>
                )}

                {budgetPerProgram.map((program, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium">Program #{index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBudgetProgram(index)}
                        disabled={hasActiveLock || processing}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Program Name *</Label>
                        <Input
                          value={(program.program as string) || ""}
                          onChange={(e) => {
                            updateBudgetProgram(index, "program", e.target.value)
                            if (fieldValidationErrors[`program_${index}_name`]) {
                              setFieldValidationErrors((prev) => {
                                const newErrors = { ...prev }
                                delete newErrors[`program_${index}_name`]
                                return newErrors
                              })
                            }
                          }}
                          disabled={hasActiveLock || processing}
                          placeholder="e.g., Education Program, Food Assistance"
                        />
                        {fieldValidationErrors[`program_${index}_name`] && (
                          <p className="text-sm text-red-600">{fieldValidationErrors[`program_${index}_name`]}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Budget Amount *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={(program.amount as string) || ""}
                          onChange={(e) => {
                            updateBudgetProgram(index, "amount", e.target.value)
                            if (fieldValidationErrors[`program_${index}_amount`]) {
                              setFieldValidationErrors((prev) => {
                                const newErrors = { ...prev }
                                delete newErrors[`program_${index}_amount`]
                                return newErrors
                              })
                            }
                          }}
                          disabled={hasActiveLock || processing}
                          placeholder="0.00"
                        />
                        {fieldValidationErrors[`program_${index}_amount`] && (
                          <p className="text-sm text-red-600">{fieldValidationErrors[`program_${index}_amount`]}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
                {errors.budget_per_program && <p className="text-sm text-red-600">{errors.budget_per_program}</p>}
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Major Contributors (Expected to donate more than $5,000 annually)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMajorContributor}
                    disabled={hasActiveLock || processing}
                  >
                    Add Contributor
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  List contributors expected to donate more than $5,000 annually.
                </p>

                {majorContributors.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No major contributors added yet.</p>
                )}

                {majorContributors.map((contributor, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium">Contributor #{index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMajorContributor(index)}
                        disabled={hasActiveLock || processing}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Name/Organization *</Label>
                        <Input
                          value={(contributor.name as string) || ""}
                          onChange={(e) => updateMajorContributor(index, "name", e.target.value)}
                          disabled={hasActiveLock || processing}
                          placeholder="Contributor name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Amount (annual) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={(contributor.amount as string) || ""}
                          onChange={(e) => updateMajorContributor(index, "amount", e.target.value)}
                          disabled={hasActiveLock || processing}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Frequency</Label>
                        <Select
                          value={(contributor.frequency as string) || ""}
                          onValueChange={(value) => updateMajorContributor(index, "frequency", value)}
                          disabled={hasActiveLock || processing}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="one-time">One-time</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="annually">Annually</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Fundraising Activities / Contracts</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addFundraisingActivity}
                    disabled={hasActiveLock || processing}
                  >
                    Add Activity
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Details of any fundraising activities and contracts with fundraisers.
                </p>

                {fundraisingActivities.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No fundraising activities added yet.</p>
                )}

                {fundraisingActivities.map((activity, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium">Activity #{index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFundraisingActivity(index)}
                        disabled={hasActiveLock || processing}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Activity Name</Label>
                        <Input
                          value={(activity.activity_name as string) || ""}
                          onChange={(e) => updateFundraisingActivity(index, "activity_name", e.target.value)}
                          disabled={hasActiveLock || processing}
                          placeholder="e.g., Annual Gala, Online Campaign"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={(activity.description as string) || ""}
                          onChange={(e) => updateFundraisingActivity(index, "description", e.target.value)}
                          rows={4}
                          disabled={hasActiveLock || processing}
                          placeholder="Describe the fundraising activity..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fundraiser Contract (if applicable)</Label>
                        <Input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => updateFundraisingActivity(index, "contract", e.target.files?.[0] || null)}
                          disabled={hasActiveLock || processing}
                        />
                        {(activity.contract as File) && (
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <FileText className="h-4 w-4" /> {(activity.contract as File).name}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
                {errors.fundraising_activities && <p className="text-sm text-red-600">{errors.fundraising_activities}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prior_year_tax_filings">Prior-year tax filings (if applicable)</Label>
                <Input
                  id="prior_year_tax_filings"
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handlePriorYearTaxChange}
                  disabled={hasActiveLock || processing}
                />
                <p className="text-xs text-muted-foreground">
                  Upload copies of prior-year tax filings if applicable (PDF, up to 10MB each).
                </p>
                {priorYearTaxPreview.length > 0 && (
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {priorYearTaxPreview.map((file, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <FileText className="h-4 w-4" /> 
                        <span>{file.name || 'Uploaded file'}</span>
                        {file.path && (
                          <a 
                            href={`/storage/${file.path}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline ml-2"
                          >
                            (View)
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {errors.prior_year_tax_filings && <p className="text-sm text-red-600">{errors.prior_year_tax_filings}</p>}
              </div>
            </CardContent>
          </Card>
        )

      case 5:
        return (
          <Card>
              <CardHeader>
                <CardTitle>E. Operational Details</CardTitle>
                <CardDescription>Compensation, agreements, activities, and grants</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Compensation Arrangements</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCompensationArrangement}
                      disabled={hasActiveLock || processing}
                    >
                      Add Arrangement
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Description of compensation arrangements for officers and key employees.
                  </p>

                  {compensationArrangements.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No compensation arrangements added yet.</p>
                  )}

                  {compensationArrangements.map((arrangement, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-medium">Arrangement #{index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCompensationArrangement(index)}
                          disabled={hasActiveLock || processing}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Officer/Employee Name</Label>
                          <Input
                            value={(arrangement.name as string) || ""}
                            onChange={(e) => updateCompensationArrangement(index, "name", e.target.value)}
                            disabled={hasActiveLock || processing}
                            placeholder="Name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Input
                            value={(arrangement.role as string) || ""}
                            onChange={(e) => updateCompensationArrangement(index, "role", e.target.value)}
                            disabled={hasActiveLock || processing}
                            placeholder="Role/Position"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Compensation Details</Label>
                          <Textarea
                            value={(arrangement.details as string) || ""}
                            onChange={(e) => updateCompensationArrangement(index, "details", e.target.value)}
                            rows={4}
                            disabled={hasActiveLock || processing}
                            placeholder="Describe compensation details..."
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                  {errors.compensation_arrangements && <p className="text-sm text-red-600">{errors.compensation_arrangements}</p>}
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Related Party Agreements</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addRelatedPartyAgreement}
                      disabled={hasActiveLock || processing}
                    >
                      Add Agreement
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Any lease, rental, or service agreements between related parties.
                  </p>

                  {relatedPartyAgreements.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No related party agreements added yet.</p>
                  )}

                  {relatedPartyAgreements.map((agreement, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-medium">Agreement #{index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRelatedPartyAgreement(index)}
                          disabled={hasActiveLock || processing}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={(agreement.description as string) || ""}
                            onChange={(e) => updateRelatedPartyAgreement(index, "description", e.target.value)}
                            rows={4}
                            disabled={hasActiveLock || processing}
                            placeholder="Describe the agreement..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Supporting Document</Label>
                          <Input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => updateRelatedPartyAgreement(index, "document", e.target.files?.[0] || null)}
                            disabled={hasActiveLock || processing}
                          />
                          {(agreement.document as File) && (
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                              <FileText className="h-4 w-4" /> {(agreement.document as File).name}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                  {errors.related_party_agreements && <p className="text-sm text-red-600">{errors.related_party_agreements}</p>}
                </div>

                <div className="space-y-2 border-t pt-4">
                  <Label>Political / Lobbying Activities</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="political_yes"
                        name="political_activities_yes_no"
                        value="Yes"
                        checked={data.political_activities_yes_no === "Yes"}
                        onChange={(e) => setData("political_activities_yes_no", e.target.value)}
                        disabled={hasActiveLock || processing}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="political_yes" className="font-normal">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="political_no"
                        name="political_activities_yes_no"
                        value="No"
                        checked={data.political_activities_yes_no === "No"}
                        onChange={(e) => setData("political_activities_yes_no", e.target.value)}
                        disabled={hasActiveLock || processing}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="political_no" className="font-normal">No</Label>
                    </div>
                  </div>
                  {data.political_activities_yes_no === "Yes" && (
                    <div className="mt-2">
                      <Textarea
                        value={data.political_activities_desc}
                        onChange={(e) => {
                          setData("political_activities_desc", e.target.value)
                          if (fieldValidationErrors.political_activities_desc) {
                            setFieldValidationErrors((prev) => {
                              const newErrors = { ...prev }
                              delete newErrors.political_activities_desc
                              return newErrors
                            })
                          }
                        }}
                        rows={4}
                        disabled={hasActiveLock || processing}
                        placeholder="Describe any political or lobbying activities..."
                      />
                      {(errors.political_activities_desc || fieldValidationErrors.political_activities_desc) && (
                        <p className="text-sm text-red-600 mt-1">
                          {errors.political_activities_desc || fieldValidationErrors.political_activities_desc}
                        </p>
                      )}
                    </div>
                  )}
                  {errors.political_activities_yes_no && <p className="text-sm text-red-600">{errors.political_activities_yes_no}</p>}
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Grants Made / Planned</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addGrant}
                      disabled={hasActiveLock || processing}
                    >
                      Add Grant
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Description of grants made or planned to other organizations or individuals.
                  </p>

                  {grants.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No grants added yet.</p>
                  )}

                  {grants.map((grant, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-medium">Grant #{index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeGrant(index)}
                          disabled={hasActiveLock || processing}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Recipient</Label>
                          <Input
                            value={(grant.recipient as string) || ""}
                            onChange={(e) => updateGrant(index, "recipient", e.target.value)}
                            disabled={hasActiveLock || processing}
                            placeholder="Recipient name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Amount (USD)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={(grant.amount as string) || ""}
                            onChange={(e) => updateGrant(index, "amount", e.target.value)}
                            disabled={hasActiveLock || processing}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Purpose</Label>
                          <Textarea
                            value={(grant.purpose as string) || ""}
                            onChange={(e) => updateGrant(index, "purpose", e.target.value)}
                            rows={3}
                            disabled={hasActiveLock || processing}
                            placeholder="Purpose of the grant..."
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                  {errors.grants && <p className="text-sm text-red-600">{errors.grants}</p>}
                </div>

                <div className="space-y-2 border-t pt-4">
                  <Label>Foreign Activities</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="foreign_yes"
                        name="foreign_activities_yes_no"
                        value="Yes"
                        checked={data.foreign_activities_yes_no === "Yes"}
                        onChange={(e) => setData("foreign_activities_yes_no", e.target.value)}
                        disabled={hasActiveLock || processing}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="foreign_yes" className="font-normal">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="foreign_no"
                        name="foreign_activities_yes_no"
                        value="No"
                        checked={data.foreign_activities_yes_no === "No"}
                        onChange={(e) => setData("foreign_activities_yes_no", e.target.value)}
                        disabled={hasActiveLock || processing}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="foreign_no" className="font-normal">No</Label>
                    </div>
                  </div>
                  {data.foreign_activities_yes_no === "Yes" && (
                    <div className="mt-2">
                      <Textarea
                        value={data.foreign_activities_desc}
                        onChange={(e) => {
                          setData("foreign_activities_desc", e.target.value)
                          if (fieldValidationErrors.foreign_activities_desc) {
                            setFieldValidationErrors((prev) => {
                              const newErrors = { ...prev }
                              delete newErrors.foreign_activities_desc
                              return newErrors
                            })
                          }
                        }}
                        rows={4}
                        disabled={hasActiveLock || processing}
                        placeholder="Describe any foreign activities or operations..."
                      />
                      {(errors.foreign_activities_desc || fieldValidationErrors.foreign_activities_desc) && (
                        <p className="text-sm text-red-600 mt-1">
                          {errors.foreign_activities_desc || fieldValidationErrors.foreign_activities_desc}
                        </p>
                      )}
                    </div>
                  )}
                  {errors.foreign_activities_yes_no && <p className="text-sm text-red-600">{errors.foreign_activities_yes_no}</p>}
                </div>
              </CardContent>
            </Card>
        )

      case 6:
        return (
          <>
            <Card>
              <CardHeader>
                <CardTitle>F. Supporting Documents</CardTitle>
                <CardDescription>Upload all required supporting documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="form_ss4_confirmation">IRS Form SS-4 Confirmation Letter *</Label>
                  {renderRejectionAlert("form_ss4_confirmation")}
                  <Input
                    id="form_ss4_confirmation"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      handleSs4Change(e)
                      if (fieldValidationErrors.form_ss4_confirmation) {
                        setFieldValidationErrors((prev) => {
                          const newErrors = { ...prev }
                          delete newErrors.form_ss4_confirmation
                          return newErrors
                        })
                      }
                    }}
                    disabled={hasActiveLock || processing}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload the IRS Form SS-4 confirmation letter showing your EIN issuance (PDF, up to 10MB).
                  </p>
                  {ss4Preview && (
                    <div className={cn(
                      "text-sm flex items-center gap-2 p-2 rounded",
                      isDocumentRejected("form_ss4_confirmation").rejected 
                        ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                        : "text-muted-foreground"
                    )}>
                      <FileText className="h-4 w-4" /> 
                      <span>{ss4Preview.name || 'Uploaded file'}</span>
                      {isDocumentRejected("form_ss4_confirmation").rejected && (
                        <Badge variant="destructive" className="text-xs ml-2">
                          Rejected
                        </Badge>
                      )}
                      {ss4Preview.path && (
                        <a 
                          href={`/storage/${ss4Preview.path}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline ml-2"
                        >
                          (View)
                        </a>
                      )}
                      {isDocumentRejected("form_ss4_confirmation").reason && (
                        <span className="text-xs ml-2">
                          - {isDocumentRejected("form_ss4_confirmation").reason}
                        </span>
                      )}
                    </div>
                  )}
                  {(errors.form_ss4_confirmation || fieldValidationErrors.form_ss4_confirmation) && (
                    <p className="text-sm text-red-600">{errors.form_ss4_confirmation || fieldValidationErrors.form_ss4_confirmation}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="board_meeting_minutes">Board Meeting Minutes</Label>
                  <Input
                    id="board_meeting_minutes"
                    type="file"
                    accept=".pdf"
                    onChange={handleBoardMinutesChange}
                    disabled={hasActiveLock || processing}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload board meeting minutes approving nonprofit formation (PDF, up to 10MB).
                  </p>
                  {boardMinutesPreview && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" /> 
                      <span>{boardMinutesPreview.name || 'Uploaded file'}</span>
                      {boardMinutesPreview.path && (
                        <a 
                          href={`/storage/${boardMinutesPreview.path}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline ml-2"
                        >
                          (View)
                        </a>
                      )}
                    </p>
                  )}
                  {errors.board_meeting_minutes && <p className="text-sm text-red-600">{errors.board_meeting_minutes}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whistleblower_policy_document">Whistleblower Policy Document</Label>
                  <Input
                    id="whistleblower_policy_document"
                    type="file"
                    accept=".pdf"
                    onChange={handleWhistleblowerChange}
                    disabled={hasActiveLock || processing}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload your Whistleblower Policy document (PDF, up to 10MB).
                  </p>
                  {whistleblowerPreview && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" /> 
                      <span>{whistleblowerPreview.name || 'Uploaded file'}</span>
                      {whistleblowerPreview.path && (
                        <a 
                          href={`/storage/${whistleblowerPreview.path}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline ml-2"
                        >
                          (View)
                        </a>
                      )}
                    </p>
                  )}
                  {errors.whistleblower_policy_document && (
                    <p className="text-sm text-red-600">{errors.whistleblower_policy_document}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fundraising_materials">Sample Fundraising Materials or Website Screenshots</Label>
                  <Input
                    id="fundraising_materials"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFundraisingMaterialsChange}
                    disabled={hasActiveLock || processing}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload copies of brochures, advertisements, website pages, or other materials describing your activities (PDF, JPG, PNG up to 10MB each).
                  </p>
                  {fundraisingMaterialsPreview.length > 0 && (
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {fundraisingMaterialsPreview.map((file, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <FileText className="h-4 w-4" /> 
                          <span>{file.name || 'Uploaded file'}</span>
                          {file.path && (
                            <a 
                              href={`/storage/${file.path}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline ml-2"
                            >
                              (View)
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {errors.fundraising_materials && <p className="text-sm text-red-600">{errors.fundraising_materials}</p>}
                </div>

              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Review & Submit</CardTitle>
                <CardDescription>Review your application and proceed to certification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Application Fee</span>
                      <span className="font-semibold">{formatCurrency(applicationFee)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Complete your application to proceed with certification.
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button
                  size="lg"
                  onClick={handleSubmitClick}
                  disabled={processing || hasActiveLock || savingDraft}
                  className="w-full md:w-auto"
                >
                  {processing || savingDraft ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </>
        )

      default:
        return null
    }
  }

  return (
    <AppLayout>
      <div className="w-full flex flex-col gap-6 py-8 px-4 md:px-6 lg:px-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Form 1023 Application</h1>
          <p className="text-muted-foreground">
            Application for Recognition of Exemption Under Section 501(c)(3) of the Internal Revenue Code
          </p>
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

        {hasActiveLock && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Application in progress</AlertTitle>
            <AlertDescription>
              You already have a Form 1023 application awaiting payment or review. We'll notify you once it moves forward.
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between px-2 sm:px-4 md:justify-center md:space-x-2 lg:space-x-4 overflow-x-auto">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-shrink-0">
                <button
                  onClick={() => goToStep(step.number)}
                  disabled={hasActiveLock || processing}
                  className={cn(
                    "w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm transition-all duration-200 flex-shrink-0",
                    currentStep >= step.number
                      ? "bg-gradient-to-r from-purple-600 to-purple-800 text-white shadow-lg"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600",
                    hasActiveLock || processing ? "cursor-not-allowed" : "cursor-pointer"
                  )}
                >
                  {currentStep > step.number ? <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" /> : step.number}
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-4 sm:w-8 md:w-12 lg:w-16 h-0.5 sm:h-1 mx-1 sm:mx-2 transition-all duration-200 flex-shrink-0",
                      currentStep > step.number
                        ? "bg-gradient-to-r from-purple-600 to-purple-800"
                        : "bg-gray-200 dark:bg-gray-700"
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-3 sm:mt-4">
            <div className="text-center">
              <p className="text-sm font-medium">{steps[currentStep - 1].title}</p>
              <p className="text-xs text-muted-foreground">{steps[currentStep - 1].description}</p>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="space-y-6">{renderStepContent()}</div>

        {/* Navigation Buttons */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1 || hasActiveLock || processing}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="text-sm text-muted-foreground">
                Step {currentStep} of {steps.length}
              </div>

              {currentStep < steps.length ? (
                <Button
                  onClick={nextStep}
                  disabled={hasActiveLock || processing || savingDraft}
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmitClick}
                  disabled={processing || hasActiveLock || savingDraft}
                  className="flex items-center gap-2"
                >
                  {processing || savingDraft ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Submit Application
                      <CheckCircle2 className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Certification Modal */}
        <Dialog open={showCertificationModal} onOpenChange={setShowCertificationModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="rounded-full bg-gradient-to-r from-purple-600 to-purple-800 p-3">
                  <Award className="h-8 w-8 text-white" />
                </div>
              </div>
              <DialogTitle className="text-center text-2xl">Get Certified Now?</DialogTitle>
              <DialogDescription className="text-center text-base pt-2">
                You're almost there! Complete your Form 1023 application payment to get your organization certified and recognized as a 501(c)(3) tax-exempt organization.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 p-4 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Application Fee</span>
                  <span className="text-lg font-bold">{formatCurrency(applicationFee)}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Choose to proceed with payment now or save your application and complete payment later.
              </p>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCertificationModal(false)
                  saveAsDraft()
                }}
                disabled={processing || savingDraft || hasActiveLock}
                className="w-full sm:w-auto"
              >
                {savingDraft ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Later"
                )}
              </Button>
              <Button
                onClick={() => {
                  // Validate all steps before submitting
                  if (validateAllSteps()) {
                    setShowCertificationModal(false)
                    submit()
                  } else {
                    // If validation fails, close modal and show errors
                    setShowCertificationModal(false)
                  }
                }}
                disabled={processing || savingDraft || hasActiveLock}
                className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900"
              >
                {processing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  "Now"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}
