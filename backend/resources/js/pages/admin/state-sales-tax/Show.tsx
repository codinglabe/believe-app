"use client"

import React from "react"
import { Head, Link } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, DollarSign, FileCheck, ExternalLink, Info, Building, Shield } from "lucide-react"
import type { BreadcrumbItem } from "@/types"

interface StateSalesTax {
  id: number
  state: string
  state_code: string
  base_sales_tax_rate: number
  rate_mode: string | null
  local_rates_apply: boolean
  last_updated: string | null
  notes: string | null
  sales_tax_status: string | null
  services_vs_goods: string | null
  charitable_vs_resale: string | null
  requires_exemption_certificate: boolean
  certificate_type_allowed: string | null
  site_to_apply_for_certificate: string | null
}

interface PageProps {
  state: StateSalesTax
}

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "State Sales Tax Rates", href: "/admin/state-sales-tax" },
  { title: "State Details", href: "#" },
]

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

export default function AdminStateSalesTaxShow({ state: stateData }: PageProps) {
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`${stateData.state} Sales Tax Details`} />

      <div className="space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={route("admin.state-sales-tax.index")}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to List
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {stateData.state} Sales Tax Details
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                State Code: {stateData.state_code}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {stateData.base_sales_tax_rate}% Base Rate
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tax Rate Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Tax Rate Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Base Sales Tax Rate</label>
                    <div className="mt-1 text-2xl font-bold">{stateData.base_sales_tax_rate}%</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Rate Mode</label>
                    <div className="mt-1">
                      <Badge variant="outline">{stateData.rate_mode || "N/A"}</Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Local Rates Apply</label>
                    <div className="mt-1">
                      {stateData.local_rates_apply ? (
                        <Badge className="bg-blue-600">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Last Updated</label>
                    <div className="mt-1 font-medium">
                      {stateData.last_updated || "—"}
                    </div>
                  </div>
                </div>

                {stateData.notes && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-sm text-gray-500">Notes</label>
                      <div className="mt-1 text-sm">{stateData.notes}</div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Tax Status & Exemption Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Tax Status & Exemption
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Sales Tax Status</label>
                    <div className="mt-1">{getStatusBadge(stateData.sales_tax_status)}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Services vs Goods</label>
                    <div className="mt-1">
                      {stateData.services_vs_goods ? (
                        <Badge variant="outline">
                          {stateData.services_vs_goods === "tangible_goods_only"
                            ? "Tangible Goods Only"
                            : stateData.services_vs_goods === "both_taxable"
                            ? "Both Taxable"
                            : "N/A"}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Charitable vs Resale</label>
                    <div className="mt-1">
                      {stateData.charitable_vs_resale ? (
                        <Badge variant="outline">
                          {stateData.charitable_vs_resale === "charitable_only"
                            ? "Charitable Only"
                            : "N/A"}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Requires Exemption Certificate</label>
                    <div className="mt-1">
                      {stateData.requires_exemption_certificate ? (
                        <Badge className="bg-green-600">
                          <FileCheck className="h-3 w-3 mr-1" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Certificate Information */}
            {stateData.requires_exemption_certificate && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5" />
                    Exemption Certificate Information
                  </CardTitle>
                  <CardDescription>
                    Details about exemption certificates for this state
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-500">Certificate Type Allowed</label>
                    <div className="mt-1">
                      {stateData.certificate_type_allowed ? (
                        <Badge variant="outline" className="text-sm">
                          {stateData.certificate_type_allowed}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                  {stateData.site_to_apply_for_certificate && (
                    <div>
                      <label className="text-sm text-gray-500">Site to Apply for Certificate</label>
                      <div className="mt-1">
                        <a
                          href={stateData.site_to_apply_for_certificate}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 underline"
                        >
                          {stateData.site_to_apply_for_certificate}
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Quick Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm text-gray-500">State</label>
                  <div className="mt-1 font-medium">{stateData.state}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">State Code</label>
                  <div className="mt-1">
                    <Badge variant="outline">{stateData.state_code}</Badge>
                  </div>
                </div>
                <Separator />
                <div>
                  <label className="text-sm text-gray-500">Base Tax Rate</label>
                  <div className="mt-1 text-2xl font-bold">{stateData.base_sales_tax_rate}%</div>
                </div>
              </CardContent>
            </Card>

            {/* Related Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Related Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={route("admin.exemption-certificates.index", { state_code: stateData.state_code })}>
                  <Button variant="outline" className="w-full">
                    <FileCheck className="h-4 w-4 mr-2" />
                    View Certificates
                  </Button>
                </Link>
                {stateData.site_to_apply_for_certificate && (
                  <a
                    href={stateData.site_to_apply_for_certificate}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" className="w-full">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Apply for Certificate
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

