"use client"

import { useEffect, useState } from "react"
import { Head, Link, router } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/admin/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Badge } from "@/components/admin/ui/badge"
import { Input } from "@/components/admin/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table"
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  Users,
  DollarSign,
  TrendingUp,
  Crown,
  Star,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  Shield,
  Copy,
  ExternalLink,
  UserCheck,
} from "lucide-react"
import { showSuccessToast } from "@/lib/toast"
import type { Auth } from "@/types"
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal"

interface Buyer {
  id: number
  name: string
  email: string
  amount_invested: number
  commission_earned: number
  status: string
  is_big_boss: boolean
  certificate_id: string
  transaction_id: string
  payment_method: string
  purchase_date: string
  sold_at: string
  user_info?: {
    id: number
    name: string
    email: string
  }
}

interface ParentReferrer {
  id: number
  name: string
  is_big_boss: boolean
}

interface Referral {
  id: number
  referrer_name: string
  referrer_email: string
  node_boss_name: string
  referral_link_used: string
  full_referral_url: string
  total_amount_invested: number
  total_commission_earned: number
  commission_percentage: number
  is_big_boss: boolean
  level: number
  parent_referrer: ParentReferrer | null
  child_referrals_count: number
  total_sales_count: number
  completed_sales_count: number
  status: string
  referral_status: string
  created_at: string
  updated_at: string
  buyers: Buyer[]
  total_user_commissions_earned: number
}

interface LaravelPagination<T> {
  data: T[]
  current_page: number
  first_page_url: string
  from: number | null
  last_page: number
  last_page_url: string
  links: Array<{
    url: string | null
    label: string
    active: boolean
  }>
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number | null
  total: number
}

interface Statistics {
  total_referrals: number
  big_boss_referrals: number
  regular_referrals: number
  active_referrals: number
  total_commissions_paid: number
}

interface Props {
  auth: Auth
  referrals: LaravelPagination<Referral>
  filters: {
    referrals_search: string
    referrals_status: string
    referrals_type: string
  }
  statistics: Statistics
}

