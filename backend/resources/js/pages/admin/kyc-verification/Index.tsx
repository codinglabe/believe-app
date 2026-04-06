"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Head, Link, router } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import {
  Eye,
  User,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Filter,
  Shield,
  Mail,
  UserPlus,
  Users,
  TrendingUp,
  AlertCircle,
  Send,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { motion } from "framer-motion"
import type { BreadcrumbItem } from "@/types"
const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "KYC Verification", href: "#" },
]

interface User {
  id: number
  name: string
  email: string
}

interface Organization {
  id: number
  name: string
}

interface BridgeIntegration {
  id: number
  user?: User
  organization?: Organization
}

interface Submission {
  id: number
  first_name: string
  last_name: string
  email: string
  submission_status: string
  bridge_customer_id: string | null
  created_at: string
  updated_at: string
  bridge_integration: BridgeIntegration
  submission_data?: {
    rejection_reason?: string
    rejected_at?: string
    rejected_by?: number
    approved_at?: string
    approved_by?: number
    approval_notes?: string
  }
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
  submissions: Paginated<Submission>
  stats: {
    total: number
    pending: number
    approved: number
    rejected: number
    not_submitted: number
  }
  filters: {
    status?: string | null
    search?: string | null
  }
}

const statusConfig: Record<string, { className: string; icon: React.ReactNode; label: string }> = {
  pending: {
    className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20",
    icon: <Clock className="h-3 w-3" />,
    label: "Pending",
  },
  in_review: {
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20",
    icon: <Eye className="h-3 w-3" />,
    label: "In Review",
  },
  approved: {
    className: "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20",
    icon: <CheckCircle className="h-3 w-3" />,
    label: "Approved",
  },
  verified: {
    className: "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20",
    icon: <CheckCircle className="h-3 w-3" />,
    label: "Verified",
  },
  rejected: {
    className: "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20",
    icon: <XCircle className="h-3 w-3" />,
    label: "Rejected",
  },
  not_submitted: {
    className: "bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-slate-500/20",
    icon: <AlertCircle className="h-3 w-3" />,
    label: "Not Submitted",
  },
}

