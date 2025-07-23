"use client"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { useState, useEffect, useRef } from "react"
import {
  DollarSign,
  Eye,
  Download,
  Calendar,
  TrendingUp,
  Activity,
  CheckCircle,
  Clock,
  XCircle,
  Ban,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Input } from "@/components/frontend/ui/input"
import { usePage, router, Link } from "@inertiajs/react"

interface NodeBossShare {
  id: number
  node_boss_name: string
  node_id: string
  amount: number
  status: string
  purchase_date: string
  certificate_id: string
  message?: string
  node_boss_image?: string
}

interface ShareStats {
  total_invested: number
  total_shares: number
  completed_shares: number
  pending_shares: number
}

interface PageProps {
  userShares: {
    data: NodeBossShare[]
    total: number
    current_page: number
    last_page: number
    per_page: number
  }
  shareStats: ShareStats
  filters: {
    search: string
    status: string
  }
}

export default function ProfileNodeBossShares() {
  const { userShares, shareStats, filters } = usePage<PageProps>().props
  const [search, setSearch] = useState(filters.search)
  const [statusFilter, setStatusFilter] = useState(filters.status)
  const isInitialMount = useRef(true)

  // Auto-filter when search/status changes, but not on initial mount or pagination
  useEffect(() => {
    // Skip the effect on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    // Only trigger search when search or status filter changes
    const params: Record<string, string> = {}
    if (search.trim()) params.search = search
    if (statusFilter) params.status = statusFilter

    // Preserve the current page if it exists in the URL
    const urlParams = new URLSearchParams(window.location.search)
    const currentPage = urlParams.get("page")
    if (currentPage) params.page = currentPage

    router.get("/nodeboss/shares", params, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    })
  }, [search, statusFilter])

  const clearFilters = () => {
    setSearch("")
    setStatusFilter("")

    // Preserve the current page when clearing filters
    const urlParams = new URLSearchParams(window.location.search)
    const currentPage = urlParams.get("page")

    const params: Record<string, string> = {}
    if (currentPage) params.page = currentPage

    router.get("/nodeboss/shares", params, {
      preserveState: true,
      preserveScroll: true,
    })
  }

  // Handle pagination separately to avoid conflicts with search debounce
  const handlePageChange = (page: number) => {
    const params: Record<string, string> = {}

    // Preserve current search and filters
    if (search.trim()) params.search = search
    if (statusFilter) params.status = statusFilter

    // Set the page parameter
    params.page = page.toString()

    router.get("/nodeboss/shares", params, {
      preserveState: true,
      preserveScroll: true,
    })
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
      default:
        return null
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "pending":
        return "secondary"
      case "failed":
        return "destructive"
      case "canceled":
        return "outline"
      default:
        return "outline"
    }
  }

  const viewCertificate = (shareId: number) => {
    router.visit(`/certificate/${shareId}`)
  }

  const downloadCertificate = (shareId: number) => {
    window.open(`/certificate/${shareId}/download`, "_blank")
  }

  const hasActiveFilters = search || statusFilter

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 dark:text-green-400"
      case "pending":
        return "text-yellow-600 dark:text-yellow-400"
      case "failed":
        return "text-red-600 dark:text-red-400"
      case "canceled":
        return "text-gray-600 dark:text-gray-400"
      default:
        return "text-gray-600 dark:text-gray-400"
    }
  }

  return (
    <ProfileLayout title="My NodeBoss Shares" description="Track your NodeBoss investments and share certificates">
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Invested</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    ${shareStats.total_invested.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-green-500 rounded-full">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-3 h-1 w-full bg-green-200 dark:bg-green-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: "100%" }}></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Shares</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{shareStats.total_shares}</p>
                </div>
                <div className="p-3 bg-blue-500 rounded-full">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-3 h-1 w-full bg-blue-200 dark:bg-blue-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: "100%" }}></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Completed</p>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {shareStats.completed_shares}
                  </p>
                </div>
                <div className="p-3 bg-purple-500 rounded-full">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-3 h-1 w-full bg-purple-200 dark:bg-purple-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{
                    width: `${shareStats.total_shares ? (shareStats.completed_shares / shareStats.total_shares) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Pending</p>
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{shareStats.pending_shares}</p>
                </div>
                <div className="p-3 bg-orange-500 rounded-full">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-3 h-1 w-full bg-orange-200 dark:bg-orange-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full"
                  style={{
                    width: `${shareStats.total_shares ? (shareStats.pending_shares / shareStats.total_shares) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="border border-gray-200 dark:border-gray-600 shadow-md hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by project name, node ID, or certificate ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-w-[120px] focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>
              {hasActiveFilters && (
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  size="sm"
                  className="bg-red-50 hover:bg-red-100 text-red-600 border-red-300 hover:border-red-400"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Shares List */}
        {userShares.data.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {userShares.data.map((share, index) => (
              <Card
                key={share.id}
                className="border border-gray-200 dark:border-gray-600 hover:shadow-lg dark:bg-gray-900 transition-all duration-300 hover:scale-[1.01] animate-in fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* <div className="relative">
                      <img
                        src={
                          share.node_boss_image
                            ? `/storage/${share.node_boss_image}`
                            : "/placeholder.svg?height=64&width=64"
                        }
                        alt={share.node_boss_name}
                        width={64}
                        height={64}
                        className="rounded-lg flex-shrink-0 object-cover"
                      />
                      <Badge variant={getStatusVariant(share.status)} className="absolute -bottom-2 -right-2">
                        {getStatusIcon(share.status)}
                      </Badge>
                    </div> */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate text-sm sm:text-base">
                            {share.node_boss_name}
                          </h4>
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-2">
                            <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
                              {share.node_id}
                            </code>
                            <span className={`capitalize ${getStatusColor(share.status)}`}>{share.status}</span>
                          </div>
                          {share.message && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2 italic">
                              "{share.message}"
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {share.status === "completed" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => viewCertificate(share.id)}
                                className="bg-blue-600 hover:bg-blue-700 hover:scale-105 transition-transform"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadCertificate(share.id)}
                                className="border-gray-300 dark:border-gray-600 hover:scale-105 transition-transform"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1 text-xs sm:text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Investment Amount:</span>
                          <span className="font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {Number(share.amount).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Purchase Date:</span>
                          <span className="text-gray-900 dark:text-white flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(share.purchase_date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        {share.certificate_id && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Certificate ID:</span>
                            <code className="text-xs font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                              {share.certificate_id}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <Activity className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {hasActiveFilters ? "No shares found" : "No NodeBoss shares yet"}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
              {hasActiveFilters
                ? "Try adjusting your search filters to find your shares."
                : "Start investing in NodeBoss projects to build your portfolio and track your shares here."}
            </p>
            {!hasActiveFilters && (
              <Link href="/node-boss">
                <Button className="bg-blue-600 hover:bg-blue-700 hover:scale-105 transition-transform">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Browse NodeBoss Projects
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Pagination */}
        {userShares.last_page > 1 && (
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between pt-6">
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
              Showing{" "}
              <span className="font-medium text-gray-900 dark:text-white">
                {(userShares.current_page - 1) * userShares.per_page + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.min(userShares.current_page * userShares.per_page, userShares.total)}
              </span>{" "}
              of <span className="font-medium text-gray-900 dark:text-white">{userShares.total}</span> shares
            </div>
            <div className="flex items-center justify-center space-x-2">
              {/* Previous Button */}
              {userShares.current_page > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(userShares.current_page - 1)}
                  className="w-10 h-10 rounded-full hover:shadow-md transition-all duration-200 hover:scale-110 bg-transparent p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}

              {/* Page Numbers */}
              {Array.from({ length: userShares.last_page }).map((_, index) => {
                const pageNumber = index + 1
                const isActive = pageNumber === userShares.current_page

                return (
                  <Button
                    key={pageNumber}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNumber)}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition-all duration-200 hover:scale-110 p-0 ${
                      isActive ? "bg-blue-600 text-white shadow-lg scale-110" : "hover:shadow-md"
                    }`}
                  >
                    {pageNumber}
                  </Button>
                )
              })}

              {/* Next Button */}
              {userShares.current_page < userShares.last_page && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(userShares.current_page + 1)}
                  className="w-10 h-10 rounded-full hover:shadow-md transition-all duration-200 hover:scale-110 bg-transparent p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </ProfileLayout>
  )
}
