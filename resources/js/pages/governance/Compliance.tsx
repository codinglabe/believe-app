"use client"

import { Head } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Shield, Download, FileText, CheckCircle, AlertTriangle, Diamond } from "lucide-react"

const BRAND = {
  from: "#9333ea",
  to: "#2563eb",
  fromMuted: "rgba(147,51,234,0.15)",
  toMuted: "rgba(37,99,235,0.1)",
}

interface ComplianceOverview {
  last_filed_type: string | null
  last_filed_date: string | null
  revocation_status: string | null
  subsection: string | null
  organization_legal_name: string
  filing_requirement_code: string | null
  deductibility_code: string | null
  public_charity_status: string | null
  rule_date: string | null
  ntee_code: string | null
  tax_year_end: string | null
  status_code: string | null
}

interface ScheduleItem {
  key: string
  title?: string
  description?: string
  status?: string
  status_label?: string
}

interface Organization {
  id: number
  name: string
  ein: string | null
  ein_formatted: string
  classification: string | null
  filing_req: string | null
  ntee_code: string | null
  tax_compliance_status: string | null
}

interface Props {
  organization: Organization
  complianceOverview: ComplianceOverview
  scheduleRequirements: ScheduleItem[]
}

export default function GovernanceCompliance({
  organization,
  complianceOverview,
  scheduleRequirements,
}: Props) {
  const detailsRows: { field: string; value: React.ReactNode }[] = [
    { field: "Organization Legal Name", value: complianceOverview.organization_legal_name || "—" },
    { field: "Filing Requirement Code", value: complianceOverview.filing_requirement_code ?? "—" },
    {
      field: "Deductibility Code",
      value: complianceOverview.deductibility_code
        ? (
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              {complianceOverview.deductibility_code}
            </span>
          )
        : "—",
    },
    {
      field: "Public Charity Status",
      value: complianceOverview.public_charity_status
        ? (
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              {complianceOverview.public_charity_status}
            </span>
          )
        : "—",
    },
    { field: "Rule Date (Exempt Since)", value: complianceOverview.rule_date ?? "—" },
    { field: "NTEE Code (Classification)", value: complianceOverview.ntee_code ?? "—" },
    { field: "Tax Year End", value: complianceOverview.tax_year_end ?? "—" },
    { field: "Last Filed Form 990 Type", value: complianceOverview.last_filed_type ?? "—" },
    { field: "Last Filed Filing Date", value: complianceOverview.last_filed_date ?? "—" },
    {
      field: "Status Code",
      value: complianceOverview.status_code
        ? (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                complianceOverview.status_code.toLowerCase() === "active"
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              {complianceOverview.status_code.toLowerCase() === "active" && (
                <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
              )}
              {complianceOverview.status_code}
            </span>
          )
        : "—",
    },
  ]

  const getScheduleStatusStyles = (status: string | undefined) => {
    if (!status) return "bg-muted text-muted-foreground border-border"
    switch (status) {
      case "required":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "not_required":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  const getScheduleIcon = (status: string | undefined) => {
    if (!status) return <Diamond className="h-4 w-4 text-muted-foreground shrink-0" />
    switch (status) {
      case "required":
        return <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
      case "not_required":
        return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
      default:
        return <Diamond className="h-4 w-4 text-muted-foreground shrink-0" />
    }
  }

  return (
    <AppLayout>
      <Head title="Compliance Overview" />

      <div className="min-h-screen bg-background">
        {/* Hero header - same as Unity Meet */}
        <div
          className="relative overflow-hidden border-b border-purple-200 dark:border-purple-500/20"
          style={{
            background: `linear-gradient(135deg, ${BRAND.fromMuted} 0%, rgba(147,51,234,0.25) 30%, rgba(37,99,235,0.2) 70%, ${BRAND.toMuted} 100%)`,
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(147,51,234,0.15),transparent)]" />
          <div className="relative w-full px-4 py-10 sm:py-12 md:px-6 lg:px-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
                  >
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                      Compliance Overview
                    </h1>
                    <p className="text-sm text-muted-foreground">Tax & Filing Compliance Status</p>
                  </div>
                </div>
              </div>
              <Button
                className="h-11 shrink-0 rounded-lg px-6 text-white shadow-lg transition-all hover:shadow-[0_0_24px_rgba(147,51,234,0.35)]"
                style={{
                  background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})`,
                }}
                asChild
              >
                <a href="#" className="inline-flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download Reports
                </a>
              </Button>
            </div>
          </div>
        </div>

        <main className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-8">
          {/* Four summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm dark:bg-card">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">EIN</p>
              <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-foreground">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                {organization.ein_formatted || "—"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm dark:bg-card">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Subsection</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{complianceOverview.subsection ?? "—"}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm dark:bg-card">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Last Filed Type</p>
              <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-foreground">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                {complianceOverview.last_filed_type ?? "—"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm dark:bg-card">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Revocation Status</p>
              <div className="mt-2 flex items-center gap-2">
                {complianceOverview.revocation_status ? (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      complianceOverview.revocation_status.toLowerCase() === "active"
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {complianceOverview.revocation_status.toLowerCase() === "active" && (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    )}
                    {complianceOverview.revocation_status}
                  </span>
                ) : (
                  <span className="text-lg font-semibold text-foreground">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Compliance Details - side by side, header like table, no row/column borders */}
          <section>
            <h2 className="text-lg font-bold text-foreground">Compliance Details</h2>
            <div className="mt-4 overflow-hidden rounded-xl bg-card dark:bg-card">
              <div className="grid grid-cols-1 border-b border-border sm:grid-cols-[1fr_2fr]">
                <div className="bg-muted/30 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Field Name
                </div>
                <div className="bg-muted/30 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Value
                </div>
              </div>
              {detailsRows.map((row, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_2fr]">
                  <div className="px-4 py-3 text-sm text-muted-foreground sm:border-r-0">
                    {row.field}
                  </div>
                  <div className="px-4 py-3 text-sm text-foreground">{row.value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Schedule Requirements - only when backend sends data */}
          {Array.isArray(scheduleRequirements) && scheduleRequirements.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-foreground">Schedule Requirements</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {scheduleRequirements.map((item, index) => (
                  <div
                    key={item.key ?? index}
                    className="rounded-xl border border-border bg-card p-5 shadow-sm dark:bg-card"
                  >
                    <p className="font-semibold text-foreground">{item.title ?? "—"}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{item.description ?? ""}</p>
                    <div className="mt-3 flex items-center gap-2">
                      {(item.status_label ?? item.status) && (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getScheduleStatusStyles(
                            item.status
                          )}`}
                        >
                          {getScheduleIcon(item.status)}
                          {item.status_label ?? item.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </AppLayout>
  )
}