export default function AdminKycVerificationIndex({ submissions, stats, filters }: PageProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search || "")
  const [statusFilter, setStatusFilter] = useState(filters.status || "all")
  const [activeTab, setActiveTab] = useState("pending")

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    router.get(
      route("admin.kyc-verification.index"),
      {
        tab: value === "all" ? undefined : value,
        status: value === "all" ? undefined : value,
        search: searchTerm || undefined,
      },
      {
        preserveState: false,
        preserveScroll: true,
      }
    )
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    router.get(
      route("admin.kyc-verification.index"),
      {
        tab: activeTab,
        status: value === "all" ? undefined : value,
        search: searchTerm || undefined,
      },
      {
        preserveState: false,
        preserveScroll: true,
      }
    )
  }

  const handleSearchSubmit = () => {
    router.get(
      route("admin.kyc-verification.index"),
      {
        tab: activeTab,
        status: statusFilter === "all" ? undefined : statusFilter,
        search: searchTerm || undefined,
      },
      {
        preserveState: false,
        preserveScroll: true,
      }
    )
  }

  const filteredSubmissions = useMemo(() => {
    return submissions.data.filter((submission) => {
      const matchesSearch =
        !searchTerm ||
        `${submission.first_name} ${submission.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.bridge_customer_id?.includes(searchTerm)

      return matchesSearch
    })
  }, [submissions.data, searchTerm])

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.pending
    return (
      <Badge className={cn("flex items-center gap-1 px-2 py-0.5", config.className)}>
        {config.icon}
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-"
    try {
      return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a")
    } catch {
      return "-"
    }
  }

  const approvalRate = stats.total > 0 ? ((stats.approved / stats.total) * 100).toFixed(1) : "0"

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="KYC Verification Center" />
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="m-2 md:m-4 space-y-6">
        {/* Header */}
        <motion.div variants={itemVariants}>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                KYC Verification Center
              </h1>
              <p className="text-muted-foreground mt-1">Manage and monitor customer identity verification</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2 border-border/50 hover:border-primary/50 bg-transparent">
                <Search className="h-4 w-4" />
                Export Report
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div variants={itemVariants}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">All KYC submissions</p>
              </CardContent>
            </Card>

            <Card className="border-yellow-500/20 bg-yellow-500/5 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting verification</p>
              </CardContent>
            </Card>

            <Card className="border-green-500/20 bg-green-500/5 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{stats.approved}</div>
                <p className="text-xs text-muted-foreground mt-1">Successfully verified</p>
              </CardContent>
            </Card>

            <Card className="border-red-500/20 bg-red-500/5 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{stats.rejected}</div>
                <p className="text-xs text-muted-foreground mt-1">Failed verification</p>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{approvalRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">Success rate</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div variants={itemVariants}>
          <Tabs defaultValue="pending" value={activeTab} onValueChange={handleTabChange} className="space-y-4">
            <TabsList className="bg-muted/50 backdrop-blur">
              <TabsTrigger value="pending" className="data-[state=active]:bg-background">
                Pending & In Review
                {stats.pending > 0 && (
                  <Badge className="ml-2 h-5 px-1.5 bg-yellow-500/20 text-yellow-500 border-0">{stats.pending}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved" className="data-[state=active]:bg-background">
                Approved
                {stats.approved > 0 && (
                  <Badge className="ml-2 h-5 px-1.5 bg-green-500/20 text-green-500 border-0">{stats.approved}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="rejected" className="data-[state=active]:bg-background">
                Rejected
                {stats.rejected > 0 && (
                  <Badge className="ml-2 h-5 px-1.5 bg-red-500/20 text-red-500 border-0">{stats.rejected}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="not_submitted" className="data-[state=active]:bg-background">
                Not Submitted
              </TabsTrigger>
              <TabsTrigger value="all" className="data-[state=active]:bg-background">
                All
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle>KYC Verifications</CardTitle>
                  </div>
                  <CardDescription>Review and manage customer identity verification submissions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex flex-col gap-4 sm:flex-row">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, email, or customer ID..."
                        className="pl-9 bg-background/50 border-border/50 focus:border-primary/50"
                        value={searchTerm}
                        onChange={handleSearch}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSearchSubmit()
                          }
                        }}
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                      <SelectTrigger className="w-full sm:w-[200px] bg-background/50 border-border/50">
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          <SelectValue placeholder="Filter by status" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending & In Review</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="not_submitted">Not Submitted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Submissions Table */}
                  <div className="rounded-md border border-border/50">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border/50 bg-muted/30">
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Customer
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Submitted
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Processed
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {filteredSubmissions.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                                No KYC submissions found
                              </td>
                            </tr>
                          ) : (
                            filteredSubmissions.map((submission) => {
                              const customerName = `${submission.first_name} ${submission.last_name}`
                              const processedAt =
                                submission.submission_data?.approved_at || submission.submission_data?.rejected_at

                              return (
                                <tr key={submission.id} className="hover:bg-muted/20 transition-colors">
                                  <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                                        {submission.first_name?.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="font-medium text-foreground">{customerName}</div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Mail className="h-3 w-3" />
                                          {submission.email}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">{getStatusBadge(submission.submission_status)}</td>
                                  <td className="px-4 py-4 text-sm text-muted-foreground">
                                    {formatDate(submission.created_at)}
                                  </td>
                                  <td className="px-4 py-4 text-sm text-muted-foreground">
                                    {processedAt ? formatDate(processedAt) : "-"}
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex justify-end gap-1">
                                      <Link href={route("admin.kyc-verification.show", submission.id)}>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                                          <Eye className="h-4 w-4" />
                                          <span className="sr-only">View</span>
                                        </Button>
                                      </Link>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {submissions.meta && submissions.meta.last_page > 1 && (
                      <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
                        <div className="text-sm text-muted-foreground">
                          Showing {submissions.meta.from} to {submissions.meta.to} of {submissions.meta.total} results
                        </div>
                        <div className="flex gap-2">
                          {submissions.links?.map((link, index) => {
                            if (index === 0) {
                              return (
                                <Button
                                  key={index}
                                  variant="outline"
                                  size="sm"
                                  disabled={!link.url}
                                  onClick={() => {
                                    if (link.url) {
                                      router.get(link.url, {}, { preserveState: false })
                                    }
                                  }}
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                              )
                            }
                            if (index === submissions.links!.length - 1) {
                              return (
                                <Button
                                  key={index}
                                  variant="outline"
                                  size="sm"
                                  disabled={!link.url}
                                  onClick={() => {
                                    if (link.url) {
                                      router.get(link.url, {}, { preserveState: false })
                                    }
                                  }}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              )
                            }
                            if (link.label === "...") {
                              return (
                                <span key={index} className="px-2 py-1 text-sm text-muted-foreground">
                                  ...
                                </span>
                              )
                            }
                            return (
                              <Button
                                key={index}
                                variant={link.active ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                  if (link.url) {
                                    router.get(link.url, {}, { preserveState: false })
                                  }
                                }}
                              >
                                {link.label}
                              </Button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </AppLayout>
  )
}

