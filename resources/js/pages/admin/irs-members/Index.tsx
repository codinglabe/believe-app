"use client"

import React, { useState } from "react"
import { Head, router } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Search,
  Filter,
  Users,
  Building2,
  Calendar,
  UserCheck,
  Archive,
  FileText,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { motion } from "framer-motion"
import type { BreadcrumbItem } from "@/types"

/* Match Unity Meet: purple-600 to blue-600 gradient */
const BRAND = {
  from: "#9333ea",
  to: "#2563eb",
  fromMuted: "rgba(147,51,234,0.15)",
  toMuted: "rgba(37,99,235,0.1)",
}

interface IrsMember {
  id: number
  ein: string
  name: string
  position: string | null
  status: string
  tax_year: string | null
  appointed_date: string | null
  term_end_date: string | null
  removed_date: string | null
  created_at: string
}

interface EinGroup {
  ein: string
  organization_name: string | null
  is_registered: boolean
  members: IrsMember[]
}

interface IrsMembersIndexProps {
  members: {
    data: IrsMember[]
    links: { url: string | null; label: string; active: boolean }[]
    current_page: number
    last_page: number
    from: number | null
    to: number | null
    total: number
  }
  groups: EinGroup[]
  stats: {
    total: number
    active: number
    inactive: number
    unique_eins: number
  }
  taxYears: string[]
  filters: {
    search: string
    status: string
    tax_year: string
  }
}

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "System Management", href: "#" },
  { title: "IRS Members", href: "/admin/irs-members" },
]

