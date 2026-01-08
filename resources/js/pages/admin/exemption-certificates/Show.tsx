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
import { ArrowLeft, CheckCircle2, Clock, XCircle, FileText, Download, Mail, Building, Calendar } from "lucide-react"
import type { BreadcrumbItem } from "@/types"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Exemption Certificates", href: "/admin/exemption-certificates" },
  { title: "Certificate Details", href: "#" },
]

interface Certificate {
  id: number
  user: {
    id: number
    name: string
    email: string
  }
  organization: {
    id: number
    name: string
  } | null
  state_code: string
  state: string
  certificate_file_path: string | null
  certificate_number: string | null
  issued_date: string | null
  expiry_date: string | null
  status: "pending" | "approved" | "rejected" | "expired"
  isExpired: boolean
  isValid: boolean
  notes: string | null
  approved_by: {
    id: number
    name: string
  } | null
  approved_at: string | null
  created_at: string
}

interface PageProps {
  certificate: Certificate
}

const statusBadges = {
  pending: (
    <Badge variant="secondary" className="flex items-center gap-1">
      <Clock className="h-4 w-4" />
      Pending Review
    </Badge>
  ),
  approved: (
    <Badge className="bg-green-600 flex items-center gap-1">
      <CheckCircle2 className="h-4 w-4" />
      Approved
    </Badge>
  ),
  rejected: (
    <Badge variant="destructive" className="flex items-center gap-1">
      <XCircle className="h-4 w-4" />
      Rejected
    </Badge>
  ),
  expired: (
    <Badge variant="destructive" className="flex items-center gap-1">
      <XCircle className="h-4 w-4" />
      Expired
    </Badge>
  ),
}

export default function AdminExemptionCertificateShow({ certificate }: PageProps) {
  const { flash } = usePage().props as { flash?: Record<string, string> }
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [approveNotes, setApproveNotes] = useState("")
  const [rejectNotes, setRejectNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  React.useEffect(() => {
    if (flash?.success) {
      showSuccessToast(flash.success)
    }
  }, [flash])

  const handleApprove = () => {
    setIsSubmitting(true)
    router.post(
      route("admin.exemption-certificates.approve", certificate.id),
      { notes: approveNotes || null },
      {
        preserveScroll: true,
        onSuccess: () => {
          showSuccessToast("Certificate approved successfully")
          setIsSubmitting(false)
          setShowApproveModal(false)
          setApproveNotes("")
        },
        onError: () => {
          showErrorToast("Failed to approve certificate")
          setIsSubmitting(false)
        },
      }
    )
  }

  const handleReject = () => {
    if (!rejectNotes.trim()) {
      showErrorToast("Please provide a reason for rejection")
      return
    }

    setIsSubmitting(true)
    router.post(
      route("admin.exemption-certificates.reject", certificate.id),
      { notes: rejectNotes },
      {
        preserveScroll: true,
        onSuccess: () => {
          showSuccessToast("Certificate rejected successfully")
          setIsSubmitting(false)
          setShowRejectModal(false)
          setRejectNotes("")
        },
        onError: () => {
          showErrorToast("Failed to reject certificate")
          setIsSubmitting(false)
        },
      }
    )
  }

  const canApprove = certificate.status === "pending"
  const canReject = certificate.status === "pending" || certificate.status === "approved"

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Exemption Certificate Details" />

      <div className="space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={route("admin.exemption-certificates.index")}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to List
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Exemption Certificate Details</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1.5">Certificate ID: #{certificate.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {statusBadges[certificate.status]}
            {certificate.isExpired && certificate.status === "approved" && (
              <Badge variant="destructive">Expired</Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Certificate Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Certificate Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">State</Label>
                    <div className="mt-1">
                      <Badge variant="outline">{certificate.state} ({certificate.state_code})</Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Certificate Number</Label>
                    <div className="mt-1 font-medium">
                      {certificate.certificate_number || "—"}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Issued Date</Label>
                    <div className="mt-1 font-medium">
                      {certificate.issued_date ? new Date(certificate.issued_date).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Expiry Date</Label>
                    <div className="mt-1 font-medium">
                      {certificate.expiry_date ? new Date(certificate.expiry_date).toLocaleDateString() : "—"}
                    </div>
                  </div>
                </div>

                {certificate.notes && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-sm text-gray-500">Notes</Label>
                      <div className="mt-1 text-sm">{certificate.notes}</div>
                    </div>
                  </>
                )}

                {certificate.certificate_file_path && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-sm text-gray-500 mb-2 block">Certificate File</Label>
                      <a
                        href={certificate.certificate_file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                      >
                        <Download className="h-4 w-4" />
                        View Certificate
                      </a>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* User Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  User Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-500">Name</Label>
                  <div className="mt-1 font-medium">{certificate.user.name}</div>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Email</Label>
                  <div className="mt-1">{certificate.user.email}</div>
                </div>
                {certificate.organization && (
                  <div>
                    <Label className="text-sm text-gray-500 flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Organization
                    </Label>
                    <div className="mt-1 font-medium">{certificate.organization.name}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            {canApprove && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => setShowApproveModal(true)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve Certificate
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setShowRejectModal(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Certificate
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Approval Information */}
            {certificate.status === "approved" && certificate.approved_by && (
              <Card>
                <CardHeader>
                  <CardTitle>Approval Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <Label className="text-sm text-gray-500">Approved By</Label>
                    <div className="mt-1 font-medium">{certificate.approved_by.name}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Approved At</Label>
                    <div className="mt-1 text-sm">
                      {certificate.approved_at
                        ? new Date(certificate.approved_at).toLocaleString()
                        : "—"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submission Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Submission Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-500">
                  Submitted: {new Date(certificate.created_at).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Approve Modal */}
        <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Exemption Certificate</DialogTitle>
              <DialogDescription>
                Are you sure you want to approve this exemption certificate? This will allow the user to receive tax exemptions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="approve-notes">Notes (Optional)</Label>
                <Textarea
                  id="approve-notes"
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  placeholder="Add any notes about this approval..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApproveModal(false)}>
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleApprove}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Approving..." : "Approve Certificate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Modal */}
        <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Exemption Certificate</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this certificate. This will be visible to the user.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="reject-notes">Rejection Reason *</Label>
                <Textarea
                  id="reject-notes"
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Please explain why this certificate is being rejected..."
                  rows={4}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectModal(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isSubmitting || !rejectNotes.trim()}
              >
                {isSubmitting ? "Rejecting..." : "Reject Certificate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}

