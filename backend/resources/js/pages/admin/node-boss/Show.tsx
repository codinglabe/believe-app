"use client"

import { Head, Link, router } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table"
import {
  ArrowLeft,
  Edit,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  Share2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  Lock,
  Unlock,
} from "lucide-react"
import type { NodeBoss } from "@/types/nodeboss"
import type { Auth } from "@/types"
import { useState, useEffect } from "react"
import { Input } from "@/components/admin/ui/input"
import ShareEditModal from "@/components/admin/ShareEditModal"
import ShareViewModal from "@/components/admin/ShareViewModal"
import SoldShareEditModal from "@/components/admin/SoldShareEditModal"
import SoldShareViewModal from "@/components/admin/SoldShareViewModal"
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal"

interface Share {
  id: number
  node_id: string
  cost_of_node: number
  accumulate_cost: number
  reminder: number
  status: string
}

interface SoldShare {
  id: number
  name: string
  email: string
  node_id: string
  price: number
  status: string
  created_at: string
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

interface Props {
  auth: Auth
  nodeBoss: NodeBoss
  shares: LaravelPagination<Share>
  soldShares: LaravelPagination<SoldShare>
  filters: {
    shares_search: string
    shares_status: string
    sold_search: string
    sold_status: string
  }
}

export default function Show({ nodeBoss, shares, soldShares, filters }: Props) {
  const [sharesSearch, setSharesSearch] = useState(filters.shares_search)
  const [sharesStatus, setSharesStatus] = useState(filters.shares_status)
  const [soldSearch, setSoldSearch] = useState(filters.sold_search)
  const [soldStatus, setSoldStatus] = useState(filters.sold_status)

  // Modal states
  const [shareEditModal, setShareEditModal] = useState<{ isOpen: boolean; share: Share | null }>({
    isOpen: false,
    share: null,
  })
  const [shareViewModal, setShareViewModal] = useState<{ isOpen: boolean; share: Share | null }>({
    isOpen: false,
    share: null,
  })
  const [soldShareEditModal, setSoldShareEditModal] = useState<{ isOpen: boolean; soldShare: SoldShare | null }>({
    isOpen: false,
    soldShare: null,
  })
  const [soldShareViewModal, setSoldShareViewModal] = useState<{ isOpen: boolean; soldShare: SoldShare | null }>({
    isOpen: false,
    soldShare: null,
  })
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    type: "share" | "soldShare" | null
    id: number | null
    title: string
    message: string
  }>({
    isOpen: false,
    type: null,
    id: null,
    title: "",
    message: "",
  })

  const [isDeleting, setIsDeleting] = useState(false)

  // Auto-filter when search/status changes with debounce - only when there are actual values
  useEffect(() => {
    // Don't trigger on initial load if all values are empty
    if (!sharesSearch && !sharesStatus && !soldSearch && !soldStatus) {
      return
    }

    const timeoutId = setTimeout(() => {
      // Only include non-empty parameters in the request
      const params: Record<string, string> = {}

      if (sharesSearch.trim()) params.shares_search = sharesSearch
      if (sharesStatus) params.shares_status = sharesStatus
      if (soldSearch.trim()) params.sold_search = soldSearch
      if (soldStatus) params.sold_status = soldStatus

      router.get(route("node-boss.show", nodeBoss.id), params, {
        preserveState: true,
        preserveScroll: true,
        replace: true, // Use replace to avoid cluttering browser history
      })
    }, 500) // Increased to 500ms for better UX

    return () => clearTimeout(timeoutId)
  }, [sharesSearch, sharesStatus, soldSearch, soldStatus])

  // Add a separate effect to handle clearing filters
  const clearAllFilters = () => {
    setSharesSearch("")
    setSharesStatus("")
    setSoldSearch("")
    setSoldStatus("")

    // Navigate to clean URL without query parameters
    router.get(
      route("node-boss.show", nodeBoss.id),
      {},
      {
        preserveState: true,
        preserveScroll: true,
        replace: true,
      },
    )
  }