function formatEin(ein: string) {
  const cleaned = (ein || "").replace(/\D/g, "")
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 9)}`
  }
  return ein
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: typeof UserCheck }> = {
    active: {
      label: "Active",
      className: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
      icon: UserCheck,
    },
    inactive: {
      label: "Inactive",
      className: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
      icon: Archive,
    },
    expired: {
      label: "Expired",
      className: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      icon: Calendar,
    },
    removed: {
      label: "Removed",
      className: "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
      icon: Archive,
    },
  }
  const { label, className, icon: Icon } = config[status] || config.inactive
  return (
    <Badge variant="outline" className={className}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  )
}

export default function AdminIrsMembersIndex({ members, groups, stats, taxYears, filters }: IrsMembersIndexProps) {
  const [search, setSearch] = useState(filters.search || "")
  const [statusFilter, setStatusFilter] = useState(filters.status || "all")
  const [taxYearFilter, setTaxYearFilter] = useState(filters.tax_year || "")
  const [collapsedEins, setCollapsedEins] = useState<Set<string>>(() => new Set(groups.map((g) => g.ein)))

  const toggleGroup = (ein: string) => {
    setCollapsedEins((prev) => {
      const next = new Set(prev)
      if (next.has(ein)) next.delete(ein)
      else next.add(ein)
      return next
    })
  }

  const isGroupExpanded = (ein: string) => !collapsedEins.has(ein)

  const applyFilters = (overrides?: { search?: string; status?: string; tax_year?: string }) => {
    const searchVal = (overrides?.search !== undefined) ? overrides.search : search
    const statusVal = (overrides?.status !== undefined) ? overrides.status : statusFilter
    const taxYearVal = (overrides?.tax_year !== undefined) ? overrides.tax_year : (taxYearFilter || "")
    const params: Record<string, string> = {}
    if (searchVal && searchVal.trim() !== "") params.search = searchVal.trim()
    if (statusVal && statusVal !== "all") params.status = statusVal
    if (taxYearVal && taxYearVal.trim() !== "") params.tax_year = taxYearVal.trim()
    router.get(route("admin.irs-members.index"), params, { preserveState: true, replace: true })
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    applyFilters({ search: value })
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    applyFilters({ status: value })
  }

  const handleTaxYearChange = (value: string) => {
    setTaxYearFilter(value)
    applyFilters({ tax_year: value })
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="IRS Members - System Management" />

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
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-lg"
                style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
              >
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  IRS Board Members
                </h1>
                <p className="text-sm text-muted-foreground">
                  View and search board members synced from IRS Form 990 filings. EIN, name, position, status, and filing year.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-4 sm:p-6 md:px-6 lg:px-8">

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Members", value: stats.total, icon: Users, iconClass: "text-purple-600 dark:text-purple-400", iconBg: true },
            { label: "Active", value: stats.active, icon: UserCheck, iconClass: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400", iconBg: false },
            { label: "Inactive / Expired", value: stats.inactive, icon: Archive, iconClass: "bg-muted text-muted-foreground", iconBg: false },
            { label: "Unique EINs", value: stats.unique_eins, icon: Building2, iconClass: "text-purple-600 dark:text-purple-400", iconBg: true },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card className="overflow-hidden border-border transition-shadow hover:shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-foreground">
                        {stat.value.toLocaleString()}
                      </p>
                    </div>
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconBg ? "" : stat.iconClass}`}
                      style={stat.iconBg ? { background: `linear-gradient(135deg, ${BRAND.fromMuted}, ${BRAND.toMuted})` } : undefined}
                    >
                      <stat.icon className={`h-5 w-5 ${stat.iconClass}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name, position, or EIN..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="removed">Removed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={taxYearFilter || "all"} onValueChange={(v) => handleTaxYearChange(v === "all" ? "" : v)}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <Calendar className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filing year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {taxYears.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* List */}
        <Card className="overflow-hidden border-border shadow-sm">
          <CardHeader className="border-b border-border bg-muted/30 pb-4">
            <CardTitle className="text-lg font-semibold text-foreground">Members</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {members.total} {members.total === 1 ? "record" : "records"} total
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-200 dark:border-purple-500/20"
                  style={{ background: `linear-gradient(135deg, ${BRAND.fromMuted}, ${BRAND.toMuted})` }}
                >
                  <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground">No members found</h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  {search || statusFilter !== "all" || taxYearFilter
                    ? "Try adjusting your filters or search term."
                    : "Sync IRS board members to see data here."}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-8">
                  {groups.map((group, groupIndex) => {
                    const expanded = isGroupExpanded(group.ein)
                    return (
                    <motion.div
                      key={group.ein}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: groupIndex * 0.05 }}
                      className="rounded-xl border border-border overflow-hidden bg-card"
                    >
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.ein)}
                        className="flex w-full flex-wrap items-center gap-3 border-b border-border bg-muted/50 px-5 py-4 text-left hover:bg-muted transition-colors"
                      >
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-purple-600 dark:text-purple-400"
                          style={{ background: `linear-gradient(135deg, ${BRAND.fromMuted}, ${BRAND.toMuted})` }}
                        >
                          {expanded ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                        </div>
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                          style={{ background: `linear-gradient(135deg, ${BRAND.fromMuted}, ${BRAND.toMuted})` }}
                        >
                          <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-foreground">
                            {group.organization_name || "Unknown organization"}
                          </h3>
                          <p className="text-sm text-muted-foreground font-mono">
                            EIN {formatEin(group.ein)} · {group.members.length} {group.members.length === 1 ? "member" : "members"}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={group.is_registered
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 shrink-0"
                            : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 shrink-0"
                          }
                        >
                          {group.is_registered ? "Registered" : "Unregistered"}
                        </Badge>
                      </button>
                      {expanded && (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border bg-muted/30 hover:bg-muted/30">
                              <TableHead className="h-11 px-5 font-semibold text-gray-700 dark:text-gray-300">Name</TableHead>
                              <TableHead className="h-11 px-5 font-semibold text-gray-700 dark:text-gray-300">Position</TableHead>
                              <TableHead className="h-11 px-5 font-semibold text-gray-700 dark:text-gray-300">Status</TableHead>
                              <TableHead className="h-11 px-5 font-semibold text-gray-700 dark:text-gray-300">Filing Year</TableHead>
                              <TableHead className="h-11 px-5 font-semibold text-gray-700 dark:text-gray-300">Term / Removed</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.members.map((member, index) => (
                              <motion.tr
                                key={member.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.02 }}
                                className="border-b border-border last:border-0 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors"
                              >
                                <TableCell className="px-5 py-3">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold text-purple-600 dark:text-purple-400"
                                      style={{ background: `linear-gradient(135deg, ${BRAND.fromMuted}, ${BRAND.toMuted})` }}
                                    >
                                      {(member.name || "?").charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-medium text-foreground">{member.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="px-5 py-3 text-muted-foreground">
                                  {member.position || "—"}
                                </TableCell>
                                <TableCell className="px-5 py-3">
                                  <StatusBadge status={member.status} />
                                </TableCell>
                                <TableCell className="px-5 py-3 text-muted-foreground">
                                  {member.tax_year ? <span className="font-medium">{member.tax_year}</span> : "—"}
                                </TableCell>
                                <TableCell className="px-5 py-3 text-sm text-muted-foreground">
                                  <div className="space-y-0.5">
                                    {member.term_end_date && <span className="block">End: {formatDate(member.term_end_date)}</span>}
                                    {member.removed_date && (
                                      <span className="block text-xs text-red-600 dark:text-red-400">
                                        Removed: {formatDate(member.removed_date)}
                                      </span>
                                    )}
                                    {!member.term_end_date && !member.removed_date && "—"}
                                  </div>
                                </TableCell>
                              </motion.tr>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      )}
                    </motion.div>
                    )
                  })}
                </div>

                {/* Pagination */}
                {members.last_page > 1 && (
                  <div className="flex flex-col items-center justify-between gap-4 border-t border-border bg-muted/30 px-6 py-4 sm:flex-row">
                    <p className="text-sm text-muted-foreground">
                      Showing <span className="font-medium text-foreground">{members.from}</span> to{" "}
                      <span className="font-medium text-foreground">{members.to}</span> of{" "}
                      <span className="font-medium text-foreground">{members.total}</span> members
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {members.links.map((link: { url: string | null; label: string; active: boolean }, index: number) => (
                        <Button
                          key={index}
                          variant={link.active ? "default" : "outline"}
                          size="sm"
                          className={link.active ? "min-w-9 text-white shadow-lg" : "min-w-9 border-purple-300 dark:border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:border-purple-400"}
                          style={link.active ? { background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` } : undefined}
                          onClick={() => link.url && router.get(link.url)}
                          disabled={!link.url}
                          dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </AppLayout>
  )
}
