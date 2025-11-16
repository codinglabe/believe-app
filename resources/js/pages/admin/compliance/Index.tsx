"use client"

import React, { useMemo } from "react"
import { Head, Link, router } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Eye, Building, Calendar, DollarSign, FileText, CheckCircle, Clock, XCircle, RotateCcw, Search, ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import type { BreadcrumbItem } from "@/types"

interface OrganizationSummary {
  id: number
  name: string
  registration_status: string | null
  is_compliance_locked: boolean
}

interface ApplicationRow {
  id: number
  application_number: string
  status: string
  payment_status: string
  assistance_types: string[]
  amount: number
  submitted_at: string | null
  organization: OrganizationSummary
}

interface Paginated<T> {
  data: T[]
  meta?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from?: number
    to?: number
  }
  links?: {
    url: string | null
    label: string
    active: boolean
  }[]
}

interface PageProps {
  applications: Paginated<ApplicationRow>
  filters: {
    status?: string | null
    search?: string | null
  }
}

const statusFilters = [
  { value: "all", label: "All statuses" },
  { value: "pending_payment", label: "Payment pending" },
  { value: "awaiting_review", label: "Awaiting review" },
  { value: "needs_more_info", label: "Needs info" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
]

const statusTone: Record<string, string> = {
  pending_payment: "bg-amber-100 text-amber-700",
  awaiting_review: "bg-blue-100 text-blue-700",
  needs_more_info: "bg-orange-100 text-orange-700",
  approved: "bg-emerald-100 text-emerald-700",
  declined: "bg-red-100 text-red-700",
}

const paymentStatusTone: Record<string, { className: string; icon: React.ReactNode }> = {
  paid: {
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  pending: {
    className: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <Clock className="h-3 w-3" />,
  },
  cancelled: {
    className: "bg-gray-100 text-gray-700 border-gray-200",
    icon: <XCircle className="h-3 w-3" />,
  },
  refunded: {
    className: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <RotateCcw className="h-3 w-3" />,
  },
}

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Compliance Applications", href: "#" },
]

export default function AdminComplianceIndex({ applications, filters }: PageProps) {
  const hasResults = applications.data.length > 0
  const [searchQuery, setSearchQuery] = React.useState(filters.search || "")
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const [showDeleteModal, setShowDeleteModal] = React.useState(false)
  const [applicationToDelete, setApplicationToDelete] = React.useState<number | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleFilterChange = (value: string) => {
    const params: Record<string, string> = {}
    if (value && value !== "all") {
      params.status = value
    }
    if (searchQuery) {
      params.search = searchQuery
    }
    router.get(route("admin.compliance.index"), params, { preserveState: true })
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      const params: Record<string, string> = {}
      if (filters.status && filters.status !== "all") {
        params.status = filters.status
      }
      if (value.trim()) {
        params.search = value.trim()
      }
      router.get(route("admin.compliance.index"), params, { preserveState: true, replace: true })
    }, 500)
  }

  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const handleAction = (applicationId: number, status: "approved" | "needs_more_info" | "declined") => {
    let message: string | undefined

    if (status !== "approved") {
      const promptLabel = status === "needs_more_info" ? "Explain what you need from the organization" : "Share the reason for decline"
      const response = window.prompt(promptLabel)
      if (response === null) {
        return
      }
      message = response
    }

    router.patch(route("admin.compliance.update", applicationId), { status, message }, { preserveScroll: true })
  }

  const formattedApplications = useMemo(() => applications.data, [applications])

  const handlePageChange = (url: string | null) => {
    if (!url) return
    router.visit(url, { preserveState: true, preserveScroll: true })
  }

  const handleDeleteClick = (applicationId: number) => {
    setApplicationToDelete(applicationId)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = () => {
    if (!applicationToDelete) return

    setIsDeleting(true)
    router.delete(route("admin.compliance.destroy", applicationToDelete), {
      preserveScroll: false,
      onSuccess: () => {
        setShowDeleteModal(false)
        setApplicationToDelete(null)
        setIsDeleting(false)
      },
      onError: () => {
        setIsDeleting(false)
      },
    })
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Compliance Applications" />
      <div className="m-2 md:m-4 space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Compliance Applications</h1>
            <p className="text-sm text-muted-foreground">Review and process compliance assistance applications.</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-end">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by application number or organization..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9 w-full sm:w-[300px]"
                  />
                </div>
                <Select onValueChange={handleFilterChange} defaultValue={filters.status ?? "all"}>
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusFilters.map((option) => (
                      <SelectItem value={option.value} key={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!hasResults ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No applications found</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  {filters.search || (filters.status && filters.status !== "all")
                    ? "No compliance applications match your search criteria. Try adjusting your filters or search terms."
                    : "There are no compliance applications to display at this time."}
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {formattedApplications.map((application) => {
                    const paymentStatus = paymentStatusTone[application.payment_status] || {
                      className: "bg-gray-100 text-gray-700 border-gray-200",
                      icon: <DollarSign className="h-3 w-3" />,
                    }

                    return (
                      <Card key={application.id} className="hover:shadow-lg transition-all duration-200 border-border/50 p-0">
                        <CardHeader className="pb-2.5 border-b px-3 pt-3">
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <CardTitle className="text-base font-semibold truncate">
                                  {application.application_number}
                                </CardTitle>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {application.submitted_at 
                                    ? format(new Date(application.submitted_at), "MMM d, yyyy")
                                    : "Not submitted"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-3 space-y-3 px-3 pb-3">
                          {/* Organization Info */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <p className="font-medium text-sm truncate">{application.organization.name}</p>
                            </div>
                            {application.organization.registration_status && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground pl-6">
                                <span className="capitalize">{application.organization.registration_status}</span>
                              </div>
                            )}
                          </div>

                          {/* Services */}
                          {application.assistance_types && application.assistance_types.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground font-medium">Services</p>
                              <div className="flex flex-wrap gap-1">
                                {application.assistance_types.map((type) => (
                                  <Badge key={`${application.id}-${type}`} variant="secondary" className="text-xs capitalize">
                                    {type.replace(/_/g, " ")}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Status Badges */}
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={cn("text-xs capitalize font-medium px-2.5 py-1", statusTone[application.status] ?? "bg-gray-100 text-gray-700")}>
                              {application.status.replace(/_/g, " ")}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs capitalize border font-medium px-2.5 py-1 flex items-center gap-1.5",
                                paymentStatus.className
                              )}
                            >
                              {paymentStatus.icon}
                              {application.payment_status?.replace(/_/g, " ") ?? "N/A"}
                            </Badge>
                          </div>

                          {/* Amount */}
                          {application.amount && (
                            <div className="flex items-center gap-2 pt-2 border-t bg-muted/30 -mx-3 px-3 py-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <div className="flex-1">
                                <span className="text-xs text-muted-foreground">Application Fee</span>
                                <span className="text-sm font-semibold ml-2">
                                  ${Number(application.amount).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-col gap-2 pt-2 border-t">
                            {application.status === "awaiting_review" ? (
                              <>
                                <div className="flex gap-2">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="flex-1 text-xs h-8"
                                    onClick={() => handleAction(application.id, "needs_more_info")}
                                  >
                                    Request Info
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="flex-1 text-xs h-8"
                                    onClick={() => handleAction(application.id, "declined")}
                                  >
                                    Decline
                                  </Button>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="flex-1 text-xs h-8"
                                    onClick={() => handleAction(application.id, "approved")}
                                  >
                                    Approve Application
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="flex-1 text-xs h-8" 
                                    asChild
                                  >
                                    <Link href={route("admin.compliance.show", application.id)} className="flex items-center justify-center gap-1.5">
                                      <Eye className="h-3.5 w-3.5" />
                                      <span>View</span>
                                    </Link>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                                    onClick={() => handleDeleteClick(application.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="flex-1 text-xs h-8" 
                                  asChild
                                >
                                  <Link href={route("admin.compliance.show", application.id)} className="flex items-center justify-center gap-1.5">
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>View Application</span>
                                  </Link>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                                  onClick={() => handleDeleteClick(application.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {/* Pagination */}
                {applications.links && applications.links.length > 3 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t">
                    <div className="text-sm text-muted-foreground">
                      {applications.meta?.from && applications.meta?.to ? (
                        <>
                          Showing <span className="font-medium">{applications.meta.from}</span> to{" "}
                          <span className="font-medium">{applications.meta.to}</span> of{" "}
                          <span className="font-medium">{applications.meta.total}</span> applications
                        </>
                      ) : (
                        <>
                          Showing {applications.data.length} of {applications.meta?.total || applications.data.length} applications
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {applications.links.map((link, index) => {
                        const label = link.label.replace(/&laquo;|&raquo;/g, "").trim()
                        
                        if (label === "Previous" || label === "« Previous") {
                          return (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(link.url)}
                              disabled={!link.url}
                              className="flex items-center gap-1"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              <span className="hidden sm:inline">Previous</span>
                            </Button>
                          )
                        }
                        if (label === "Next" || label === "Next »") {
                          return (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(link.url)}
                              disabled={!link.url}
                              className="flex items-center gap-1"
                            >
                              <span className="hidden sm:inline">Next</span>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          )
                        }
                        if (label === "..." || link.label === "...") {
                          return (
                            <span key={index} className="px-2 text-muted-foreground">
                              ...
                            </span>
                          )
                        }
                        // Skip non-numeric labels
                        if (isNaN(Number(label))) {
                          return null
                        }
                        return (
                          <Button
                            key={index}
                            variant={link.active ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(link.url)}
                            disabled={!link.url || link.active}
                            className="min-w-[40px]"
                          >
                            {label}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

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
                  setApplicationToDelete(null)
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
      </div>
    </AppLayout>
  )
}
