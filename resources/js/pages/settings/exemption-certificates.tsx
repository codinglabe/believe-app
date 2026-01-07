"use client"

import SettingsLayout from "@/layouts/settings/layout"
import { Head, router, useForm, usePage } from "@inertiajs/react"
import { useState } from "react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Badge } from "@/components/frontend/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/frontend/ui/dialog"
import {
  FileText,
  Upload,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  Trash2,
  Edit,
  File,
} from "lucide-react"
import InputError from "@/components/input-error"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

interface Certificate {
  id: number
  state_code: string
  state: string
  certificate_file_path: string | null
  certificate_number: string | null
  issued_date: string | null
  expiry_date: string | null
  status: string
  isValid: boolean
  isExpired: boolean
  notes: string | null
  created_at: string
}

interface State {
  id: number
  state: string
  state_code: string
  base_sales_tax_rate: number
  requires_exemption_certificate?: boolean
}

interface PageProps {
  certificates: Certificate[]
  states: State[]
  hasOrganization: boolean
}

export default function ExemptionCertificates() {
  const { certificates, states, hasOrganization } = usePage<PageProps>().props
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [editingCertificate, setEditingCertificate] = useState<Certificate | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState<number | null>(null)

  const uploadForm = useForm({
    state_code: "",
    certificate_file: null as File | null,
    certificate_number: "",
    issued_date: "",
    expiry_date: "",
    notes: "",
  })

  const editForm = useForm({
    certificate_file: null as File | null,
    certificate_number: "",
    issued_date: "",
    expiry_date: "",
    notes: "",
  })

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData()
    formData.append("state_code", uploadForm.data.state_code)
    if (uploadForm.data.certificate_file) {
      formData.append("certificate_file", uploadForm.data.certificate_file)
    }
    formData.append("certificate_number", uploadForm.data.certificate_number || "")
    formData.append("issued_date", uploadForm.data.issued_date || "")
    formData.append("expiry_date", uploadForm.data.expiry_date || "")
    formData.append("notes", uploadForm.data.notes || "")

    router.post(route("exemption-certificates.store"), formData, {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => {
        showSuccessToast("Exemption certificate uploaded successfully!")
        setShowUploadDialog(false)
        uploadForm.reset()
      },
      onError: (errors) => {
        if (errors.certificate_file) {
          showErrorToast(errors.certificate_file)
        } else if (errors.state_code) {
          showErrorToast(errors.state_code)
        } else {
          showErrorToast("Failed to upload certificate. Please try again.")
        }
      },
    })
  }

  const handleEdit = (certificate: Certificate) => {
    setEditingCertificate(certificate)
    editForm.setData({
      certificate_file: null,
      certificate_number: certificate.certificate_number || "",
      issued_date: certificate.issued_date || "",
      expiry_date: certificate.expiry_date || "",
      notes: certificate.notes || "",
    })
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCertificate) return

    const formData = new FormData()
    if (editForm.data.certificate_file) {
      formData.append("certificate_file", editForm.data.certificate_file)
    }
    formData.append("certificate_number", editForm.data.certificate_number || "")
    formData.append("issued_date", editForm.data.issued_date || "")
    formData.append("expiry_date", editForm.data.expiry_date || "")
    formData.append("notes", editForm.data.notes || "")
    formData.append("_method", "PUT")

    router.post(route("exemption-certificates.update", editingCertificate.id), formData, {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => {
        showSuccessToast("Exemption certificate updated successfully!")
        setEditingCertificate(null)
        editForm.reset()
      },
      onError: () => {
        showErrorToast("Failed to update certificate. Please try again.")
      },
    })
  }

  const handleDelete = (id: number) => {
    router.delete(route("exemption-certificates.destroy", id), {
      preserveScroll: true,
      onSuccess: () => {
        showSuccessToast("Exemption certificate deleted successfully!")
        setShowDeleteDialog(null)
      },
      onError: () => {
        showErrorToast("Failed to delete certificate. Please try again.")
      },
    })
  }

  const getStatusBadge = (certificate: Certificate) => {
    if (certificate.isExpired) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Expired
        </Badge>
      )
    }
    switch (certificate.status) {
      case "approved":
        return (
          <Badge variant="default" className="bg-green-600 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending Review
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        )
      default:
        return null
    }
  }

  const availableStates = states.filter(
    (state) => !certificates.some((cert) => cert.state_code === state.state_code && cert.status !== "rejected")
  )

  if (!hasOrganization) {
    return (
      <SettingsLayout activeTab="exemption-certificates">
        <Head title="Exemption Certificates" />
        <Card>
          <CardHeader>
            <CardTitle>Exemption Certificates</CardTitle>
            <CardDescription>Manage your sales tax exemption certificates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Organization Required</h3>
              <p className="text-muted-foreground mb-4">
                You must be associated with a nonprofit organization to upload exemption certificates.
              </p>
            </div>
          </CardContent>
        </Card>
      </SettingsLayout>
    )
  }

  return (
    <SettingsLayout activeTab="exemption-certificates">
      <Head title="Exemption Certificates" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Exemption Certificates</h2>
            <p className="text-muted-foreground mt-1">
              Upload and manage your sales tax exemption certificates to qualify for tax exemptions on Service Hub orders.
            </p>
          </div>
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Upload Certificate
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Exemption Certificate</DialogTitle>
                <DialogDescription>
                  Upload a valid exemption certificate for the state where you make purchases.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <Label htmlFor="state_code">State *</Label>
                  <select
                    id="state_code"
                    value={uploadForm.data.state_code}
                    onChange={(e) => uploadForm.setData("state_code", e.target.value)}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select a state</option>
                    {availableStates.map((state) => (
                      <option key={state.id} value={state.state_code}>
                        {state.state} ({state.state_code}) - {state.base_sales_tax_rate}% tax
                      </option>
                    ))}
                  </select>
                  <InputError message={uploadForm.errors.state_code} />
                </div>

                <div>
                  <Label htmlFor="certificate_file">Certificate File *</Label>
                  <Input
                    id="certificate_file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        uploadForm.setData("certificate_file", file)
                      }
                    }}
                    className="mt-1"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (Max 10MB)</p>
                  <InputError message={uploadForm.errors.certificate_file} />
                </div>

                <div>
                  <Label htmlFor="certificate_number">Certificate Number</Label>
                  <Input
                    id="certificate_number"
                    value={uploadForm.data.certificate_number}
                    onChange={(e) => uploadForm.setData("certificate_number", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="issued_date">Issued Date</Label>
                    <Input
                      id="issued_date"
                      type="date"
                      value={uploadForm.data.issued_date}
                      onChange={(e) => uploadForm.setData("issued_date", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiry_date">Expiry Date</Label>
                    <Input
                      id="expiry_date"
                      type="date"
                      value={uploadForm.data.expiry_date}
                      onChange={(e) => uploadForm.setData("expiry_date", e.target.value)}
                      min={uploadForm.data.issued_date}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    value={uploadForm.data.notes}
                    onChange={(e) => uploadForm.setData("notes", e.target.value)}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                    placeholder="Any additional information..."
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowUploadDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploadForm.processing}>
                    {uploadForm.processing ? "Uploading..." : "Upload Certificate"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {certificates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Certificates Uploaded</h3>
              <p className="text-muted-foreground mb-4">
                Upload exemption certificates to qualify for sales tax exemptions on your Service Hub purchases.
              </p>
              <Button onClick={() => setShowUploadDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Upload Your First Certificate
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {certificates.map((certificate) => (
              <Card key={certificate.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          {certificate.state} ({certificate.state_code})
                        </h3>
                        {getStatusBadge(certificate)}
                      </div>
                      {certificate.certificate_number && (
                        <p className="text-sm text-muted-foreground mb-2">
                          Certificate #: {certificate.certificate_number}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {certificate.issued_date && (
                          <span>Issued: {new Date(certificate.issued_date).toLocaleDateString()}</span>
                        )}
                        {certificate.expiry_date && (
                          <span>Expires: {new Date(certificate.expiry_date).toLocaleDateString()}</span>
                        )}
                        <span>Uploaded: {new Date(certificate.created_at).toLocaleDateString()}</span>
                      </div>
                      {certificate.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{certificate.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {certificate.certificate_file_path && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(certificate.certificate_file_path!, "_blank")}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      )}
                      {certificate.status === "pending" || certificate.status === "rejected" ? (
                        <Button variant="outline" size="sm" onClick={() => handleEdit(certificate)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      ) : null}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowDeleteDialog(certificate.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        {editingCertificate && (
          <Dialog open={!!editingCertificate} onOpenChange={() => setEditingCertificate(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Exemption Certificate</DialogTitle>
                <DialogDescription>Update your exemption certificate information.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <Label htmlFor="edit_certificate_file">Certificate File (Optional - leave blank to keep current)</Label>
                  <Input
                    id="edit_certificate_file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        editForm.setData("certificate_file", file)
                      }
                    }}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (Max 10MB)</p>
                </div>

                <div>
                  <Label htmlFor="edit_certificate_number">Certificate Number</Label>
                  <Input
                    id="edit_certificate_number"
                    value={editForm.data.certificate_number}
                    onChange={(e) => editForm.setData("certificate_number", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_issued_date">Issued Date</Label>
                    <Input
                      id="edit_issued_date"
                      type="date"
                      value={editForm.data.issued_date}
                      onChange={(e) => editForm.setData("issued_date", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_expiry_date">Expiry Date</Label>
                    <Input
                      id="edit_expiry_date"
                      type="date"
                      value={editForm.data.expiry_date}
                      onChange={(e) => editForm.setData("expiry_date", e.target.value)}
                      min={editForm.data.issued_date}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit_notes">Notes</Label>
                  <textarea
                    id="edit_notes"
                    value={editForm.data.notes}
                    onChange={(e) => editForm.setData("notes", e.target.value)}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                    placeholder="Any additional information..."
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingCertificate(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={editForm.processing}>
                    {editForm.processing ? "Updating..." : "Update Certificate"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog !== null} onOpenChange={() => setShowDeleteDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Certificate</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this exemption certificate? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => showDeleteDialog && handleDelete(showDeleteDialog)}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SettingsLayout>
  )
}

