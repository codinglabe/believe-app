"use client"

import { useEffect, useState } from "react"
import { Link, router } from "@inertiajs/react" // Added import for route
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table" // Corrected import path for Table
import { Eye, ChevronLeft, ChevronRight, CheckCircle, Clock, XCircle, Ban, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import AppLayout from "@/layouts/app-layout"
// import AppLayout from "@/layouts/app-layout" // REMOVED: AppLayout should be in the parent page

// Define the BuyerDetail interface as it's now part of the Referral object
interface BuyerDetail {
  id: number
  name: string
  email: string
  amount_invested: number
  commission_earned: number
  status: "pending" | "completed" | "canceled" | "failed"
  sold_at: string
}

interface Referral {
  id: number
  referrer_name: string
  node_boss_name: string
  referral_link_used: string
  total_amount_invested: number // Changed from amount_invested
  total_commission_earned: number // Changed from commission_earned
  status: "pending" | "completed" | "canceled" | "failed"
  created_at: string
  buyers: BuyerDetail[] // Added array of buyers
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

interface ReferralTableProps {
  referrals: LaravelPagination<Referral>
  filters: {
    referrals_search: string
    referrals_status: string
  }
  nodeBossId: number
}

export default function ReferralTable({ referrals, filters, nodeBossId }: ReferralTableProps) {
  const [referralsSearch, setReferralsSearch] = useState(filters.referrals_search)
  const [referralsStatus, setReferralsStatus] = useState(filters.referrals_status)

  useEffect(() => {
    if (!referralsSearch && !referralsStatus) {
      return
    }
    const timeoutId = setTimeout(() => {
      const params: Record<string, string> = {}
      if (referralsSearch.trim()) params.referrals_search = referralsSearch
      if (referralsStatus) params.referrals_status = referralsStatus

      router.get(route("node-boss.show", nodeBossId), params, {
        preserveState: true,
        preserveScroll: true,
        replace: true,
      })
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [referralsSearch, referralsStatus, nodeBossId])

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

  const getNumericLinks = (links: LaravelPagination<any>["links"]) => {
    return links.filter((link) => {
      const label = link.label.replace(/&laquo;|&raquo;/g, "").trim()
      return !isNaN(Number(label)) && label !== "Previous" && label !== "Next"
    })
  }

  return (
    <AppLayout>
      {/* REMOVED: AppLayout should be in the parent page */}
      <div className="m-10">
        <Card className="shadow-lg hover:shadow-xl transition-all duration-300 animate-in slide-in-from-left duration-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900 dark:text-white">
            <Share2 className="h-5 w-5 text-orange-600" />
            Referrals ({referrals.total})
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="flex-1">
              <Input
                placeholder="Search by Referrer, Node Boss, or Status..." // Updated placeholder
                value={referralsSearch}
                onChange={(e) => setReferralsSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Referrer</TableHead>
                  <TableHead className="font-semibold">Buyers Count</TableHead> {/* Updated Table Head */}
                  <TableHead className="font-semibold">Node Boss</TableHead>
                  <TableHead className="font-semibold">Total Invested</TableHead> {/* Updated Table Head */}
                  <TableHead className="font-semibold">Total Commission</TableHead> {/* Updated Table Head */}
                  <TableHead className="font-semibold">Status</TableHead>
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
                      <TableCell className="font-medium">{referral.referrer_name}</TableCell>
                      <TableCell>
                        {referral.buyers.length > 0 ? (
                          <Badge variant="secondary" className="text-xs">
                            {referral.buyers.length} Buyer{referral.buyers.length !== 1 ? "s" : ""}
                          </Badge>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>{referral.node_boss_name}</TableCell>
                      <TableCell className="text-green-600 dark:text-green-400 font-semibold">
                        ${Number(referral.total_amount_invested).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-blue-600 dark:text-blue-400 font-semibold">
                        $
                        {Number(referral.total_commission_earned).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(referral.status)}>
                          {getStatusIcon(referral.status)}
                          <span className="ml-1">{referral.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Link href={route("node-referral.show", referral.id)}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No referrals found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {referrals.last_page > 1 && (
            <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between pt-6 sm:pt-8">
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
                Showing <span className="font-medium text-gray-900 dark:text-white">{referrals.from || 0}</span> to{" "}
                <span className="font-medium text-gray-900 dark:text-white">{referrals.to || 0}</span> of{" "}
                <span className="font-medium text-gray-900 dark:text-white">{referrals.total}</span> referrals
              </div>
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
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
      </div>
    </AppLayout>
  )
}
