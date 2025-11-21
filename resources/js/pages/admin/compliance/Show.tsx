"use client"

import React, { useState } from "react"
import { Link, router, usePage } from "@inertiajs/react"
import { Head } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import {
  ArrowLeft,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileText,
  Mail,
  Phone,
  AlertCircle,
  XCircle,
  CheckCircle,
  Trash2,
  Edit,
  Copy,
  Check,
  ClipboardList,
} from "lucide-react"
import type { BreadcrumbItem } from "@/types"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Compliance Applications", href: "/admin/compliance" },
  { title: "Application Details", href: "#" },
]

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  pending_payment: {
    label: "Pending Payment",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    icon: <Clock className="h-4 w-4" />,
  },
  awaiting_review: {
    label: "Awaiting Review",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    icon: <Clock className="h-4 w-4" />,
  },
  needs_more_info: {
    label: "Needs More Info",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    icon: <AlertCircle className="h-4 w-4" />,
  },
  approved: {
    label: "Approved",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  declined: {
    label: "Declined",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    icon: <XCircle className="h-4 w-4" />,
  },
}

const paymentStatusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  paid: {
    label: "Paid",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  refunded: {
    label: "Refunded",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    icon: <ArrowLeft className="h-3.5 w-3.5" />,
  },
}

const organizationStatusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  approved: {
    label: "Approved",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  inactive: {
    label: "Inactive",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
}

const formatCurrency = (amount: number | string | null | undefined) => {
  if (!amount) return "$0.00"
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount))
}

interface DocumentInfo {
  name: string
  url: string | null
}

interface ApplicationProps {
  application: {
    id: number
    application_number: string
    status: string
    payment_status: string
    assistance_types: string[]
    description: string | null
    amount: number
    currency: string
    documents: DocumentInfo[]
    submitted_at: string | null
    organization: {
      id: number
      name: string
      registration_status: string | null
      is_compliance_locked: boolean
    }
    contact: {
      name: string | null
      email: string | null
      phone: string | null
    }
    meta: Record<string, any> | null
  }
}

