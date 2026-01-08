"use client"

import React, { useState } from "react"
import { Head, Link, router } from "@inertiajs/react"
import SettingsLayout from "@/layouts/settings/layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Search, Filter, Eye, ExternalLink, FileCheck, DollarSign, MapPin } from "lucide-react"
import { route } from "ziggy-js"

interface StateSalesTax {
  id: number
  state: string
  state_code: string
  base_sales_tax_rate: number
  rate_mode: string | null
  sales_tax_status: string | null
  services_vs_goods: string | null
  charitable_vs_resale: string | null
  requires_exemption_certificate: boolean
  certificate_type_allowed: string | null
  site_to_apply_for_certificate: string | null
  local_rates_apply: boolean
  last_updated: string | null
  notes: string | null
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

interface PageProps {
  states: Paginated<StateSalesTax>
  filters: {
    rate_mode: string
    sales_tax_status: string
    requires_certificate: string
    search: string
  }
}

const getStatusBadge = (status: string | null) => {
  if (!status) return <Badge variant="secondary">N/A</Badge>

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    exempt: { label: "Exempt", variant: "default" },
    exempt_limited: { label: "Exempt Limited", variant: "default" },
    non_exempt: { label: "Non-Exempt", variant: "secondary" },
    no_state_sales_tax: { label: "No State Tax", variant: "secondary" },
    refund_based: { label: "Refund Based", variant: "default" },
    taxable: { label: "Taxable", variant: "secondary" },
  }

  const config = statusMap[status] || { label: status, variant: "secondary" as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

const getServicesVsGoodsBadge = (value: string | null) => {
  if (!value) return <Badge variant="secondary">N/A</Badge>

  const map: Record<string, string> = {
    tangible_goods_only: "Tangible Goods Only",
    both_taxable: "Both Taxable",
    n_a: "N/A",
  }

  return <Badge variant="outline">{map[value] || value}</Badge>
}

export default function StateSalesTaxSettings({ states, filters }: PageProps) {
  const [searchQuery, setSearchQuery] = useState(filters.search || "")

  const handleFilterChange = (filterName: string, value: string) => {
    const params: Record<string, string> = { ...filters, [filterName]: value }
    if (filterName !== "search") {
      params.search = searchQuery
    }
    router.get(route("state-sales-tax.index"), params, { preserveState: true })
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    const params: Record<string, string> = { ...filters, search: value }
    router.get(route("state-sales-tax.index"), params, { preserveState: true, replace: true })
  }

  return (
    <SettingsLayout activeTab="state-sales-tax">
      <Head title="State Sales Tax Rates" />

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">State Sales Tax Rates</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1.5">
            View sales tax rates and certificate requirements for all US states. Total: {states.total} states
          </p>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by state..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Rate Mode</label>
                <Select value={filters.rate_mode} onValueChange={(value) => handleFilterChange("rate_mode", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All modes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modes</SelectItem>
                    <SelectItem value="STATE BASE ONLY">State Base Only</SelectItem>
                    <SelectItem value="NO STATE TAX">No State Tax</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Tax Status</label>
                <Select
                  value={filters.sales_tax_status}
                  onValueChange={(value) => handleFilterChange("sales_tax_status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="exempt">Exempt</SelectItem>
                    <SelectItem value="exempt_limited">Exempt Limited</SelectItem>
                    <SelectItem value="non_exempt">Non-Exempt</SelectItem>
                    <SelectItem value="no_state_sales_tax">No State Tax</SelectItem>
                    <SelectItem value="refund_based">Refund Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Requires Certificate</label>
                <Select
                  value={filters.requires_certificate}
                  onValueChange={(value) => handleFilterChange("requires_certificate", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* States Table */}
        <Card>
          <CardHeader>
            <CardTitle>All States</CardTitle>
            <CardDescription>
              Click "View Details" to see certificate application links and more information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">State</th>
                    <th className="text-left p-3 font-semibold">Rate</th>
                    <th className="text-left p-3 font-semibold">Rate Mode</th>
                    <th className="text-left p-3 font-semibold">Tax Status</th>
                    <th className="text-left p-3 font-semibold">Requires Cert</th>
                    <th className="text-left p-3 font-semibold">Certificate Type</th>
                    <th className="text-left p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {states.data.map((state) => (
                    <tr key={state.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-3">
                        <div className="font-medium">{state.state}</div>
                        <div className="text-sm text-gray-500">{state.state_code}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span className="font-semibold">{state.base_sales_tax_rate}%</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{state.rate_mode || "N/A"}</Badge>
                      </td>
                      <td className="p-3">{getStatusBadge(state.sales_tax_status)}</td>
                      <td className="p-3">
                        {state.requires_exemption_certificate ? (
                          <Badge className="bg-green-600">
                            <FileCheck className="h-3 w-3 mr-1" />
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="text-sm">
                          {state.certificate_type_allowed ? (
                            <Badge variant="outline">{state.certificate_type_allowed}</Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <Link href={route("state-sales-tax.show", state.id)}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {states.last_page > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  Showing {((states.current_page - 1) * states.per_page) + 1} to{" "}
                  {Math.min(states.current_page * states.per_page, states.total)} of {states.total} results
                </div>
                <div className="flex gap-2">
                  {states.links.map((link, index) => (
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
    </SettingsLayout>
  )
}

