"use client"

import { useState, useEffect } from "react"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { Mail, Phone, MapPin, Wallet, DollarSign, CheckCircle2, XCircle, RefreshCw, Gift, Target, TrendingUp, Award, Clock, Heart, UserPlus, Sparkles, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Button } from "@/components/frontend/ui/button"
import { Badge } from "@/components/frontend/ui/badge"
import { usePage, router } from "@inertiajs/react"
import { WalletConnectPopup } from "@/components/wallet-connect-popup"

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

interface WalletData {
  connected: boolean
  expired: boolean
  connected_at: string | null
  expires_at: string | null
  wallet_user_id: number | null
  balance: number
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
    user: User
  }
  recentDonations: Donation[]
  wallet: WalletData
  reward_points: number
  impact_score?: ImpactScore
  impact_breakdown?: ImpactBreakdown
}

export default function ProfileIndex() {
  const { auth, recentDonations, wallet: initialWallet, reward_points, impact_score, impact_breakdown } = usePage<PageProps>().props
  const user = auth.user
  const [wallet, setWallet] = useState<WalletData>(initialWallet)
  const [showWalletPopup, setShowWalletPopup] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Check wallet status on mount
  useEffect(() => {
    checkWalletStatus()
  }, [])

  const checkWalletStatus = async () => {
    try {
      const statusResponse = await fetch(`/wallet/status?t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
        cache: 'no-cache',
      })

      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        if (statusData.success && statusData.connected) {
          // Wallet IS connected, fetch balance
          const balanceResponse = await fetch(`/wallet/balance?t=${Date.now()}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
              'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'include',
            cache: 'no-cache',
          })

          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json()
            setWallet({
              connected: true,
              expired: false,
              connected_at: statusData.connected_at,
              expires_at: statusData.expires_at,
              wallet_user_id: statusData.wallet_user_id,
              balance: balanceData.balance || balanceData.local_balance || 0,
            })
          } else {
            setWallet(prev => ({ ...prev, connected: true, balance: prev.balance || 0 }))
          }
        } else {
          setWallet(prev => ({ ...prev, connected: false, balance: 0 }))
        }
      }
    } catch (error) {
      console.error('Failed to check wallet status:', error)
    }
  }

  const refreshWalletData = async () => {
    setIsRefreshing(true)
    await checkWalletStatus()
    setIsRefreshing(false)
    router.reload({ only: ['wallet'] })
  }

  const handleWalletConnect = async () => {
    await refreshWalletData()
  }

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

        {/* Wallet Connection Card */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-gray-900 dark:text-white text-lg sm:text-xl flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Digital Wallet
              </CardTitle>
              {wallet.connected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshWalletData}
                  disabled={isRefreshing}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Earn Money Info Banner - Show for supporters */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 via-purple-50 to-blue-50 dark:from-primary/20 dark:via-purple-900/20 dark:to-blue-900/20 border border-primary/20 dark:border-primary/30">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-primary/20 dark:bg-primary/30 flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-primary dark:text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1.5 flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    Digital Wallet Access
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                    Complete your KYC verification to access your digital wallet and start managing your funds securely. It's quick, easy, and helps us keep our platform safe for everyone.
                  </p>
                  <div className="space-y-1.5 mt-3 pt-3 border-t border-primary/20 dark:border-primary/30">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">
                        <span className="font-semibold text-gray-900 dark:text-white">One-time KYC Verification Fee:</span> $2 (one-time payment)
                      </span>
                    </div>
                  </div>
                  
                  {/* Subscription Plans */}
                  <div className="mt-4 pt-4 border-t border-primary/20 dark:border-primary/30">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">
                      Choose Your Plan
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Monthly Plan */}
                      <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-primary/30 dark:border-primary/40">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">Monthly</span>
                          <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                            14 Day Free
                          </Badge>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-primary">$3.00</span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">/month</span>
                        </div>
                      </div>
                      
                      {/* Annual Plan */}
                      <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-primary/30 dark:border-primary/40">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">Annual</span>
                          <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                            14 Day Free
                          </Badge>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-primary">$30</span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">/year</span>
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                          Save $6 per year
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-primary/20 dark:border-primary/30">
                    <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                      💡 Verification takes just a few minutes and unlocks all wallet features!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Connection Status - Only show when connected */}
            {wallet.connected && (
              <div className="flex items-center justify-between p-4 rounded-lg border bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      Wallet Connected
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Your wallet is connected and ready to use
                    </p>
                  </div>
                </div>
                <Badge variant="default">
                  Active
                </Badge>
              </div>
            )}

            {/* Wallet Details - Only show if connected */}
            {wallet.connected && (
              <>
                {/* Balance Display */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Wallet Balance</p>
                      <p className="text-2xl font-bold text-primary">
                        ${wallet.balance.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-primary/50" />
                  </div>
                </div>

                {/* Wallet Info */}
                {wallet.wallet_user_id && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>Wallet User ID: <span className="font-semibold text-gray-900 dark:text-white">{wallet.wallet_user_id}</span></p>
                    {wallet.connected_at && (
                      <p className="mt-1">Connected: <span className="font-semibold text-gray-900 dark:text-white">{formatDate(wallet.connected_at)}</span></p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Connect Wallet Button - Only show if not connected */}
            {!wallet.connected && (
              <div className="flex justify-center pt-2">
                <Button
                  onClick={() => setShowWalletPopup(true)}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Wallet className="h-4 w-4" />
                  Connect Wallet
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

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

      {/* Wallet Connect Popup */}
      {showWalletPopup && (
        <WalletConnectPopup
          isOpen={showWalletPopup}
          onClose={() => setShowWalletPopup(false)}
          onConnect={handleWalletConnect}
          isConnected={wallet.connected}
          walletAppName="Believe Wallet"
          walletAppLogo="/logo.png"
          variant="frontend"
        />
      )}
    </ProfileLayout>
  )
}