  const handleDeleteConfirm = () => {
    if (!deleteModal.id || !deleteModal.type) return

    setIsDeleting(true)
    router.delete(`/${deleteModal.type === "share" ? "node-shares" : "node-sells"}/${deleteModal.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        setDeleteModal({ isOpen: false, type: null, id: null, title: "", message: "" })
        router.reload()
      },
      onFinish: () => {
        setIsDeleting(false)
      },
    })
  }

  const openDeleteModal = (type: "share" | "soldShare", id: number, itemName: string) => {
    setDeleteModal({
      isOpen: true,
      type,
      id,
      title: `Delete ${type === "share" ? "Share" : "Sold Share"}`,
      message: `Are you sure you want to delete ${itemName}? This action cannot be undone.`,
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <Unlock className="h-3 w-3" />
      case "closed":
        return <Lock className="h-3 w-3" />
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
      case "open":
      case "completed":
        return "default"
      case "pending":
        return "secondary"
      case "failed":
        return "destructive"
      case "canceled":
        return "outline"
      case "closed":
        return "secondary"
      default:
        return "outline"
    }
  }

  const suggestedAmounts =
    typeof nodeBoss.suggested_amounts === "string"
      ? JSON.parse(nodeBoss.suggested_amounts)
      : nodeBoss.suggested_amounts || [10, 25, 50, 100]

  // Helper function to get numeric page links only
  const getNumericLinks = (links: LaravelPagination<any>["links"]) => {
    return links.filter((link) => {
      const label = link.label.replace(/&laquo;|&raquo;/g, "").trim()
      return !isNaN(Number(label)) && label !== "Previous" && label !== "Next"
    })
  }

  const hasActiveFilters = sharesSearch || sharesStatus || soldSearch || soldStatus

  return (
    <AppLayout>
      <Head title={`NodeBoss - ${nodeBoss.name}`} />
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 m-10">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-start sm:justify-between gap-4 animate-in slide-in-from-top duration-700">
          <div className="flex items-start gap-3 sm:gap-4 flex-1">
            <Link href={route("node-boss.index")}>
              <Button
                variant="outline"
                size="sm"
                className="hover:scale-105 transition-transform duration-200 bg-transparent"
              >
                <ArrowLeft className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </Link>
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl animate-pulse">
                <TrendingUp className="h-5 w-5 sm:h-7 sm:w-7 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white break-words">
                  {nodeBoss.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-3">
                  <Badge
                    variant={
                      nodeBoss.status === "active"
                        ? "default"
                        : nodeBoss.status === "inactive"
                          ? "secondary"
                          : "outline"
                    }
                    className="animate-in zoom-in duration-300"
                  >
                    {nodeBoss.status === "active" ? (
                      <CheckCircle className="mr-1 h-3 w-3" />
                    ) : nodeBoss.status === "inactive" ? (
                      <Clock className="mr-1 h-3 w-3" />
                    ) : (
                      <Edit className="mr-1 h-3 w-3" />
                    )}
                    {nodeBoss.status}
                  </Badge>
                  <Badge
                    variant={nodeBoss.is_closed ? "destructive" : "default"}
                    className="animate-in zoom-in duration-500"
                  >
                    {nodeBoss.is_closed ? <Lock className="mr-1 h-3 w-3" /> : <Unlock className="mr-1 h-3 w-3" />}
                    {nodeBoss.is_closed ? "Closed" : "Open"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 animate-in slide-in-from-right duration-700">
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
            <Button variant="outline" size="sm" className="hover:scale-105 transition-all duration-200 bg-transparent">
              <Share2 className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            <Link href={route("node-boss.edit", nodeBoss.id)}>
              <Button className="w-full sm:w-auto hover:scale-105 transition-all duration-200 shadow-lg">
                <Edit className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Edit NodeBoss</span>
                <span className="sm:hidden">Edit</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Tables Grid - Side by Side */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
          {/* Shares Table */}
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 animate-in slide-in-from-left duration-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900 dark:text-white">
                <DollarSign className="h-5 w-5 text-green-600" />
                Shares ({shares.total})
              </CardTitle>

              {/* Search and Filter Controls for Shares */}
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by Node ID, Cost, Sold, Remaining, or Status..."
                    value={sharesSearch}
                    onChange={(e) => setSharesSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <select
                    value={sharesStatus}
                    onChange={(e) => setSharesStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">All Status</option>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Node ID</TableHead>
                      <TableHead className="font-semibold">Cost Of Node</TableHead>
                      <TableHead className="font-semibold">Accumulate Cost</TableHead>
                      <TableHead className="font-semibold">Reminder</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shares.data.length > 0 ? (
                      shares.data.map((share) => (
                        <TableRow
                          key={share.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200"
                        >
                          <TableCell className="font-medium">{share.node_id}</TableCell>
                          <TableCell className="text-green-600 dark:text-green-400 font-semibold">
                            ${Number(share.cost_of_node).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-blue-600 dark:text-blue-400 font-semibold">
                            ${Number(share.accumulate_cost).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-orange-600 dark:text-orange-400 font-semibold">
                            ${Number(share.reminder).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(share.status)}>
                              {getStatusIcon(share.status)}
                              <span className="ml-1">{share.status}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setShareViewModal({ isOpen: true, share })}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setShareEditModal({ isOpen: true, share })}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                onClick={() => openDeleteModal("share", share.id, share.node_id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                          No shares found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Laravel Pagination for Shares */}
              {shares.last_page > 1 && (
                <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between pt-6 sm:pt-8">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
                    Showing <span className="font-medium text-gray-900 dark:text-white">{shares.from || 0}</span> to{" "}
                    <span className="font-medium text-gray-900 dark:text-white">{shares.to || 0}</span> of{" "}
                    <span className="font-medium text-gray-900 dark:text-white">{shares.total}</span> shares
                  </div>
                  <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                    {/* Previous Button */}
                    {shares.prev_page_url && (
                      <Link href={shares.prev_page_url}>
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
                    {getNumericLinks(shares.links).map((link, index) => (
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
                    {shares.next_page_url && (
                      <Link href={shares.next_page_url}>
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

          {/* Sold Shares Table */}
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 animate-in slide-in-from-right duration-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900 dark:text-white">
                <Users className="h-5 w-5 text-purple-600" />
                Sold Shares ({soldShares.total})
              </CardTitle>

              {/* Search and Filter Controls for Sold Shares */}
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by Name, Email, Node ID, Price, or Status..."
                    value={soldSearch}
                    onChange={(e) => setSoldSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <select
                    value={soldStatus}
                    onChange={(e) => setSoldStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Node ID</TableHead>
                      <TableHead className="font-semibold">Price</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {soldShares.data.length > 0 ? (
                      soldShares.data.map((soldShare) => (
                        <TableRow
                          key={soldShare.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200"
                        >
                          <TableCell className="font-medium">{soldShare.name}</TableCell>
                          <TableCell className="text-blue-600 dark:text-blue-400 font-semibold">
                            {soldShare.node_id}
                          </TableCell>
                          <TableCell className="text-green-600 dark:text-green-400 font-semibold">
                            ${Number(soldShare.price).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(soldShare.status)}>
                              {getStatusIcon(soldShare.status)}
                              <span className="ml-1">{soldShare.status}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setSoldShareViewModal({ isOpen: true, soldShare })}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setSoldShareEditModal({ isOpen: true, soldShare })}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                onClick={() => openDeleteModal("soldShare", soldShare.id, soldShare.name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                          No sold shares found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Laravel Pagination for Sold Shares */}
              {soldShares.last_page > 1 && (
                <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between pt-6 sm:pt-8">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
                    Showing <span className="font-medium text-gray-900 dark:text-white">{soldShares.from || 0}</span> to{" "}
                    <span className="font-medium text-gray-900 dark:text-white">{soldShares.to || 0}</span> of{" "}
                    <span className="font-medium text-gray-900 dark:text-white">{soldShares.total}</span> sold shares
                  </div>
                  <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                    {/* Previous Button */}
                    {soldShares.prev_page_url && (
                      <Link href={soldShares.prev_page_url}>
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
                    {getNumericLinks(soldShares.links).map((link, index) => (
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
                    {soldShares.next_page_url && (
                      <Link href={soldShares.next_page_url}>
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
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Basic Information */}
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 animate-in slide-in-from-left duration-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900 dark:text-white">
                <TrendingUp className="h-5 w-5 text-blue-600 animate-pulse" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="space-y-2 animate-in fade-in duration-500">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Name</label>
                <p className="text-gray-900 dark:text-white font-medium text-sm sm:text-base break-words">
                  {nodeBoss.name}
                </p>
              </div>
              <div className="space-y-2 animate-in fade-in duration-700">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Status</label>
                <Badge
                  variant={
                    nodeBoss.status === "active" ? "default" : nodeBoss.status === "inactive" ? "secondary" : "outline"
                  }
                  className="hover:scale-105 transition-transform duration-200"
                >
                  {nodeBoss.status === "active" ? (
                    <CheckCircle className="mr-1 h-3 w-3" />
                  ) : nodeBoss.status === "inactive" ? (
                    <Clock className="mr-1 h-3 w-3" />
                  ) : (
                    <Edit className="mr-1 h-3 w-3" />
                  )}
                  {nodeBoss.status}
                </Badge>
              </div>
              <div className="space-y-2 animate-in fade-in duration-900">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Investment Status</label>
                <Badge
                  variant={nodeBoss.is_closed ? "destructive" : "default"}
                  className="hover:scale-105 transition-transform duration-200"
                >
                  {nodeBoss.is_closed ? <Lock className="mr-1 h-3 w-3" /> : <Unlock className="mr-1 h-3 w-3" />}
                  {nodeBoss.is_closed ? "Closed for Investment" : "Open for Investment"}
                </Badge>
              </div>
              <div className="space-y-2 animate-in fade-in duration-1000">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Created</label>
                <div className="flex items-center gap-2 text-gray-900 dark:text-white text-sm sm:text-base">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  {new Date(nodeBoss.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
              <div className="space-y-2 animate-in fade-in duration-1100">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Last Updated</label>
                <div className="flex items-center gap-2 text-gray-900 dark:text-white text-sm sm:text-base">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  {new Date(nodeBoss.updated_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Investment Options */}
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 animate-in slide-in-from-right duration-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900 dark:text-white">
                <DollarSign className="h-5 w-5 text-green-600 animate-pulse" />
                Investment Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Suggested Amounts</label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {suggestedAmounts.map((amount: number, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-center p-3 sm:p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800 rounded-lg hover:scale-105 transition-all duration-200 animate-in zoom-in"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <span className="text-base sm:text-lg font-semibold text-green-600 dark:text-green-400">
                        ${amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-600 space-y-2 animate-in fade-in duration-1000">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Price:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{"$" + nodeBoss.price}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Shares:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{shares.total}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Sold Shares:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{soldShares.total}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        <Card className="shadow-lg hover:shadow-xl transition-all duration-300 animate-in slide-in-from-bottom duration-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900 dark:text-white">
              <Users className="h-5 w-5 text-purple-600 animate-pulse" />
              Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm sm:prose max-w-none dark:prose-invert">
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
                {nodeBoss.description}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Bar */}
        <div className="flex flex-col justify-end sm:flex-row gap-3 sm:gap-4 pt-6 border-t border-gray-200 dark:border-gray-600 animate-in slide-in-from-bottom duration-500">
          <Link href={route("node-boss.edit", nodeBoss.id)} className="flex-1 sm:flex-none">
            <Button className="w-full sm:w-auto hover:scale-105 transition-all duration-200 shadow-lg cursor-pointer">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button
            variant="outline"
            className="flex-1 sm:flex-none hover:scale-105 transition-all duration-200 bg-transparent cursor-pointer"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Link href={route("node-boss.index")} className="flex-1 sm:flex-none">
            <Button
              variant="outline"
              className="w-full sm:w-auto hover:scale-105 transition-all duration-200 bg-transparent cursor-pointer"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to List
            </Button>
          </Link>
        </div>
      </div>

      {/* Modals */}
      <ShareEditModal
        share={shareEditModal.share}
        isOpen={shareEditModal.isOpen}
        onClose={() => setShareEditModal({ isOpen: false, share: null })}
        onSuccess={() => router.reload()}
      />

      <ShareViewModal
        share={shareViewModal.share}
        isOpen={shareViewModal.isOpen}
        onClose={() => setShareViewModal({ isOpen: false, share: null })}
      />

      <SoldShareEditModal
        soldShare={soldShareEditModal.soldShare}
        isOpen={soldShareEditModal.isOpen}
        onClose={() => setSoldShareEditModal({ isOpen: false, soldShare: null })}
        onSuccess={() => router.reload()}
      />

      <SoldShareViewModal
        soldShare={soldShareViewModal.soldShare}
        isOpen={soldShareViewModal.isOpen}
        onClose={() => setSoldShareViewModal({ isOpen: false, soldShare: null })}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, type: null, id: null, title: "", message: "" })}
        onConfirm={handleDeleteConfirm}
        title={deleteModal.title}
        message={deleteModal.message}
        isLoading={isDeleting}
      />
    </AppLayout>
  )
}
