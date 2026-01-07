"use client"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { Download, Calendar, DollarSign, TrendingUp, Heart, Building2, FileText, CheckCircle2, Clock, XCircle, Search, Filter, ChevronLeft, ChevronRight, CreditCard } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Badge } from "@/components/frontend/ui/badge"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/frontend/ui/select"
import { Link, usePage, router } from "@inertiajs/react"
import { useState, useEffect, useRef } from "react"

interface Donation {
  id: number
  organization_name: string
  amount: number | string
  date: string
  status: string
  frequency?: string
  payment_method?: string | null
  impact?: string
  receipt_url?: string
}

interface PageProps {
  donations: Donation[]
  pagination: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
  }
  filters: {
    search: string
    status: string
  }
  totalDonated: number
  thisYearDonated: number
  organizationsSupported: number
}

export default function ProfileDonations() {
  const { donations, pagination, filters, totalDonated, thisYearDonated, organizationsSupported } = usePage<PageProps>().props
  const [search, setSearch] = useState(filters.search || '')
  const [statusFilter, setStatusFilter] = useState(filters.status || 'all')

  const handleExport = () => {
    // Handle export functionality
    window.open("/profile/donations/export", "_blank")
  }

  const handleDownloadReceipt = (receiptUrl: string) => {
    window.open(receiptUrl, "_blank")
  }

  // Debounced search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleSearchChange = (value: string) => {
    setSearch(value)

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      router.get('/profile/donations', {
        search: value,
        status: statusFilter,
        page: 1, // Reset to first page on search
      }, {
        preserveState: true,
        replace: true,
      })
    }, 500)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    router.get('/profile/donations', {
      search: search,
      status: value,
      page: 1, // Reset to first page on filter change
    }, {
      preserveState: true,
      replace: true,
    })
  }

  const handlePageChange = (page: number) => {
    router.get('/profile/donations', {
      search: search,
      status: statusFilter,
      page: page,
    }, {
      preserveState: true,
      replace: true,
    })
  }

  return (
    <ProfileLayout title="Donation History" description="Track all your donations and their impact">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Total Donated</p>
                  <p className="text-2xl font-bold">${typeof totalDonated === 'number' ? totalDonated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : totalDonated}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">This Year</p>
                  <p className="text-2xl font-bold">${typeof thisYearDonated === 'number' ? thisYearDonated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : thisYearDonated}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Organizations</p>
                  <p className="text-2xl font-bold">{organizationsSupported}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Section */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by organization name..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                />
              </div>

              {/* Status Filter */}
              <div className="w-full md:w-48">
                <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                  <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                  </SelectContent>
                </Select>
        </div>

        {/* Export Button */}
              <Button onClick={handleExport} variant="outline" className="bg-transparent whitespace-nowrap">
            <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
          </CardContent>
        </Card>

        {/* Donations List */}
        {donations.length > 0 ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {donations.map((donation) => {
              const getStatusIcon = () => {
                switch (donation.status) {
                  case 'completed':
                    return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  case 'pending':
                    return <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  case 'failed':
                    return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  default:
                    return <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                }
              }

              const getStatusColor = () => {
                switch (donation.status) {
                  case 'completed':
                    return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                  case 'pending':
                    return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300'
                  case 'failed':
                    return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                  default:
                    return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                }
              }

              return (
                <Card
                  key={donation.id}
                  className="border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800"
                >
                  <CardContent className="p-5 md:p-6">
                    {/* Header Section */}
                    <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                          <Building2 className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <h4 className="font-bold text-gray-900 dark:text-white text-base md:text-lg mb-1 break-words line-clamp-2">
                          {donation.organization_name}
                        </h4>
                        <Badge
                          variant="outline"
                            className={`${getStatusColor()} text-xs font-medium flex items-center gap-1.5 w-fit mt-1.5`}
                        >
                            {getStatusIcon()}
                            <span className="capitalize">{donation.status}</span>
                        </Badge>
                        </div>
                      </div>
                      </div>

                    {/* Amount Section */}
                    <div className="mb-4">
                      <div className="flex items-baseline gap-2">
                        <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">
                          {typeof donation.amount === 'string' ? donation.amount : donation.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-7">Donation Amount</p>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {new Date(donation.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <Heart className="h-4 w-4 text-red-500 dark:text-red-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Type</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate capitalize">
                            {donation.frequency === 'one-time' ? 'One-time' : donation.frequency === 'weekly' ? 'Weekly' : donation.frequency === 'monthly' ? 'Monthly' : 'One-time'}
                          </p>
                        </div>
                      </div>
                      {donation.payment_method && (
                        <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg col-span-2">
                          <CreditCard className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Payment Method</p>
                            <Badge
                              variant="outline"
                              className={`text-xs font-semibold ${
                                donation.payment_method === 'stripe'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-300 dark:border-blue-700'
                                  : donation.payment_method === 'believe_points'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 border-purple-300 dark:border-purple-700'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {donation.payment_method === 'stripe' ? 'Card/Stripe' : donation.payment_method === 'believe_points' ? 'Believe Points' : donation.payment_method}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Impact Message */}
                    {donation.impact && (
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg">
                        <div className="flex items-start gap-2">
                          <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                            {donation.impact}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                      {donation.receipt_url ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadReceipt(donation.receipt_url!)}
                          className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600"
                        >
                          <FileText className="h-4 w-4 mr-1.5" />
                          <span className="hidden sm:inline">Download</span>
                          <span className="sm:hidden">Receipt</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed"
                        >
                          <FileText className="h-4 w-4 mr-1.5" />
                          <span className="hidden sm:inline">Receipt</span>
                          <span className="sm:hidden">N/A</span>
                        </Button>
                      )}
                  </div>
                </CardContent>
              </Card>
              )
              })}
            </div>

            {/* Pagination */}
            {pagination && pagination.last_page > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing <span className="font-semibold text-gray-900 dark:text-white">{pagination.from}</span> to{' '}
                <span className="font-semibold text-gray-900 dark:text-white">{pagination.to}</span> of{' '}
                <span className="font-semibold text-gray-900 dark:text-white">{pagination.total}</span> donations
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                  disabled={pagination.current_page === 1}
                  className="bg-white dark:bg-gray-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Previous</span>
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                    let pageNum: number
                    if (pagination.last_page <= 5) {
                      pageNum = i + 1
                    } else if (pagination.current_page <= 3) {
                      pageNum = i + 1
                    } else if (pagination.current_page >= pagination.last_page - 2) {
                      pageNum = pagination.last_page - 4 + i
                    } else {
                      pageNum = pagination.current_page - 2 + i
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={pagination.current_page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className={
                          pagination.current_page === pageNum
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "bg-white dark:bg-gray-800"
                        }
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                  disabled={pagination.current_page === pagination.last_page}
                  className="bg-white dark:bg-gray-800"
                >
                  <span className="hidden sm:inline mr-1">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
          </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No donations yet</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
              Start making a difference by supporting organizations you care about.
                          </p>
                          <Button className="bg-blue-600 hover:bg-blue-700">
            <Link className="flex items-center" href={route("donate")}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Make Your First Donation
            </Link>
                          </Button>
          </div>
        )}
      </div>
    </ProfileLayout>
  )
}