export default function Index({ referrals, filters, statistics }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  // Filter states
  const [referralsSearch, setReferralsSearch] = useState(filters.referrals_search || "")
  const [referralsStatus, setReferralsStatus] = useState(filters.referrals_status || "")
  const [referralsType, setReferralsType] = useState(filters.referrals_type || "")

  // Modal states
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    id: number | null
    title: string
    message: string
  }>({
    isOpen: false,
    id: null,
    title: "",
    message: "",
  })

  const [isDeleting, setIsDeleting] = useState(false)

  // Auto-filter with debounce
  useEffect(() => {
    if (!referralsSearch && !referralsStatus && !referralsType) {
      return
    }

    const timeoutId = setTimeout(() => {
      const params: Record<string, string> = {}
      if (referralsSearch.trim()) params.referrals_search = referralsSearch
      if (referralsStatus) params.referrals_status = referralsStatus
      if (referralsType) params.referrals_type = referralsType

      router.get(route("node-referral.index"), params, {
        preserveState: true,
        preserveScroll: true,
        replace: true,
      })
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [referralsSearch, referralsStatus, referralsType])

  const clearAllFilters = () => {
    setReferralsSearch("")
    setReferralsStatus("")
    setReferralsType("")
    router.get(
      route("node-referral.index"),
      {},
      {
        preserveState: true,
        preserveScroll: true,
        replace: true,
      },
    )
  }

  const handleDeleteConfirm = () => {
    if (!deleteModal.id) return
    setIsDeleting(true)
    router.delete(route("node-referral.destroy", deleteModal.id), {
      preserveScroll: true,
      onSuccess: () => {
        setDeleteModal({ isOpen: false, id: null, title: "", message: "" })
        showSuccessToast("Referral deleted successfully.")
      },
      onFinish: () => {
        setIsDeleting(false)
      },
    })
  }

  const openDeleteModal = (id: number, referrerName: string) => {
    setDeleteModal({
      isOpen: true,
      id,
      title: "Delete Referral",
      message: `Are you sure you want to delete the referral for ${referrerName}? This action cannot be undone.`,
    })
  }

  const copyReferralLink = async (url: string, referrerName: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedLink(url)
      showSuccessToast(`Referral link for ${referrerName} copied to clipboard!`)
      setTimeout(() => setCopiedLink(null), 2000)
    } catch (err) {
      console.error("Failed to copy: ", err)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-3 w-3" />
      case "pending":
        return <Clock className="h-3 w-3" />
      case "failed":
        return <XCircle className="h-3 w-3" />
      case "canceled":
        return <Ban className="h-3 w-3" />
      case "active":
        return <CheckCircle className="h-3 w-3" />
      case "inactive":
        return <XCircle className="h-3 w-3" />
      default:
        return null
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
      case "active":
        return "default"
      case "pending":
        return "secondary"
      case "failed":
        return "destructive"
      case "canceled":
      case "inactive":
        return "outline"
      default:
        return "outline"
    }
  }

  const getReferralTypeIcon = (isBigBoss: boolean, level: number) => {
    if (isBigBoss) {
      return <Crown className="h-4 w-4 text-amber-500" />
    } else if (level === 1) {
      return <Star className="h-4 w-4 text-blue-500" />
    } else {
      return <Users className="h-4 w-4 text-gray-500" />
    }
  }

  const getReferralTypeBadge = (isBigBoss: boolean, level: number) => {
    if (isBigBoss) {
      return (
        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 max-w-max">
          <Crown className="h-3 w-3 mr-1" />
          Big Boss
        </Badge>
      )
    } else if (level === 1) {
      return (
        <Badge variant="default" className="bg-blue-500 text-white max-w-max">
          <Star className="h-3 w-3 mr-1" />
          Level {level}
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary" className="max-w-max">
          <Users className="h-3 w-3 mr-1" />
          Level {level}
        </Badge>
      )
    }
  }

  // Helper function to get numeric page links only
  const getNumericLinks = (links: LaravelPagination<any>["links"]) => {
    return links.filter((link) => {
      const label = link.label.replace(/&laquo;|&raquo;/g, "").trim()
      return !isNaN(Number(label)) && label !== "Previous" && label !== "Next"
    })
  }

  const hasActiveFilters = referralsSearch || referralsStatus || referralsType

  return (
    <AppLayout>
      <Head title="Referral Management" />
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 m-10">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2 animate-in slide-in-from-left duration-700">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
              Referral Management
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-400">
              Manage referral links and track commission earnings
            </p>
          </div>
          <div className="animate-in slide-in-from-right duration-700">
            <Link href={route("node-referral.create")}>
              <Button
                size="lg"
                className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Create Referral</span>
                <span className="sm:hidden">Create</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Referrals</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics.total_referrals}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Big Boss</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {statistics.big_boss_referrals}
                  </p>
                </div>
                <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                  <Crown className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Regular</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{statistics.regular_referrals}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                  <Star className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{statistics.active_referrals}</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
                  <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Commissions</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ${Number(statistics.total_commissions_paid).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referrals Table */}
        <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900 dark:text-white">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Referrals ({referrals.total})
              </CardTitle>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="hover:scale-105 transition-all duration-200 bg-transparent text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Search and Filter Controls */}
            <div className="flex flex-col lg:flex-row gap-3 mt-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by referrer name, email, node boss, or referral link..."
                  value={referralsSearch}
                  onChange={(e) => setReferralsSearch(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex gap-3">
                <select
                  value={referralsStatus}
                  onChange={(e) => setReferralsStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="canceled">Canceled</option>
                </select>
                <select
                  value={referralsType}
                  onChange={(e) => setReferralsType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">All Types</option>
                  <option value="big_boss">Big Boss</option>
                  <option value="regular">Regular</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Referrer</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Node Boss</TableHead>
                    <TableHead className="font-semibold">Commission %</TableHead>
                    <TableHead className="font-semibold">Sales</TableHead>
                    <TableHead className="font-semibold">Total Invested</TableHead>
                    <TableHead className="font-semibold">Total Commission Earned (User)</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Referral Link</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.data.length > 0 ? (
                    referrals.data.map((referral) => (
                      <TableRow
                        key={referral.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200"
                      >
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-gray-900 dark:text-white">{referral.referrer_name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{referral.referrer_email}</div>
                            {referral.parent_referrer && (
                              <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                Referred by: {referral.parent_referrer.name}
                                {referral.parent_referrer.is_big_boss && <Crown className="h-3 w-3 text-amber-500" />}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {getReferralTypeBadge(referral.is_big_boss, referral.level)}
                            {referral.child_referrals_count > 0 && (
                              <p className="max-w-max text-xs text-gray-500 dark:text-gray-400">
                                {referral.child_referrals_count} sub-referrals
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-blue-600 dark:text-blue-400">
                          {referral.node_boss_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-semibold">
                            {referral.commission_percentage}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {referral.completed_sales_count}/{referral.total_sales_count}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">completed</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-green-600 dark:text-green-400 font-semibold">
                          ${Number(referral.total_amount_invested).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-purple-600 dark:text-purple-400 font-semibold">
                          ${Number(referral.total_user_commissions_earned).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={getStatusVariant(referral.status)}>
                              {getStatusIcon(referral.status)}
                              <span className="ml-1">{referral.status}</span>
                            </Badge>
                            <Badge
                              variant={referral.referral_status === "active" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {referral.referral_status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="text-xs font-mono text-gray-600 dark:text-gray-400 max-w-[100px] truncate">
                              {referral.referral_link_used}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyReferralLink(referral.full_referral_url, referral.referrer_name)}
                              >
                                {copiedLink === referral.full_referral_url ? (
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                              <Link href={referral.full_referral_url} target="_blank">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Link href={route("node-referral.show", referral.id)}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={route("node-referral.edit", referral.id)}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => openDeleteModal(referral.id, referral.referrer_name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No referrals found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Laravel Pagination */}
            {referrals.last_page > 1 && (
              <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between pt-6 sm:pt-8">
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
                  Showing <span className="font-medium text-gray-900 dark:text-white">{referrals.from || 0}</span> to{" "}
                  <span className="font-medium text-gray-900 dark:text-white">{referrals.to || 0}</span> of{" "}
                  <span className="font-medium text-gray-900 dark:text-white">{referrals.total}</span> referrals
                </div>
                <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                  {/* Previous Button */}
                  {referrals.prev_page_url && (
                    <Link href={referrals.prev_page_url}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:shadow-md transition-all duration-200 hover:scale-110"
                      >
                        <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </Link>
                  )}
                  {/* Page Numbers */}
                  {getNumericLinks(referrals.links).map((link, index) => (
                    <div key={index}>
                      {link.url ? (
                        <Link href={link.url}>
                          <Button
                            variant={link.active ? "default" : "outline"}
                            size="sm"
                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 hover:scale-110 ${
                              link.active
                                ? "bg-blue-600 text-white shadow-lg scale-110"
                                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:shadow-md"
                            }`}
                          >
                            {link.label}
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full text-xs sm:text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                        >
                          {link.label}
                        </Button>
                      )}
                    </div>
                  ))}
                  {/* Next Button */}
                  {referrals.next_page_url && (
                    <Link href={referrals.next_page_url}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:shadow-md transition-all duration-200 hover:scale-110"
                      >
                        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="rounded-lg p-6 shadow-xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Loading...</p>
            </div>
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, title: "", message: "" })}
        onConfirm={handleDeleteConfirm}
        title={deleteModal.title}
        message={deleteModal.message}
        isLoading={isDeleting}
      />
    </AppLayout>
  )
}
