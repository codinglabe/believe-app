"use client"

import React, { useState } from "react"
import { Head, Link, router } from "@inertiajs/react"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/frontend/ui/card"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Badge } from "@/components/frontend/ui/badge"
import { 
  Clock, 
  Gift, 
  Calendar, 
  Search, 
  X,
  Building2,
  User,
  FileText,
  TrendingUp,
} from "lucide-react"

interface Timesheet {
  id: number
  work_date: string
  hours: number
  description: string
  notes: string
  created_at: string
  job_application: {
    id: number
    job_post: {
      id: number
      title: string
    }
  }
  organization: {
    id: number
    name: string
  }
  created_by: {
    id: number
    name: string
  }
}

interface PaginationLink {
  url: string | null
  label: string
  active: boolean
}

interface PaginationData {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from?: number
  to?: number
  links: PaginationLink[]
}

interface PageProps {
  timesheets: {
    data: Timesheet[]
  } & PaginationData
  reward_points: number
  total_hours: number
  total_reward_points: number
  hourly_rate: number
  filters: {
    per_page: number
    page: number
    search: string
    work_date: string
  }
}

export default function Timesheet({ 
  timesheets, 
  reward_points, 
  total_hours, 
  total_reward_points,
  hourly_rate,
  filters 
}: PageProps) {
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState(filters.search)
  const [workDate, setWorkDate] = useState(filters.work_date || '')

  const formatTime = (decimalHours: number): string => {
    const totalSeconds = Math.round(decimalHours * 3600)
    const hours = Math.floor(totalSeconds / 3600)
    const remainingSeconds = totalSeconds % 3600
    const minutes = Math.floor(remainingSeconds / 60)
    const seconds = remainingSeconds % 60
    
    const parts: string[] = []
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0) parts.push(`${minutes}m`)
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`)
    
    return parts.join(' ')
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setLoading(true)
    router.get(
      "/profile/timesheet",
      {
        per_page: filters.per_page,
        page: 1,
        search: value,
      },
      {
        preserveState: false,
        onFinish: () => setLoading(false),
      },
    )
  }

  const handleWorkDateChange = (value: string) => {
    setWorkDate(value)
    setLoading(true)
    router.get(
      "/profile/timesheet",
      {
        per_page: filters.per_page,
        page: 1,
        work_date: value,
      },
      {
        preserveState: false,
        onFinish: () => setLoading(false),
      },
    )
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || page > timesheets.last_page) return
    setLoading(true)
    const params: any = {
      per_page: filters.per_page,
      page: page,
    }
    // Only include search if it exists
    if (filters.search) {
      params.search = filters.search
    }
    // Only include work_date if it exists
    if (filters.work_date) {
      params.work_date = filters.work_date
    }
    router.get(
      "/profile/timesheet",
      params,
      {
        preserveState: false,
        onFinish: () => setLoading(false),
      },
    )
  }

  return (
    <ProfileLayout title="Volunteer Time Sheet" description="View your volunteer hours and earned reward points">
      <Head title="Volunteer Time Sheet" />
      
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Reward Points Card */}
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Current Points</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {reward_points.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Gift className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Hours Card */}
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Hours</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatTime(total_hours)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Reward Points Card */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Earned</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {total_reward_points.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hourly Rate Card */}
          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Rate/Hour</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {hourly_rate.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Section */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 z-10" />
                <Input
                  type="text"
                  placeholder="Search by position or description..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => handleSearch('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 z-10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="relative flex items-center gap-2 w-full sm:w-[180px]">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 z-10" />
                <Input
                  id="workDate"
                  type="date"
                  value={workDate}
                  onChange={(e) => handleWorkDateChange(e.target.value)}
                  className="w-full pl-10 pr-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  placeholder="Work Date"
                />
                {workDate && (
                  <button
                    type="button"
                    onClick={() => handleWorkDateChange('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 z-10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timesheet Entries */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Time Sheet Entries</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {timesheets.total > 0 
                  ? `Showing ${timesheets.from || 0} to ${timesheets.to || 0} of ${timesheets.total} entries`
                  : 'No time sheet entries found'
                }
              </p>
            </div>
          </div>

          {timesheets.data.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {timesheets.data.map((timesheet) => {
                const earnedPoints = timesheet.hours * hourly_rate
                return (
                  <Card
                    key={timesheet.id}
                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 overflow-hidden relative group"
                  >
                    {/* Decorative gradient header */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                    
                    <CardContent className="p-5">
                      {/* Header with date and icon */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-md">
                            <Calendar className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-base">
                              {formatDate(timesheet.work_date)}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {new Date(timesheet.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Position Badge */}
                      <div className="mb-4">
                        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 text-xs font-medium px-2.5 py-1">
                          {timesheet.job_application.job_post.title}
                        </Badge>
                      </div>

                      {/* Hours and Points */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800">
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Hours</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatTime(timesheet.hours)}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800">
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Points</p>
                          <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                            +{earnedPoints.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      {/* Organization and Creator */}
                      <div className="space-y-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300 truncate">{timesheet.organization.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-600 dark:text-gray-400 truncate">Logged by {timesheet.created_by.name}</span>
                        </div>
                      </div>

                      {/* Description */}
                      {timesheet.description && (
                        <div className="mt-4">
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Description</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 leading-relaxed">
                            {timesheet.description}
                          </p>
                        </div>
                      )}

                      {/* Notes */}
                      {timesheet.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Notes</p>
                          <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                            <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 italic">
                              {timesheet.notes}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="py-12">
                <div className="text-center">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No time sheet entries found</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {filters.search || filters.work_date
                      ? "Try adjusting your search or filter criteria"
                      : "You don't have any time sheet entries yet."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {timesheets.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing <span className="font-medium text-gray-900 dark:text-white">{timesheets.from?.toLocaleString() || 0}</span> to{" "}
                  <span className="font-medium text-gray-900 dark:text-white">{timesheets.to?.toLocaleString() || 0}</span> of{" "}
                  <span className="font-medium text-gray-900 dark:text-white">{timesheets.total.toLocaleString()}</span> entries
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(timesheets.current_page - 1)}
                    disabled={!timesheets.links.find(link => link.label === '&laquo; Previous')?.url || loading}
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  >
                    Previous
                  </Button>
                  <div className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">
                    Page <span className="font-medium text-gray-900 dark:text-white">{timesheets.current_page}</span> of{" "}
                    <span className="font-medium text-gray-900 dark:text-white">{timesheets.last_page}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(timesheets.current_page + 1)}
                    disabled={!timesheets.links.find(link => link.label === 'Next &raquo;')?.url || loading}
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
        </div>
      </div>
    </ProfileLayout>
  )
}

