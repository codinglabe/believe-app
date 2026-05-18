"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Link, router } from "@inertiajs/react"
import { Head } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import {
  ArrowLeft,
  Building,
  Calendar,
  Clock,
  FileText,
  Mail,
  XCircle,
  CheckCircle,
  Shield,
  User,
  Hash,
  MapPin,
  Image as ImageIcon,
  Download,
  Copy,
  Check,
  Eye,
} from "lucide-react"
import { motion } from "framer-motion"
import type { BreadcrumbItem } from "@/types"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { KybDocumentViewer } from "@/components/kyb-document-viewer"

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "KYB Verification", href: "/admin/kyb-verification" },
  { title: "Submission Details", href: "#" },
]

// Bridge KYC/KYB Link statuses: not_started, incomplete, under_review, awaiting_questionnaire, awaiting_ubo, approved, rejected, paused, offboarded
// Bridge Customer statuses: not_started, active, under_review, rejected
// Bridge ToS statuses: pending, approved
const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  // Bridge statuses
  not_started: {
    label: "Not Started",
    className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800",
    icon: <Clock className="h-4 w-4" />,
  },
  incomplete: {
    label: "Incomplete",
    className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
    icon: <Clock className="h-4 w-4" />,
  },
  under_review: {
    label: "Under Review",
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
    icon: <Clock className="h-4 w-4" />,
  },
  awaiting_questionnaire: {
    label: "Awaiting Questionnaire",
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
    icon: <Clock className="h-4 w-4" />,
  },
  awaiting_ubo: {
    label: "Awaiting UBO",
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
    icon: <Clock className="h-4 w-4" />,
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
    icon: <XCircle className="h-4 w-4" />,
  },
  paused: {
    label: "Paused",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
    icon: <Clock className="h-4 w-4" />,
  },
  offboarded: {
    label: "Offboarded",
    className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800",
    icon: <XCircle className="h-4 w-4" />,
  },
  // Legacy statuses (for backward compatibility)
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
    icon: <Clock className="h-4 w-4" />,
  },
  in_review: {
    label: "In Review",
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
    icon: <Clock className="h-4 w-4" />,
  },
  submitted: {
    label: "Submitted",
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
    icon: <Clock className="h-4 w-4" />,
  },
  // Internal statuses
  needs_more_info: {
    label: "Needs More Info",
    className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
    icon: <Clock className="h-4 w-4" />,
  },
}

interface ControlPerson {
  first_name: string
  last_name: string
  email: string
  birth_date: string
  ssn: string
  title: string
  ownership_percentage: number
  street_line_1: string
  city: string
  state: string
  postal_code: string
  country: string
  id_type: string
  id_number: string
  id_front_image?: string
  id_back_image?: string
}

interface BusinessAddress {
  street_line_1?: string
  city?: string
  subdivision?: string
  postal_code?: string
  country?: string
}

interface VerificationDocument {
  id: number
  document_type: string
  file_path: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason?: string | null
  approval_notes?: string | null
  rejected_at?: string | null
  rejected_by?: number | null
  approved_at?: string | null
  approved_by?: number | null
}

interface Submission {
  id: number
  business_name: string
  business_email: string
  ein: string
  business_address: BusinessAddress
  registered_address?: BusinessAddress
  physical_address?: BusinessAddress
  control_person: ControlPerson
  submission_status: string
  bridge_customer_id: string | null
  id_front_image_path: string | null
  id_back_image_path: string | null
  id_front_image_url: string | null
  id_back_image_url: string | null
  created_at: string
  updated_at: string
  verification_documents?: VerificationDocument[]
  bridge_integration: {
    id: number
    user?: {
      id: number
      name: string
      email: string
    }
    organization?: {
      id: number
      name: string
    }
  }
  submission_data?: {
    rejection_reason?: string
    rejected_at?: string
    rejected_by?: number
    approved_at?: string
    approved_by?: number
    approval_notes?: string
    entity_type?: string
    dao_status?: boolean
    business_description?: string
    primary_website?: string
    business_industry?: string
    source_of_funds?: string
    annual_revenue?: string
    transaction_volume?: string
    account_purpose?: string
    high_risk_activities?: string
    high_risk_geographies?: string
    physical_address?: BusinessAddress
    business_formation_document_path?: string
    business_ownership_document_path?: string
    proof_of_address_document_path?: string
    document_statuses?: {
      business_formation?: 'pending' | 'approved' | 'rejected'
      business_ownership?: 'pending' | 'approved' | 'rejected'
      proof_of_address?: 'pending' | 'approved' | 'rejected'
      id_front?: 'pending' | 'approved' | 'rejected'
      id_back?: 'pending' | 'approved' | 'rejected'
      [key: string]: unknown
    }
    requested_fields?: string[]
    refill_message?: string
    documents_to_send?: string[]
    [key: string]: unknown
  }
}

interface PageProps {
  submission: Submission
}

