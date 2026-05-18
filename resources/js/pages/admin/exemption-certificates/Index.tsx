"use client"

import React, { useState } from "react"
import { Head, Link, router } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { CheckCircle2, Clock, XCircle, Eye, Search, Filter } from "lucide-react"
import type { BreadcrumbItem } from "@/types"

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

interface Paginated<T> {
  data: T[]
  links: {
    url: string | null
    label: string
    active: boolean
  }[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

interface State {
  state: string
  state_code: string
}

interface PageProps {
  certificates: Paginated<Certificate>
  states: State[]
  filters: {
    status: string
    state_code: string
  }
}

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Exemption Certificates", href: "#" },
]

const statusBadges = {
  pending: (
    <Badge variant="secondary" className="flex items-center gap-1 w-fit">
      <Clock className="h-3 w-3" />
      Pending
    </Badge>
  ),
  approved: (
    <Badge className="bg-green-600 flex items-center gap-1 w-fit">
      <CheckCircle2 className="h-3 w-3" />
      Approved
    </Badge>
  ),
  rejected: (
    <Badge variant="destructive" className="flex items-center gap-1 w-fit">
      <XCircle className="h-3 w-3" />
      Rejected
    </Badge>
  ),
  expired: (
    <Badge variant="destructive" className="flex items-center gap-1 w-fit">
      <XCircle className="h-3 w-3" />
      Expired
    </Badge>
  ),
}

export default function AdminExemptionCertificatesIndex({ certificates, states, filters }: PageProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const handleStatusFilter = (value: string) => {
    const params: Record<string, string> = {}
    if (value && value !== "all") {
      params.status = value
    }
    if (filters.state_code) {
      params.state_code = filters.state_code
    }
    router.get(route("admin.exemption-certificates.index"), params, { preserveState: true })
  }

  const handleStateFilter = (value: string) => {
    const params: Record<string, string> = {}
    if (filters.status && filters.status !== "all") {
      params.status = filters.status
    }
    if (value && value !== "all") {
      params.state_code = value
    }
    router.get(route("admin.exemption-certificates.index"), params, { preserveState: true })
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Exemption Certificates Management" />

      <div className="space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Exemption Certificates</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1.5">
              Review and manage sales tax exemption certificates. Total: {certificates.total} certificates
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={filters.status} onValueChange={handleStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">State</label>
                <Select value={filters.state_code || "all"} onValueChange={handleStateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All states" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All states</SelectItem>
                    {states.map((state) => (
                      <SelectItem key={state.state_code} value={state.state_code}>
                        {state.state} ({state.state_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Certificates Table */}
        <Card>
          <CardHeader>
            <CardTitle>Certificates</CardTitle>
          </CardHeader>
          <CardContent>
            {certificates.data.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No certificates found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">User</th>
                      <th className="text-left p-3 font-semibold">Organization</th>
                      <th className="text-left p-3 font-semibold">State</th>
                      <th className="text-left p-3 font-semibold">Status</th>
                      <th className="text-left p-3 font-semibold">Certificate #</th>
                      <th className="text-left p-3 font-semibold">Submitted</th>
                      <th className="text-left p-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificates.data.map((cert) => (
                      <tr key={cert.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{cert.user.name}</div>
                            <div className="text-sm text-gray-500">{cert.user.email}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          {cert.organization ? cert.organization.name : "-"}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">{cert.state} ({cert.state_code})</Badge>
                        </td>
                        <td className="p-3">
                          {statusBadges[cert.status]}
                          {cert.isExpired && cert.status === "approved" && (
                            <Badge variant="destructive" className="ml-2">Expired</Badge>
                          )}
                        </td>
                        <td className="p-3">
                          {cert.certificate_number || "-"}
                        </td>
                        <td className="p-3 text-sm text-gray-500">
                          {new Date(cert.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <Link href={route("admin.exemption-certificates.show", cert.id)}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {certificates.last_page > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  Showing {((certificates.current_page - 1) * certificates.per_page) + 1} to{" "}
                  {Math.min(certificates.current_page * certificates.per_page, certificates.total)} of{" "}
                  {certificates.total} results
                </div>
                <div className="flex gap-2">
                  {certificates.links.map((link, index) => (
                    <Button
                      key={index}
                      variant={link.active ? "default" : "outline"}
                      size="sm"
                      disabled={!link.url}
                      onClick={() => link.url && router.get(link.url)}
                      dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