export default function AdminComplianceShow({ application }: ApplicationProps) {
  const { flash } = usePage().props as { flash?: Record<string, string> }
  const [showRequestInfoModal, setShowRequestInfoModal] = useState(false)
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditFeeModal, setShowEditFeeModal] = useState(false)
  const [requestInfoMessage, setRequestInfoMessage] = useState("")
  const [declineMessage, setDeclineMessage] = useState("")
  const [feeAmount, setFeeAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdatingFee, setIsUpdatingFee] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  React.useEffect(() => {
    if (flash?.success) {
      showSuccessToast(flash.success)
    }
  }, [flash])

  const handleCopy = async (text: string, fieldName: string) => {
    if (!text || text === "—" || text === "N/A") return
    
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      showSuccessToast("Copied to clipboard!")
      setTimeout(() => {
        setCopiedField(null)
      }, 2000)
    } catch (err) {
      showErrorToast("Failed to copy to clipboard")
    }
  }

  const CopyButton = ({ text, fieldName, className = "" }: { text: string | null | undefined; fieldName: string; className?: string }) => {
    if (!text || text === "—" || text === "N/A") return null
    
    const isCopied = copiedField === fieldName
    
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleCopy(text, fieldName)}
        className={cn("h-6 w-6 p-0", className)}
        title="Copy to clipboard"
      >
        {isCopied ? (
          <Check className="h-3.5 w-3.5 text-green-600" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    )
  }

  const handleRequestInfo = () => {
    setShowRequestInfoModal(true)
  }

  const handleDecline = () => {
    setShowDeclineModal(true)
  }

  const submitRequestInfo = () => {
    if (!requestInfoMessage.trim()) {
      showErrorToast("Please provide a message describing what information is needed")
      return
    }

    setIsSubmitting(true)
    router.patch(route("admin.compliance.update", application.id), { 
      status: "needs_more_info", 
      message: requestInfoMessage 
    }, {
      preserveScroll: true,
      onSuccess: () => {
        showSuccessToast("Application marked as needing more info successfully")
        setShowRequestInfoModal(false)
        setRequestInfoMessage("")
        setIsSubmitting(false)
      },
      onError: () => {
        showErrorToast("Failed to update application status")
        setIsSubmitting(false)
      }
    })
  }

  const submitDecline = () => {
    if (!declineMessage.trim()) {
      showErrorToast("Please provide a reason for declining the application")
      return
    }

    setIsSubmitting(true)
    router.patch(route("admin.compliance.update", application.id), { 
      status: "declined", 
      message: declineMessage 
    }, {
      preserveScroll: true,
      onSuccess: () => {
        showSuccessToast("Application declined successfully")
        setShowDeclineModal(false)
        setDeclineMessage("")
        setIsSubmitting(false)
      },
      onError: () => {
        showErrorToast("Failed to update application status")
        setIsSubmitting(false)
      }
    })
  }

  const handleApprove = () => {
    setIsSubmitting(true)
    router.patch(route("admin.compliance.update", application.id), { 
      status: "approved" 
    }, {
      preserveScroll: true,
      onSuccess: () => {
        showSuccessToast("Application approved successfully")
        setIsSubmitting(false)
      },
      onError: () => {
        showErrorToast("Failed to update application status")
        setIsSubmitting(false)
      }
    })
  }

  const handleDeleteClick = () => {
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = () => {
    setIsDeleting(true)
    router.delete(route("admin.compliance.destroy", application.id), {
      preserveScroll: false,
      onSuccess: () => {
        router.visit(route("admin.compliance.index"))
      },
      onError: () => {
        setIsDeleting(false)
      },
    })
  }

  const handleUpdateFee = () => {
    if (!feeAmount || isNaN(Number(feeAmount)) || Number(feeAmount) <= 0) {
      showErrorToast("Please enter a valid fee amount")
      return
    }

    setIsUpdatingFee(true)
    router.patch(route("admin.compliance.update", application.id), {
      amount: Number(feeAmount)
    }, {
      preserveScroll: true,
      onSuccess: () => {
        showSuccessToast("Application fee updated successfully")
        setShowEditFeeModal(false)
        setFeeAmount("")
        setIsUpdatingFee(false)
      },
      onError: () => {
        showErrorToast("Failed to update application fee")
        setIsUpdatingFee(false)
      }
    })
  }

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || {
      label: status,
      className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
      icon: <FileText className="h-4 w-4" />,
    }

    return (
      <Badge className={config.className}>
        <span className="flex items-center gap-2">
          {config.icon}
          {config.label}
        </span>
      </Badge>
    )
  }

  const getPaymentStatusBadge = (paymentStatus: string) => {
    const config = paymentStatusConfig[paymentStatus] || {
      label: paymentStatus.replace(/_/g, " "),
      className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800",
      icon: <DollarSign className="h-3.5 w-3.5" />,
    }

    return (
      <Badge 
        variant="outline" 
        className={cn(
          "flex items-center gap-1.5 capitalize px-3 py-1.5 text-xs font-semibold border",
          config.className
        )}
      >
        {config.icon}
        {config.label}
      </Badge>
    )
  }

  const getOrganizationStatusBadge = (registrationStatus: string | null) => {
    if (!registrationStatus) return null
    
    const config = organizationStatusConfig[registrationStatus] || {
      label: registrationStatus.replace(/_/g, " "),
      className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800",
      icon: <Building className="h-3.5 w-3.5" />,
    }

    return (
      <Badge 
        variant="outline" 
        className={cn(
          "flex items-center gap-1.5 capitalize px-3 py-1.5 text-xs font-semibold border",
          config.className
        )}
      >
        {config.icon}
        {config.label}
      </Badge>
    )
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`Compliance Application - ${application.application_number}`} />
      <div className="m-3 md:m-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={route("admin.compliance.index")} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Applications
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            {application.status === "awaiting_review" && (
              <>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={handleRequestInfo}
                  disabled={isSubmitting}
                  className="text-xs sm:text-sm"
                >
                  Request More Info
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleDecline}
                  disabled={isSubmitting}
                  className="text-xs sm:text-sm"
                >
                  Decline
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="text-xs sm:text-sm"
                >
                  Approve
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
            >
              <Trash2 className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        </div>

        {/* Status Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span>{application.application_number}</span>
                <CopyButton text={application.application_number} fieldName="application_number" />
              </div>
              {getStatusBadge(application.status)}
              {application.payment_status && getPaymentStatusBadge(application.payment_status)}
            </CardTitle>
            <CardDescription>
              Submitted {application.submitted_at ? format(new Date(application.submitted_at), "MMM d, yyyy") : "N/A"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Organization</h3>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold">{application.organization.name}</p>
                  <CopyButton text={application.organization.name} fieldName="organization_name" />
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {getOrganizationStatusBadge(application.organization.registration_status)}
                  {application.organization.is_compliance_locked && (
                    <Badge variant="destructive" className="text-xs">
                      Locked
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <h3 className="text-sm font-semibold text-muted-foreground">Contact Information</h3>
                {application.contact.name && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Name:</span>
                    <span>{application.contact.name}</span>
                    <CopyButton text={application.contact.name} fieldName="contact_name" />
                  </div>
                )}
                {application.contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{application.contact.email}</span>
                    <CopyButton text={application.contact.email} fieldName="contact_email" />
                  </div>
                )}
                {application.contact.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{application.contact.phone}</span>
                    <CopyButton text={application.contact.phone} fieldName="contact_phone" />
                  </div>
                )}
                {application.amount && (
                  <div className="mt-3 flex items-center gap-2">
                    <p>
                      <span className="text-muted-foreground">Application fee: </span>
                      <span className="font-semibold text-foreground">{formatCurrency(application.amount)}</span>
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFeeAmount(application.amount.toString())
                        setShowEditFeeModal(true)
                      }}
                      className="h-6 w-6 p-0"
                      title="Edit fee"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          {application.status === "awaiting_review" && application.amount && (
            <CardFooter>
              <div className="text-sm text-muted-foreground">
                Fee collected: <span className="font-semibold text-foreground">{formatCurrency(application.amount)}</span>
              </div>
            </CardFooter>
          )}
        </Card>

        {/* Requested Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Requested Services
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {application.assistance_types.map((type) => (
                <Badge key={type} variant="secondary" className="capitalize text-sm px-3 py-1.5">
                  {type.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
            {application.description && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Description</h4>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{application.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supporting Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Supporting Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {application.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No files provided.</p>
            ) : (
              <div className="space-y-3">
                {application.documents.map((document, index) => (
                  <div key={`${document.name}-${index}`} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{document.name}</span>
                    </div>
                    {document.url && (
                      <a
                        href={document.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-1.5 flex-shrink-0"
                      >
                        <Download className="h-3.5 w-3.5" />
                        View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Request More Info Modal */}
        <Dialog open={showRequestInfoModal} onOpenChange={setShowRequestInfoModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Request More Information
              </DialogTitle>
              <DialogDescription>
                Describe what additional information is needed from the organization to proceed with the application review.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="request-info-message" className="text-sm font-semibold">
                  Message
                </Label>
                <Textarea
                  id="request-info-message"
                  placeholder="Explain what information you need from the organization..."
                  value={requestInfoMessage}
                  onChange={(e) => setRequestInfoMessage(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRequestInfoModal(false)
                  setRequestInfoMessage("")
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={submitRequestInfo} disabled={isSubmitting || !requestInfoMessage.trim()}>
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Decline Modal */}
        <Dialog open={showDeclineModal} onOpenChange={setShowDeclineModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <XCircle className="h-5 w-5 text-red-600" />
                Decline Application
              </DialogTitle>
              <DialogDescription>
                Provide a reason for declining this compliance application. The organization will be notified of this decision.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="decline-message" className="text-sm font-semibold">
                  Reason for Decline
                </Label>
                <Textarea
                  id="decline-message"
                  placeholder="Explain why this application is being declined..."
                  value={declineMessage}
                  onChange={(e) => setDeclineMessage(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeclineModal(false)
                  setDeclineMessage("")
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={submitDecline} disabled={isSubmitting || !declineMessage.trim()}>
                {isSubmitting ? "Declining..." : "Decline Application"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <XCircle className="h-5 w-5 text-destructive" />
                Delete Application
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this compliance application? This action cannot be undone and will permanently delete all associated files and data.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-sm font-semibold text-destructive mb-1">Warning</p>
              <p className="text-xs text-muted-foreground">
                This will permanently delete the application and all uploaded documents. This action cannot be reversed.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false)
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Application"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Fee Modal */}
        <Dialog open={showEditFeeModal} onOpenChange={setShowEditFeeModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <DollarSign className="h-5 w-5" />
                Update Application Fee
              </DialogTitle>
              <DialogDescription>
                Update the application fee for this compliance application.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fee-amount" className="text-sm font-semibold">
                  Fee Amount (USD)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground z-10">$</span>
                  <Input
                    id="fee-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={feeAmount}
                    onChange={(e) => setFeeAmount(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditFeeModal(false)
                  setFeeAmount("")
                }}
                disabled={isUpdatingFee}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateFee} disabled={isUpdatingFee || !feeAmount}>
                {isUpdatingFee ? "Updating..." : "Update Fee"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}
