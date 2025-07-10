"use client"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { Download, Calendar, DollarSign, TrendingUp } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Badge } from "@/components/frontend/ui/badge"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { usePage } from "@inertiajs/react"

interface Donation {
  id: number
  organization_name: string
  amount: number
  date: string
  status: string
  impact?: string
  receipt_url?: string
}

interface PageProps {
  donations: Donation[]
  totalDonated: number
  thisYearDonated: number
  organizationsSupported: number
}

export default function ProfileDonations() {
  const { donations, totalDonated, thisYearDonated, organizationsSupported } = usePage<PageProps>().props

  const handleExport = () => {
    // Handle export functionality
    window.open("/profile/donations/export", "_blank")
  }

  const handleDownloadReceipt = (receiptUrl: string) => {
    window.open(receiptUrl, "_blank")
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
                  <p className="text-2xl font-bold">${totalDonated}</p>
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
                  <p className="text-2xl font-bold">${thisYearDonated}</p>
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

        {/* Export Button */}
        <div className="flex justify-end">
          <Button onClick={handleExport} variant="outline" className="bg-transparent">
            <Download className="h-4 w-4 mr-2" />
            Export History
          </Button>
        </div>

        {/* Donations List */}
        {donations.length > 0 ? (
          <div className="space-y-4">
            {donations.map((donation) => (
              <Card key={donation.id} className="border border-gray-200 dark:border-gray-600">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                          {donation.organization_name}
                        </h4>
                        <Badge
                          variant="outline"
                          className={
                            donation.status === "completed"
                              ? "text-green-600 border-green-600"
                              : "text-yellow-600 border-yellow-600"
                          }
                        >
                          {donation.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-300">Amount: </span>
                          <span className="font-semibold text-gray-900 dark:text-white text-lg">
                            ${donation.amount}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300">Date: </span>
                          <span className="text-gray-900 dark:text-white">
                            {new Date(donation.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {donation.impact && (
                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <p className="text-sm text-green-800 dark:text-green-200">
                            <strong>Impact:</strong> {donation.impact}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      {donation.receipt_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadReceipt(donation.receipt_url!)}
                          className="bg-transparent"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Receipt
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No donations yet</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
              Start making a difference by supporting organizations you care about.
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <TrendingUp className="h-4 w-4 mr-2" />
              Make Your First Donation
            </Button>
          </div>
        )}
      </div>
    </ProfileLayout>
  )
}