export default function AdminKybVerificationShow({ submission }: PageProps) {
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [approveNotes, setApproveNotes] = useState("")
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isDocumentViewerOpen, setIsDocumentViewerOpen] = useState(false)
  type SelectedDocument = {
    id: string
    type: string
    name: string
    url: string
    status: 'pending' | 'approved' | 'rejected'
    verified: boolean
    rejectionReason?: string
  }
  const [selectedDocument, setSelectedDocument] = useState<SelectedDocument | null>(null)
  const [documentRejectDialogs, setDocumentRejectDialogs] = useState<Record<string, boolean>>({})
  const [documentRejectionReasons, setDocumentRejectionReasons] = useState<Record<string, string>>({})
  const [documentApproveDialogs, setDocumentApproveDialogs] = useState<Record<string, boolean>>({})
  const [documentApprovalNotes, setDocumentApprovalNotes] = useState<Record<string, string>>({})
  const [processingDocuments, setProcessingDocuments] = useState<Record<string, boolean>>({})
  
  // Request re-fill modal state
  const [showRequestRefillDialog, setShowRequestRefillDialog] = useState(false)
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [refillMessage, setRefillMessage] = useState("")
  const [isSubmittingRefill, setIsSubmittingRefill] = useState(false)
  
  // Document selection modal state
  const [showDocumentSelectionDialog, setShowDocumentSelectionDialog] = useState(false)
  const [documentsToSend, setDocumentsToSend] = useState<string[]>([])
  const [isSubmittingDocuments, setIsSubmittingDocuments] = useState(false)
  
  // Available fields for re-fill request
  const availableFields = [
    { key: 'control_person.first_name', label: 'Control Person - First Name' },
    { key: 'control_person.last_name', label: 'Control Person - Last Name' },
    { key: 'control_person.email', label: 'Control Person - Email' },
    { key: 'control_person.birth_date', label: 'Control Person - Birth Date' },
    { key: 'control_person.ssn', label: 'Control Person - SSN' },
    { key: 'control_person.title', label: 'Control Person - Title' },
    { key: 'control_person.ownership_percentage', label: 'Control Person - Ownership Percentage' },
    { key: 'control_person.street_line_1', label: 'Control Person - Street Address' },
    { key: 'control_person.city', label: 'Control Person - City' },
    { key: 'control_person.state', label: 'Control Person - State' },
    { key: 'control_person.postal_code', label: 'Control Person - Postal Code' },
    { key: 'control_person.id_type', label: 'Control Person - ID Type' },
    { key: 'control_person.id_number', label: 'Control Person - ID Number' },
    { key: 'control_person.id_front_image', label: 'Control Person - ID Front Image' },
    { key: 'control_person.id_back_image', label: 'Control Person - ID Back Image' },
    { key: 'business_formation_document', label: 'Business Formation Document' },
    { key: 'business_ownership_document', label: 'Business Ownership Document' },
    { key: 'proof_of_address_document', label: 'Proof of Address Document' },
    { key: 'proof_of_nature_of_business', label: 'Proof of Nature of Business Document' },
    { key: 'business_description', label: 'Business Description' },
    { key: 'business_industry', label: 'Business Industry' },
    { key: 'primary_website', label: 'Primary Website' },
    { key: 'entity_type', label: 'Entity Type' },
    { key: 'source_of_funds', label: 'Source of Funds' },
    { key: 'annual_revenue', label: 'Annual Revenue' },
    { key: 'transaction_volume', label: 'Transaction Volume' },
    { key: 'account_purpose', label: 'Account Purpose' },
    { key: 'high_risk_activities', label: 'High Risk Activities' },
    { key: 'high_risk_geographies', label: 'High Risk Geographies' },
  ]
  
  // Available documents
  const availableDocuments = [
    { key: 'business_formation', label: 'Business Formation Document', required: true },
    { key: 'business_ownership', label: 'Business Ownership Document', required: true },
    { key: 'proof_of_address', label: 'Proof of Address Document', required: false },
    { key: 'determination_letter_501c3', label: '501c3 Determination Letter (Nonprofit)', required: false },
    { key: 'id_front', label: 'ID Front Image', required: true },
    { key: 'id_back', label: 'ID Back Image', required: false },
  ]
  
  // Helper function to parse submission_data (handles both object and JSON string)
  const parseSubmissionData = useCallback(() => {
    let submissionData = submission.submission_data || {}
    // If it's a string, try to parse it
    if (typeof submissionData === 'string') {
      try {
        submissionData = JSON.parse(submissionData)
      } catch (e) {
        console.error('Failed to parse submission_data:', e)
        submissionData = {}
      }
    }
    return submissionData
  }, [submission.submission_data])
  
  // Initialize documents to send from submission data
  useEffect(() => {
    const submissionData = parseSubmissionData()
    if (submissionData.documents_to_send && Array.isArray(submissionData.documents_to_send)) {
      setDocumentsToSend(submissionData.documents_to_send)
    } else {
      // Default to required documents
      const defaultDocs = ['business_formation', 'business_ownership', 'id_front']
      setDocumentsToSend(defaultDocs)
    }
  }, [parseSubmissionData])

  // Load requested fields and refill message from submission data
  useEffect(() => {
    const submissionData = parseSubmissionData()
    if (submissionData.requested_fields && Array.isArray(submissionData.requested_fields)) {
      setSelectedFields(submissionData.requested_fields)
    }
    if (submissionData.refill_message) {
      setRefillMessage(submissionData.refill_message)
    }
  }, [parseSubmissionData])

  // Load requested fields when modal opens (in case submission was reloaded)
  useEffect(() => {
    if (showRequestRefillDialog) {
      const submissionData = parseSubmissionData()
      if (submissionData.requested_fields && Array.isArray(submissionData.requested_fields)) {
        setSelectedFields(submissionData.requested_fields)
      } else {
        setSelectedFields([])
      }
      if (submissionData.refill_message) {
        setRefillMessage(submissionData.refill_message)
      } else {
        setRefillMessage("")
      }
    }
  }, [showRequestRefillDialog, parseSubmissionData])

  const statusInfo = statusConfig[submission.submission_status] || statusConfig.not_started
  // Bridge statuses that are reviewable (not approved, rejected, paused, or offboarded)
  const isReviewable =
    !submission.submission_status || // treat null/empty as not_started
    submission.submission_status === "not_started" ||
    submission.submission_status === "pending" || // Legacy
    submission.submission_status === "in_review" || // Legacy
    submission.submission_status === "submitted" || // Legacy
    submission.submission_status === "incomplete" ||
    submission.submission_status === "under_review" ||
    submission.submission_status === "awaiting_questionnaire" ||
    submission.submission_status === "awaiting_ubo" ||
    submission.submission_status === "needs_more_info" // Internal status

  const reloadSubmission = (only?: string[]) => {
    ;(router as unknown as { reload: (opts?: { preserveScroll?: boolean; only?: string[] }) => void }).reload({
      preserveScroll: true,
      ...(only ? { only } : {}),
    })
  }

  const handleApprove = () => {
    // Check if all documents are approved before allowing main approval
    if (!areAllDocumentsApproved()) {
      showErrorToast("Please approve all required documents before approving the submission")
      return
    }
    setShowApproveDialog(true)
  }

  const handleApproveConfirm = () => {
    setIsProcessing(true)
    router.post(
      route("admin.kyb-verification.approve", submission.id),
      { approval_notes: approveNotes || null },
      {
        preserveScroll: true,
        onSuccess: () => {
          showSuccessToast("KYB submission approved and sent to Bridge successfully")
          setIsProcessing(false)
          setShowApproveDialog(false)
          setApproveNotes("")
          // Refresh page props so status badge updates (pending -> approved)
          reloadSubmission()
        },
        onError: () => {
          showErrorToast("Failed to approve KYB submission")
          setIsProcessing(false)
        },
      }
    )
  }

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      showErrorToast("Please provide a rejection reason")
      return
    }

    setIsProcessing(true)
    router.post(
      route("admin.kyb-verification.reject", submission.id),
      { rejection_reason: rejectionReason },
      {
        preserveScroll: true,
        onSuccess: () => {
          showSuccessToast("KYB submission rejected successfully")
          setShowRejectDialog(false)
          setRejectionReason("")
          setIsProcessing(false)
          // Refresh page props so status badge updates
          reloadSubmission()
        },
        onError: () => {
          showErrorToast("Failed to reject KYB submission")
          setIsProcessing(false)
        },
      }
    )
  }

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    showSuccessToast("Copied to clipboard")
    setTimeout(() => setCopiedField(null), 2000)
  }

  const formatAddress = (address: BusinessAddress | null | undefined) => {
    if (!address) return "N/A"
    const parts = [
      address.street_line_1,
      address.city,
      address.subdivision,
      address.postal_code,
      address.country,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(", ") : "N/A"
  }

  const formatSSN = (ssn: string) => {
    if (!ssn) return "N/A"
    // Show only last 4 digits for security
    return `***-**-${ssn.slice(-4)}`
  }

  // Get document from verification_documents table
  const getVerificationDocument = (documentType: string): VerificationDocument | null => {
    if (!submission.verification_documents) return null
    return submission.verification_documents.find(doc => doc.document_type === documentType) || null
  }

  // Get document status from verification_documents table (fallback to submission_data for backward compatibility)
  const getDocumentStatus = (documentType: string): 'pending' | 'approved' | 'rejected' => {
    const doc = getVerificationDocument(documentType)
    if (doc) return doc.status
    // Fallback to old submission_data for backward compatibility
    const raw = submission.submission_data?.document_statuses?.[documentType]
    return raw === 'approved' || raw === 'rejected' || raw === 'pending' ? raw : 'pending'
  }

  // Get document file path from verification_documents table
  const getDocumentPath = (documentType: string): string | null => {
    const doc = getVerificationDocument(documentType)
    if (doc && doc.file_path) return doc.file_path
    // Fallback to old paths for backward compatibility
    switch (documentType) {
      case 'business_formation':
        return submission.submission_data?.business_formation_document_path || null
      case 'business_ownership':
        return submission.submission_data?.business_ownership_document_path || null
      case 'proof_of_address':
        return submission.submission_data?.proof_of_address_document_path || null
      case 'id_front':
        return submission.id_front_image_path || null
      case 'id_back':
        return submission.id_back_image_path || null
      default:
        return null
    }
  }

  // Get document URL
  const getDocumentUrl = (documentType: string): string | null => {
    const path = getDocumentPath(documentType)
    if (!path) return null
    return `/storage/${path}`
  }

  // Get rejection reason from verification_documents
  const getDocumentRejectionReason = (documentType: string): string | null => {
    const doc = getVerificationDocument(documentType)
    if (doc && doc.rejection_reason) return doc.rejection_reason
    // Fallback to old submission_data
    const raw = submission.submission_data?.document_statuses?.[`${documentType}_rejection_reason`]
    return typeof raw === 'string' ? raw : null
  }

  const handleApproveDocument = (documentType: string) => {
    // Show approval modal instead of confirm
    setDocumentApproveDialogs(prev => ({ ...prev, [documentType]: true }))
  }

  const handleApproveDocumentSubmit = (documentType: string) => {
    const notes = documentApprovalNotes[documentType] || ""

    setProcessingDocuments(prev => ({ ...prev, [documentType]: true }))
    router.post(
      route("admin.kyb-verification.document.approve", { id: submission.id, documentType }),
      { approval_notes: notes },
      {
        preserveScroll: true,
        onSuccess: () => {
          showSuccessToast(`${documentType.replace('_', ' ')} document approved successfully`)
          setDocumentApproveDialogs(prev => ({ ...prev, [documentType]: false }))
          setDocumentApprovalNotes(prev => ({ ...prev, [documentType]: "" }))
          setProcessingDocuments(prev => ({ ...prev, [documentType]: false }))
          // Refresh submission data so statuses update immediately and main approve button can unlock
          reloadSubmission()
        },
        onError: () => {
          showErrorToast(`Failed to approve ${documentType.replace('_', ' ')} document`)
          setProcessingDocuments(prev => ({ ...prev, [documentType]: false }))
        },
      }
    )
  }

  // Check if all required documents are approved
  const areAllDocumentsApproved = () => {
    const requiredDocs = ['business_formation', 'business_ownership', 'id_front']
    // ID back is only required for drivers_license
    if (submission.control_person?.id_type === 'drivers_license') {
      requiredDocs.push('id_back')
    }
    
    return requiredDocs.every(docType => {
      const status = getDocumentStatus(docType)
      return status === 'approved'
    })
  }

  const handleRejectDocument = (documentType: string) => {
    const reason = documentRejectionReasons[documentType] || ""
    if (!reason.trim()) {
      showErrorToast("Please provide a rejection reason")
      return
    }

    setProcessingDocuments(prev => ({ ...prev, [documentType]: true }))
    router.post(
      route("admin.kyb-verification.document.reject", { id: submission.id, documentType }),
      { rejection_reason: reason },
      {
        preserveScroll: true,
        onSuccess: () => {
          showSuccessToast(`${documentType.replace('_', ' ')} document rejected. User will need to re-upload it.`)
          setDocumentRejectDialogs(prev => ({ ...prev, [documentType]: false }))
          setDocumentRejectionReasons(prev => ({ ...prev, [documentType]: "" }))
          setProcessingDocuments(prev => ({ ...prev, [documentType]: false }))
          // Refresh submission data so statuses update immediately
          reloadSubmission()
        },
        onError: () => {
          showErrorToast(`Failed to reject ${documentType.replace('_', ' ')} document`)
          setProcessingDocuments(prev => ({ ...prev, [documentType]: false }))
        },
      }
    )
  }

  const handleRequestRefill = () => {
    if (selectedFields.length === 0) {
      showErrorToast("Please select at least one field to request re-fill")
      return
    }
    setIsSubmittingRefill(true)
    router.post(
      route("admin.kyb-verification.request-refill", submission.id),
      {
        requested_fields: selectedFields,
        message: refillMessage || null,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          showSuccessToast("Re-fill request sent successfully")
          setShowRequestRefillDialog(false)
          setSelectedFields([])
          setRefillMessage("")
          setIsSubmittingRefill(false)
          reloadSubmission()
        },
        onError: () => {
          showErrorToast("Failed to send re-fill request")
          setIsSubmittingRefill(false)
        },
      }
    )
  }

  const handleUpdateDocumentsToSend = () => {
    if (documentsToSend.length === 0) {
      showErrorToast("Please select at least one document to send")
      return
    }
    setIsSubmittingDocuments(true)
    router.post(
      route("admin.kyb-verification.update-documents-to-send", submission.id),
      {
        documents_to_send: documentsToSend,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          showSuccessToast("Documents to send updated successfully")
          setShowDocumentSelectionDialog(false)
          setIsSubmittingDocuments(false)
          reloadSubmission()
        },
        onError: () => {
          showErrorToast("Failed to update documents to send")
          setIsSubmittingDocuments(false)
        },
      }
    )
  }

  const toggleField = (fieldKey: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldKey)
        ? prev.filter(f => f !== fieldKey)
        : [...prev, fieldKey]
    )
  }

  const toggleDocument = (docKey: string) => {
    const doc = availableDocuments.find(d => d.key === docKey)
    if (doc?.required) {
      // Required documents cannot be unchecked
      return
    }
    setDocumentsToSend(prev =>
      prev.includes(docKey)
        ? prev.filter(d => d !== docKey)
        : [...prev, docKey]
    )
  }

  const DocumentStatusBadge = ({ status }: { status: 'pending' | 'approved' | 'rejected' }) => {
    const config = {
      pending: { label: "Pending", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800", icon: <Clock className="h-3 w-3" /> },
      approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800", icon: <CheckCircle className="h-3 w-3" /> },
      rejected: { label: "Rejected", className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800", icon: <XCircle className="h-3 w-3" /> },
    }
    const statusConfig = config[status] || config.pending
    return (
      <Badge className={cn("flex items-center gap-1 px-2 py-0.5 text-xs", statusConfig.className)}>
        {statusConfig.icon}
        {statusConfig.label}
      </Badge>
    )
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`KYB Verification - ${submission.business_name}`} />
      <div className="m-2 sm:m-4 space-y-4 sm:space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4"
        >
          <div className="flex items-start sm:items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <Link href={route("admin.kyb-verification.index")}>
              <Button variant="ghost" size="sm" className="flex-shrink-0">
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-semibold flex items-center gap-2 flex-wrap">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
                <span className="break-words">KYB Verification Details</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Review business verification submission
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Badge className={cn("flex items-center justify-center gap-1 px-3 py-1.5 sm:py-1 text-xs sm:text-sm flex-shrink-0", statusInfo.className)}>
              {statusInfo.icon}
              <span>{statusInfo.label}</span>
              <span className="ml-1 font-mono text-[10px] sm:text-[11px] opacity-80">
                ({submission.submission_status || "not_started"})
              </span>
            </Badge>
            {isReviewable && (
              <div className="flex gap-2 flex-wrap">
                <div className="flex gap-2 flex-1 sm:flex-initial">
                  <Button
                    onClick={handleApprove}
                    disabled={isProcessing || !areAllDocumentsApproved()}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-xs sm:text-sm flex-1 sm:flex-initial"
                    title={!areAllDocumentsApproved() ? "Please approve all required documents first" : ""}
                    size="sm"
                  >
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Approve & Send to Bridge</span>
                    <span className="sm:hidden">Approve</span>
                  </Button>
                  <Button
                    onClick={() => setShowRejectDialog(true)}
                    disabled={isProcessing}
                    variant="destructive"
                    className="text-xs sm:text-sm flex-1 sm:flex-initial"
                    size="sm"
                  >
                    <XCircle className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                    Reject
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowRequestRefillDialog(true)}
                  disabled={isProcessing}
                  className="text-xs sm:text-sm"
                  size="sm"
                >
                  <User className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Request Re-fill</span>
                  <span className="sm:hidden">Re-fill</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDocumentSelectionDialog(true)}
                  disabled={isProcessing}
                  className="text-xs sm:text-sm"
                  size="sm"
                >
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Select Documents</span>
                  <span className="sm:hidden">Docs</span>
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Rejection Reason Display */}
        {submission.submission_status === "rejected" && submission.submission_data?.rejection_reason && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4"
          >
            <div className="flex items-start gap-2 sm:gap-3">
              <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-red-900 dark:text-red-100 mb-1">Rejection Reason</h3>
                <p className="text-xs sm:text-sm text-red-800 dark:text-red-200 break-words">
                  {submission.submission_data.rejection_reason}
                </p>
                {submission.submission_data.rejected_at && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    Rejected on {format(new Date(submission.submission_data.rejected_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Business Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Building className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                      <span>Business Information</span>
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Business details submitted for verification</CardDescription>
                  </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Business Name</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="font-medium text-sm sm:text-base break-words">{submission.business_name || "N/A"}</p>
                        {submission.business_name && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopy(submission.business_name, "business_name")}
                          >
                            {copiedField === "business_name" ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Business Email</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{submission.business_email || "N/A"}</p>
                        {submission.business_email && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopy(submission.business_email, "business_email")}
                          >
                            {copiedField === "business_email" ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">EIN (Employer Identification Number)</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium font-mono">{submission.ein || "N/A"}</p>
                        {submission.ein && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopy(submission.ein, "ein")}
                          >
                            {copiedField === "ein" ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Bridge Customer ID</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium font-mono text-xs">
                          {submission.bridge_customer_id || "N/A"}
                        </p>
                        {submission.bridge_customer_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopy(submission.bridge_customer_id!, "bridge_customer_id")}
                          >
                            {copiedField === "bridge_customer_id" ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs text-muted-foreground">Registered Address</Label>
                    <div className="flex items-start gap-2 mt-1">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                      <p className="font-medium">
                        {formatAddress(submission.registered_address || submission.business_address)}
                      </p>
                    </div>
                  </div>
                  {submission.submission_data?.physical_address && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground">Principal Operating Address</Label>
                        <div className="flex items-start gap-2 mt-1">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                          <p className="font-medium">{formatAddress(submission.submission_data.physical_address)}</p>
                        </div>
                      </div>
                    </>
                  )}
                  {submission.submission_data?.entity_type && (
                    <>
                      <Separator />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Entity Type</Label>
                          <p className="font-medium mt-1 capitalize">
                            {submission.submission_data.entity_type.replace('_', ' ') || "N/A"}
                          </p>
                        </div>
                        {submission.submission_data.dao_status !== undefined && (
                          <div>
                            <Label className="text-xs text-muted-foreground">DAO Status</Label>
                            <p className="font-medium mt-1">
                              {submission.submission_data.dao_status ? "Yes" : "No"}
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  {submission.submission_data?.business_description && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground">Business Description</Label>
                        <p className="font-medium mt-1">{submission.submission_data.business_description}</p>
                      </div>
                    </>
                  )}
                  {submission.submission_data?.primary_website && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground">Primary Website</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <a
                            href={submission.submission_data.primary_website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline"
                          >
                            {submission.submission_data.primary_website}
                          </a>
                        </div>
                      </div>
                    </>
                  )}
                  {submission.submission_data?.business_industry && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground">Business Industry</Label>
                        <p className="font-medium mt-1">{submission.submission_data.business_industry}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Enhanced KYB Information */}
            {(submission.submission_data?.source_of_funds ||
              submission.submission_data?.annual_revenue ||
              submission.submission_data?.transaction_volume ||
              submission.submission_data?.account_purpose ||
              submission.submission_data?.high_risk_activities ||
              submission.submission_data?.high_risk_geographies) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                      <span>Enhanced KYB Information</span>
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Additional business and risk information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {submission.submission_data?.source_of_funds && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Source of Funds</Label>
                          <p className="font-medium mt-1 capitalize">
                            {submission.submission_data.source_of_funds.replace('_', ' ')}
                          </p>
                        </div>
                      )}
                      {submission.submission_data?.annual_revenue && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Estimated Annual Revenue</Label>
                          <p className="font-medium mt-1">
                            {submission.submission_data.annual_revenue.includes('+')
                              ? `$${submission.submission_data.annual_revenue}`
                              : `$${submission.submission_data.annual_revenue.replace('-', ' - $')}`}
                          </p>
                        </div>
                      )}
                      {submission.submission_data?.transaction_volume && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Expected Monthly Transaction Volume</Label>
                          <p className="font-medium mt-1">
                            ${parseFloat(submission.submission_data.transaction_volume).toLocaleString()} USD
                          </p>
                        </div>
                      )}
                      {submission.submission_data?.account_purpose && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Primary Account Purpose</Label>
                          <p className="font-medium mt-1 capitalize">
                            {submission.submission_data.account_purpose.replace('_', ' ')}
                          </p>
                        </div>
                      )}
                    </div>
                    {submission.submission_data?.high_risk_activities && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">High Risk Activities</Label>
                          <p className="font-medium mt-1">{submission.submission_data.high_risk_activities}</p>
                        </div>
                      </>
                    )}
                    {submission.submission_data?.high_risk_geographies && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">High Risk Geographies</Label>
                          <p className="font-medium mt-1">{submission.submission_data.high_risk_geographies}</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Business Documents */}
            {(getDocumentPath('business_formation') ||
              getDocumentPath('business_ownership') ||
              getDocumentPath('proof_of_address')) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                      <span>Business Documents</span>
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Uploaded business formation and ownership documents</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                    {getDocumentPath('business_formation') && (
                      <div className="p-2 sm:p-3 border border-border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs text-muted-foreground">
                            Business Formation Document
                          </Label>
                          <DocumentStatusBadge status={getDocumentStatus('business_formation')} />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <a
                              href={getDocumentUrl('business_formation') || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-xs sm:text-sm truncate"
                            >
                              View Document
                            </a>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 flex-shrink-0"
                              onClick={() => {
                                const url = getDocumentUrl('business_formation')
                                if (url) window.open(url, '_blank')
                              }}
                            >
                              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedDocument({
                                  id: 'business-formation',
                                  type: 'business_formation',
                                  name: 'Business Formation Document',
                                  url: getDocumentUrl('business_formation') || '',
                                  status: getDocumentStatus('business_formation'),
                                  verified: getDocumentStatus('business_formation') === 'approved',
                                  rejectionReason: getDocumentRejectionReason('business_formation') || undefined,
                                })
                                setIsDocumentViewerOpen(true)
                              }}
                              className="text-xs h-7"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Advanced Analysis</span>
                              <span className="sm:hidden">Analysis</span>
                            </Button>
                          </div>
                        </div>
                        {getDocumentStatus('business_formation') === 'rejected' && getDocumentRejectionReason('business_formation') && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-200">
                            <strong>Rejection Reason:</strong> {getDocumentRejectionReason('business_formation')}
                          </div>
                        )}
                        {isReviewable && (
                          <div className="flex flex-col sm:flex-row gap-2 mt-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveDocument('business_formation')}
                              disabled={processingDocuments.business_formation}
                              className="bg-emerald-600 hover:bg-emerald-700 text-xs h-7 w-full sm:w-auto"
                            >
                              {processingDocuments.business_formation ? 'Approving...' : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDocumentRejectDialogs(prev => ({ ...prev, business_formation: true }))}
                              disabled={processingDocuments.business_formation}
                              className="text-xs h-7 w-full sm:w-auto"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    {getDocumentPath('business_ownership') && (
                      <div className="p-3 border border-border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs text-muted-foreground">
                            Business Ownership Document
                          </Label>
                          <DocumentStatusBadge status={getDocumentStatus('business_ownership')} />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <a
                              href={getDocumentUrl('business_ownership') || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-xs sm:text-sm truncate"
                            >
                              View Document
                            </a>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 flex-shrink-0"
                              onClick={() => {
                                const url = getDocumentUrl('business_ownership')
                                if (url) window.open(url, '_blank')
                              }}
                            >
                              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedDocument({
                                  id: 'business-ownership',
                                  type: 'business_ownership',
                                  name: 'Business Ownership Document',
                                  url: getDocumentUrl('business_ownership') || '',
                                  status: getDocumentStatus('business_ownership'),
                                  verified: getDocumentStatus('business_ownership') === 'approved',
                                  rejectionReason: getDocumentRejectionReason('business_ownership') || undefined,
                                })
                                setIsDocumentViewerOpen(true)
                              }}
                              className="text-xs h-7"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Advanced Analysis</span>
                              <span className="sm:hidden">Analysis</span>
                            </Button>
                          </div>
                        </div>
                        {getDocumentStatus('business_ownership') === 'rejected' && getDocumentRejectionReason('business_ownership') && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-200">
                            <strong>Rejection Reason:</strong> {getDocumentRejectionReason('business_ownership')}
                          </div>
                        )}
                        {isReviewable && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveDocument('business_ownership')}
                              disabled={processingDocuments.business_ownership}
                              className="bg-emerald-600 hover:bg-emerald-700 text-xs h-7"
                            >
                              {processingDocuments.business_ownership ? 'Approving...' : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDocumentRejectDialogs(prev => ({ ...prev, business_ownership: true }))}
                              disabled={processingDocuments.business_ownership}
                              className="text-xs h-7"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    {getDocumentPath('proof_of_address') && (
                      <div className="p-3 border border-border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs text-muted-foreground">
                            Proof of Address Document
                          </Label>
                          <DocumentStatusBadge status={getDocumentStatus('proof_of_address')} />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <a
                              href={getDocumentUrl('proof_of_address') || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-xs sm:text-sm truncate"
                            >
                              View Document
                            </a>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 flex-shrink-0"
                              onClick={() => {
                                const url = getDocumentUrl('proof_of_address')
                                if (url) window.open(url, '_blank')
                              }}
                            >
                              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedDocument({
                                  id: 'proof-of-address',
                                  type: 'proof_of_address',
                                  name: 'Proof of Address Document',
                                  url: getDocumentUrl('proof_of_address') || '',
                                  status: getDocumentStatus('proof_of_address'),
                                  verified: getDocumentStatus('proof_of_address') === 'approved',
                                  rejectionReason: getDocumentRejectionReason('proof_of_address') || undefined,
                                })
                                setIsDocumentViewerOpen(true)
                              }}
                              className="text-xs h-7"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Advanced Analysis</span>
                              <span className="sm:hidden">Analysis</span>
                            </Button>
                          </div>
                        </div>
                        {getDocumentStatus('proof_of_address') === 'rejected' && getDocumentRejectionReason('proof_of_address') && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-200">
                            <strong>Rejection Reason:</strong> {getDocumentRejectionReason('proof_of_address')}
                          </div>
                        )}
                        {isReviewable && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveDocument('proof_of_address')}
                              disabled={processingDocuments.proof_of_address}
                              className="bg-emerald-600 hover:bg-emerald-700 text-xs h-7"
                            >
                              {processingDocuments.proof_of_address ? 'Approving...' : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDocumentRejectDialogs(prev => ({ ...prev, proof_of_address: true }))}
                              disabled={processingDocuments.proof_of_address}
                              className="text-xs h-7"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    {getDocumentPath('determination_letter_501c3') && (
                      <div className="p-3 border border-border rounded-lg bg-blue-50 dark:bg-blue-900/10">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs text-muted-foreground">
                            501c3 Determination Letter
                            <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Internal Use Only)</span>
                          </Label>
                          <DocumentStatusBadge status={getDocumentStatus('determination_letter_501c3')} />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <a
                              href={getDocumentUrl('determination_letter_501c3') || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-xs sm:text-sm truncate"
                            >
                              View Document
                            </a>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 flex-shrink-0"
                              onClick={() => {
                                const url = getDocumentUrl('determination_letter_501c3')
                                if (url) window.open(url, '_blank')
                              }}
                            >
                              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedDocument({
                                  id: 'determination-letter-501c3',
                                  type: 'determination_letter_501c3',
                                  name: '501c3 Determination Letter',
                                  url: getDocumentUrl('determination_letter_501c3') || '',
                                  status: getDocumentStatus('determination_letter_501c3'),
                                  verified: false,
                                })
                                setIsDocumentViewerOpen(true)
                              }}
                              className="text-xs h-7"
                            >
                              View
                            </Button>
                          </div>
                        </div>
                        {getDocumentStatus('determination_letter_501c3') === 'pending' && (
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDocumentApproveDialogs(prev => ({ ...prev, determination_letter_501c3: true }))
                              }}
                              disabled={processingDocuments.determination_letter_501c3}
                              className="text-xs h-7"
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDocumentRejectDialogs(prev => ({ ...prev, determination_letter_501c3: true }))
                              }}
                              disabled={processingDocuments.determination_letter_501c3}
                              className="text-xs h-7"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Control Person Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                      <span className="break-words">Control Person (Beneficial Owner)</span>
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Primary control person information</CardDescription>
                  </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">First Name</Label>
                      <p className="font-medium mt-1">{submission.control_person?.first_name || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Last Name</Label>
                      <p className="font-medium mt-1">{submission.control_person?.last_name || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{submission.control_person?.email || "N/A"}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">
                          {submission.control_person?.birth_date
                            ? format(new Date(submission.control_person.birth_date), "MMM d, yyyy")
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">SSN</Label>
                      <p className="font-medium font-mono mt-1">
                        {submission.control_person?.ssn ? formatSSN(submission.control_person.ssn) : "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Title</Label>
                      <p className="font-medium mt-1">{submission.control_person?.title || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Ownership Percentage</Label>
                      <p className="font-medium mt-1">
                        {submission.control_person?.ownership_percentage
                          ? `${submission.control_person.ownership_percentage}%`
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">ID Type</Label>
                      <p className="font-medium mt-1 capitalize">
                        {submission.control_person?.id_type?.replace("_", " ") || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">ID Number</Label>
                      <p className="font-medium font-mono mt-1">
                        {submission.control_person?.id_number || "N/A"}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs text-muted-foreground">Control Person Address</Label>
                    <div className="flex items-start gap-2 mt-1">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                      <p className="font-medium">
                        {submission.control_person
                          ? [
                              submission.control_person.street_line_1,
                              submission.control_person.city,
                              submission.control_person.state,
                              submission.control_person.postal_code,
                              submission.control_person.country,
                            ]
                              .filter(Boolean)
                              .join(", ") || "N/A"
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* ID Documents */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                      <span>Identity Documents</span>
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Control person identification documents</CardDescription>
                  </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className={`grid gap-3 sm:gap-4 ${submission.control_person?.id_type === 'passport' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                    {/* Front ID Image */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">
                          {submission.control_person?.id_type === 'passport' ? 'Passport Image' : 'ID Front Image'}
                        </Label>
                        <DocumentStatusBadge status={getDocumentStatus('id_front')} />
                      </div>
                      {(getDocumentUrl('id_front') || submission.id_front_image_url) ? (
                        <div className="relative group">
                          <img
                            src={getDocumentUrl('id_front') || submission.id_front_image_url || ''}
                            alt="ID Front"
                            className="w-full h-auto rounded-lg border border-border object-contain max-h-64 cursor-pointer"
                            onClick={() => {
                              setSelectedDocument({
                                id: 'id-front',
                                type: 'id_front',
                                name: 'ID Front',
                                url: getDocumentUrl('id_front') || submission.id_front_image_url || '',
                                status: getDocumentStatus('id_front'),
                                verified: getDocumentStatus('id_front') === 'approved',
                                rejectionReason: getDocumentRejectionReason('id_front') || undefined,
                              })
                              setIsDocumentViewerOpen(true)
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="p-2 bg-white rounded-full shadow-lg hover:bg-white/90"
                              onClick={() => {
                                setSelectedDocument({
                                  id: 'id-front',
                                  type: 'id_front',
                                  name: 'ID Front',
                                  url: getDocumentUrl('id_front') || submission.id_front_image_url || '',
                                  status: getDocumentStatus('id_front'),
                                  verified: getDocumentStatus('id_front') === 'approved',
                                  rejectionReason: getDocumentRejectionReason('id_front') || undefined,
                                })
                                setIsDocumentViewerOpen(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-dashed border-border rounded-lg p-8 text-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No image available</p>
                        </div>
                      )}
                      {getDocumentStatus('id_front') === 'rejected' && getDocumentRejectionReason('id_front') && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-200">
                          <strong>Rejection Reason:</strong> {getDocumentRejectionReason('id_front')}
                        </div>
                      )}
                      {isReviewable && (getDocumentUrl('id_front') || submission.id_front_image_url) && (
                        <div className="flex flex-col sm:flex-row gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveDocument('id_front')}
                            disabled={processingDocuments.id_front}
                            className="bg-emerald-600 hover:bg-emerald-700 text-xs h-7 w-full sm:w-auto"
                          >
                            {processingDocuments.id_front ? 'Approving...' : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDocumentRejectDialogs(prev => ({ ...prev, id_front: true }))}
                            disabled={processingDocuments.id_front}
                            className="text-xs h-7 w-full sm:w-auto"
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Back ID Image - Only show for Driver's License */}
                    {submission.control_person?.id_type === 'drivers_license' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">ID Back Image</Label>
                          <DocumentStatusBadge status={getDocumentStatus('id_back')} />
                        </div>
                        {(getDocumentUrl('id_back') || submission.id_back_image_url) ? (
                        <div className="relative group">
                          <img
                            src={getDocumentUrl('id_back') || submission.id_back_image_url || ''}
                            alt="ID Back"
                            className="w-full h-auto rounded-lg border border-border object-contain max-h-64 cursor-pointer"
                            onClick={() => {
                              setSelectedDocument({
                                id: 'id-back',
                                type: 'id_back',
                                name: 'ID Back',
                                url: getDocumentUrl('id_back') || submission.id_back_image_url || '',
                                status: getDocumentStatus('id_back'),
                                verified: getDocumentStatus('id_back') === 'approved',
                                rejectionReason: getDocumentRejectionReason('id_back') || undefined,
                              })
                              setIsDocumentViewerOpen(true)
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="p-2 bg-white rounded-full shadow-lg hover:bg-white/90"
                              onClick={() => {
                                setSelectedDocument({
                                  id: 'id-back',
                                  type: 'id_back',
                                  name: 'ID Back',
                                  url: getDocumentUrl('id_back') || submission.id_back_image_url || '',
                                  status: getDocumentStatus('id_back'),
                                  verified: getDocumentStatus('id_back') === 'approved',
                                  rejectionReason: getDocumentRejectionReason('id_back') || undefined,
                                })
                                setIsDocumentViewerOpen(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-dashed border-border rounded-lg p-8 text-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No image available</p>
                        </div>
                      )}
                      {getDocumentStatus('id_back') === 'rejected' && getDocumentRejectionReason('id_back') && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-200">
                          <strong>Rejection Reason:</strong> {getDocumentRejectionReason('id_back')}
                        </div>
                      )}
                      {isReviewable && (getDocumentUrl('id_back') || submission.id_back_image_url) && (
                        <div className="flex flex-col sm:flex-row gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveDocument('id_back')}
                            disabled={processingDocuments.id_back}
                            className="bg-emerald-600 hover:bg-emerald-700 text-xs h-7 w-full sm:w-auto"
                          >
                            {processingDocuments.id_back ? 'Approving...' : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDocumentRejectDialogs(prev => ({ ...prev, id_back: true }))}
                            disabled={processingDocuments.id_back}
                            className="text-xs h-7 w-full sm:w-auto"
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Submission Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-sm sm:text-base">Submission Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-4 sm:p-6">
                  <div>
                    <Label className="text-xs text-muted-foreground">Submission ID</Label>
                    <p className="font-mono text-sm mt-1">#{submission.id}</p>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs text-muted-foreground">Submitted</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">
                        {format(new Date(submission.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Last Updated</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">
                        {format(new Date(submission.updated_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Organization/User Info */}
            {(submission.bridge_integration?.organization || submission.bridge_integration?.user) && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-sm sm:text-base">Associated Account</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-4 sm:p-6">
                    {submission.bridge_integration.organization && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Organization</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium text-sm">
                            {submission.bridge_integration.organization.name}
                          </p>
                        </div>
                      </div>
                    )}
                    {submission.bridge_integration.user && (
                      <div>
                        <Label className="text-xs text-muted-foreground">User</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">
                              {submission.bridge_integration.user.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {submission.bridge_integration.user.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>

        {/* Approve & Send Dialog */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                Approve & Send to Bridge
              </DialogTitle>
              <DialogDescription>
                This will approve the submission and send all verified business data + documents to Bridge.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {!areAllDocumentsApproved() && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-sm text-amber-900 dark:text-amber-100">
                  Please approve all required documents first.
                </div>
              )}
              <div>
                <Label htmlFor="approve_notes">Approval Notes (Optional)</Label>
                <Textarea
                  id="approve_notes"
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  placeholder="Add optional notes about this approval..."
                  className="mt-2"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowApproveDialog(false)
                  setApproveNotes("")
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleApproveConfirm}
                disabled={isProcessing || !areAllDocumentsApproved()}
              >
                {isProcessing ? "Sending..." : "Confirm & Send"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject KYB Submission</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this KYB submission. This will be visible to the organization.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rejection_reason">Rejection Reason *</Label>
                <Textarea
                  id="rejection_reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter the reason for rejection..."
                  className="mt-2"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectionReason.trim() || isProcessing}
              >
                {isProcessing ? "Rejecting..." : "Reject Submission"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Document Approval Dialogs */}
        {(['business_formation', 'business_ownership', 'proof_of_address', 'determination_letter_501c3', 'id_front', 'id_back'] as const).map((docType) => (
          <Dialog key={`approve-${docType}`} open={documentApproveDialogs[docType] || false} onOpenChange={(open) => setDocumentApproveDialogs(prev => ({ ...prev, [docType]: open }))}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  Approve {docType.replace('_', ' ')} Document
                </DialogTitle>
                <DialogDescription>
                  Approve this document. You can optionally add notes for your records.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor={`approval_notes_${docType}`}>Approval Notes (Optional)</Label>
                  <Textarea
                    id={`approval_notes_${docType}`}
                    value={documentApprovalNotes[docType] || ""}
                    onChange={(e) => setDocumentApprovalNotes(prev => ({ ...prev, [docType]: e.target.value }))}
                    placeholder="Add any notes about this approval (optional)..."
                    className="mt-2"
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setDocumentApproveDialogs(prev => ({ ...prev, [docType]: false }))
                  setDocumentApprovalNotes(prev => ({ ...prev, [docType]: "" }))
                }}>
                  Cancel
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleApproveDocumentSubmit(docType)}
                  disabled={processingDocuments[docType]}
                >
                  {processingDocuments[docType] ? "Approving..." : "Approve Document"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ))}

        {/* Document Rejection Dialogs */}
        {(['business_formation', 'business_ownership', 'proof_of_address', 'determination_letter_501c3', 'id_front', 'id_back'] as const).map((docType) => (
          <Dialog key={`reject-${docType}`} open={documentRejectDialogs[docType] || false} onOpenChange={(open) => setDocumentRejectDialogs(prev => ({ ...prev, [docType]: open }))}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject {docType.replace('_', ' ')} Document</DialogTitle>
                <DialogDescription>
                  Please provide a reason for rejecting this document. The user will need to re-upload it.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor={`rejection_reason_${docType}`}>Rejection Reason *</Label>
                  <Textarea
                    id={`rejection_reason_${docType}`}
                    value={documentRejectionReasons[docType] || ""}
                    onChange={(e) => setDocumentRejectionReasons(prev => ({ ...prev, [docType]: e.target.value }))}
                    placeholder="Enter the reason for rejection..."
                    className="mt-2"
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setDocumentRejectDialogs(prev => ({ ...prev, [docType]: false }))
                  setDocumentRejectionReasons(prev => ({ ...prev, [docType]: "" }))
                }}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleRejectDocument(docType)}
                  disabled={!documentRejectionReasons[docType]?.trim() || processingDocuments[docType]}
                >
                  {processingDocuments[docType] ? "Rejecting..." : "Reject Document"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ))}

        {/* Document Viewer */}
        {selectedDocument && (
          <KybDocumentViewer
            isOpen={isDocumentViewerOpen}
            onClose={() => {
              setIsDocumentViewerOpen(false)
              setSelectedDocument(null)
            }}
            document={selectedDocument}
            businessInfo={submission ? {
              id: submission.id,
              business_name: submission.business_name,
              business_email: submission.business_email,
              ein: submission.ein,
              business_address: submission.business_address,
              bridge_customer_id: submission.bridge_customer_id || undefined,
              submission_status: submission.submission_status,
              submittedAt: submission.created_at,
              reviewedAt: submission.submission_data?.approved_at || submission.submission_data?.rejected_at,
              reviewedBy: submission.submission_data?.approved_by?.toString() || submission.submission_data?.rejected_by?.toString(),
              rejectionReason: submission.submission_data?.rejection_reason,
              approvalNotes: submission.submission_data?.approval_notes,
            } : undefined}
            controlPerson={submission.control_person ? {
              first_name: submission.control_person.first_name,
              last_name: submission.control_person.last_name,
              email: submission.control_person.email,
              birth_date: submission.control_person.birth_date,
              ssn: submission.control_person.ssn,
              title: submission.control_person.title,
              ownership_percentage: submission.control_person.ownership_percentage,
              street_line_1: submission.control_person.street_line_1,
              city: submission.control_person.city,
              state: submission.control_person.state,
              postal_code: submission.control_person.postal_code,
              country: submission.control_person.country,
              id_type: submission.control_person.id_type,
              id_number: submission.control_person.id_number,
            } : undefined}
            allDocuments={[
              getDocumentPath('business_formation') ? {
                id: 'business-formation',
                type: 'business_formation',
                name: 'Business Formation Document',
                url: getDocumentUrl('business_formation') || '',
                status: getDocumentStatus('business_formation'),
                verified: getDocumentStatus('business_formation') === 'approved',
                rejectionReason: getDocumentRejectionReason('business_formation') || undefined,
              } : null,
              getDocumentPath('business_ownership') ? {
                id: 'business-ownership',
                type: 'business_ownership',
                name: 'Business Ownership Document',
                url: getDocumentUrl('business_ownership') || '',
                status: getDocumentStatus('business_ownership'),
                verified: getDocumentStatus('business_ownership') === 'approved',
                rejectionReason: getDocumentRejectionReason('business_ownership') || undefined,
              } : null,
              getDocumentPath('proof_of_address') ? {
                id: 'proof-of-address',
                type: 'proof_of_address',
                name: 'Proof of Address Document',
                url: getDocumentUrl('proof_of_address') || '',
                status: getDocumentStatus('proof_of_address'),
                verified: getDocumentStatus('proof_of_address') === 'approved',
                rejectionReason: getDocumentRejectionReason('proof_of_address') || undefined,
              } : null,
              (getDocumentUrl('id_front') || submission.id_front_image_url) ? {
                id: 'id-front',
                type: 'id_front',
                name: submission.control_person?.id_type === 'passport' ? 'Passport Image' : 'ID Front',
                url: getDocumentUrl('id_front') || submission.id_front_image_url || '',
                status: getDocumentStatus('id_front'),
                verified: getDocumentStatus('id_front') === 'approved',
                rejectionReason: getDocumentRejectionReason('id_front') || undefined,
              } : null,
              (getDocumentUrl('id_back') || submission.id_back_image_url) && submission.control_person?.id_type === 'drivers_license' ? {
                id: 'id-back',
                type: 'id_back',
                name: 'ID Back',
                url: getDocumentUrl('id_back') || submission.id_back_image_url || '',
                status: getDocumentStatus('id_back'),
                verified: getDocumentStatus('id_back') === 'approved',
                rejectionReason: getDocumentRejectionReason('id_back') || undefined,
              } : null,
            ].filter(Boolean) as SelectedDocument[]}
            onDocumentAction={() => {
              // Refresh the page to get updated document statuses
              reloadSubmission(['submission'])
            }}
          />
        )}

        {/* Request Re-fill Dialog */}
        <Dialog open={showRequestRefillDialog} onOpenChange={setShowRequestRefillDialog}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Request Re-fill of Fields</DialogTitle>
              <DialogDescription>
                Select which fields need to be re-filled by the user. Only selected fields will be visible in the wallet popup.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {availableFields.map((field) => (
                  <div key={field.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`field-${field.key}`}
                      checked={selectedFields.includes(field.key)}
                      onCheckedChange={() => toggleField(field.key)}
                    />
                    <Label
                      htmlFor={`field-${field.key}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
              <div>
                <Label htmlFor="refill_message">Message (Optional)</Label>
                <Textarea
                  id="refill_message"
                  value={refillMessage}
                  onChange={(e) => setRefillMessage(e.target.value)}
                  placeholder="Add a message explaining what needs to be re-filled..."
                  className="mt-2"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRequestRefillDialog(false)
                  setSelectedFields([])
                  setRefillMessage("")
                }}
                disabled={isSubmittingRefill}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRequestRefill}
                disabled={isSubmittingRefill || selectedFields.length === 0}
              >
                {isSubmittingRefill ? "Sending..." : "Request Re-fill"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Document Selection Dialog */}
        <Dialog open={showDocumentSelectionDialog} onOpenChange={setShowDocumentSelectionDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Select Documents to Send to Bridge</DialogTitle>
              <DialogDescription>
                Select which documents should be sent to Bridge when approving this submission. Required documents are pre-selected and cannot be unchecked.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                {availableDocuments.map((doc) => (
                  <div key={doc.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`doc-${doc.key}`}
                      checked={documentsToSend.includes(doc.key)}
                      onCheckedChange={() => toggleDocument(doc.key)}
                      disabled={doc.required}
                    />
                    <Label
                      htmlFor={`doc-${doc.key}`}
                      className={cn(
                        "text-sm font-normal cursor-pointer",
                        doc.required && "text-muted-foreground"
                      )}
                    >
                      {doc.label}
                      {doc.required && (
                        <span className="ml-1 text-xs text-red-600">(Required)</span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDocumentSelectionDialog(false)}
                disabled={isSubmittingDocuments}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateDocumentsToSend}
                disabled={isSubmittingDocuments || documentsToSend.length === 0}
              >
                {isSubmittingDocuments ? "Updating..." : "Update Documents"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}

