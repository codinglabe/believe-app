"use client"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { Mail, Phone, MapPin, Gift, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { usePage } from "@inertiajs/react"

interface User {
  id: number
  first_name: string
  last_name: string
  email: string
  phone?: string
  location?: string
  bio?: string
  avatar?: string
  created_at: string
}

interface Donation {
  id: number
  organization_name: string
  amount: number
  created_at: string
  impact?: string
}

interface ImpactScore {
  total_points: number
  impact_score: number
  volunteer_points: number
  donation_points: number
  follow_points: number
  bonus_points: number
  badge: {
    name: string
    level: number
    emoji: string
    color: string
  }
  period: string
}

interface ImpactBreakdown {
  volunteer: { points: number; count: number }
  donation: { points: number; count: number }
  follow: { points: number; count: number }
  bonus: { points: number; count: number }
}

interface PageProps {
  auth: {
    user: User & {
      reward_points?: number
      believe_points?: number
    }
  }
  recentDonations: Donation[]
  reward_points: number
  impact_score?: ImpactScore
  impact_breakdown?: ImpactBreakdown
}

export default function ProfileIndex() {
  const { auth, recentDonations, reward_points, impact_score, impact_breakdown } = usePage<PageProps>().props
  const user = auth.user

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <ProfileLayout title="Profile Overview" description="Your account information and recent activity">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Personal Information */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-4">
            <CardTitle className="text-gray-900 dark:text-white text-lg sm:text-xl">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900 dark:text-white break-all text-sm sm:text-base">{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900 dark:text-white text-sm sm:text-base">{user.phone}</span>
              </div>
            )}
            {user.location && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900 dark:text-white text-sm sm:text-base">{user.location}</span>
              </div>
            )}
            {user.bio && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{user.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Points Display */}
        {(user.reward_points !== undefined || user.believe_points !== undefined) && (
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-4">
              <CardTitle className="text-gray-900 dark:text-white text-lg sm:text-xl">Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Reward Points */}
                {user.reward_points !== undefined && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800">
                    <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                      <Gift className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Reward Points</p>
                      <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                        {(user.reward_points || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Believe Points */}
                {user.believe_points !== undefined && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800">
                    <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center shrink-0">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Believe Points</p>
                      <p className="text-lg font-semibold text-purple-700 dark:text-purple-300">
                        {(user.believe_points || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-gray-900 dark:text-white text-lg sm:text-xl">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDonations && recentDonations.length > 0 ? (
                recentDonations.slice(0, 3).map((donation) => (
                  <div
                    key={donation.id}
                    className="flex items-center gap-3 sm:gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                        {donation.organization_name}
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                        Donated ${donation.amount} on {new Date(donation.created_at).toLocaleDateString()}
                      </p>
                      {donation.impact && (
                        <p className="text-xs text-green-600 dark:text-green-400">{donation.impact}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-300">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

    </ProfileLayout>
  )
}
