"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Head, router } from "@inertiajs/react"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/frontend/ui/card"
import { Button } from "@/components/frontend/ui/button"
import { Badge } from "@/components/frontend/ui/badge"
import { 
  Wallet, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  LogOut,
  DollarSign,
  Calendar,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowUpCircle,
  ArrowDownCircle,
  ShoppingCart,
  RefreshCcw,
  Heart,
  Info,
} from "lucide-react"
import { WalletConnectPopup } from "@/components/wallet-connect-popup"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface WalletData {
  connected: boolean
  expired: boolean
  connected_at: string | null
  expires_at: string | null
  wallet_user_id: number | null
  balance: number
}

interface Transaction {
  id: number
  type: string
  status: string
  amount: number
  fee: number
  currency: string
  payment_method: string | null
  transaction_id: string | null
  processed_at: string | null
  created_at: string
}

interface PaginationLink {
  url: string | null
  label: string
  active: boolean
}

interface PaginationData {
  current_page: number
  data: Transaction[]
  first_page_url: string
  from: number
  last_page: number
  last_page_url: string
  links: PaginationLink[]
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number
  total: number
}

interface BillingProps {
  wallet: WalletData
  transactions: PaginationData
}

export default function Billing({ wallet: initialWallet, transactions: initialTransactions }: BillingProps) {
  const [wallet, setWallet] = useState<WalletData>(initialWallet)
  const [isLoading, setIsLoading] = useState(false)
  const [showWalletPopup, setShowWalletPopup] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showDisconnectModal, setShowDisconnectModal] = useState(false)

  // Fetch wallet balance on mount if connected
  useEffect(() => {
    const fetchInitialBalance = async () => {
      if (initialWallet.connected) {
        try {
          const balanceResponse = await fetch(`/chat/wallet/balance?t=${Date.now()}`, {
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
            if (balanceData.success) {
              setWallet(prev => ({
                ...prev,
                balance: balanceData.balance || balanceData.local_balance || 0,
              }))
            }
          }
        } catch (error) {
          console.error('Failed to fetch initial balance:', error)
        }
      }
    }

    fetchInitialBalance()
  }, [])

  // Refresh wallet data
  const refreshWalletData = async () => {
    setIsRefreshing(true)
    try {
      const statusResponse = await fetch(`/chat/wallet/status?t=${Date.now()}`, {
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
          // Fetch balance
          const balanceResponse = await fetch(`/chat/wallet/balance?t=${Date.now()}`, {
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
            showSuccessToast('Wallet data refreshed successfully')
          } else {
            setWallet(prev => ({ ...prev, connected: true }))
          }
        } else {
          setWallet(prev => ({ ...prev, connected: false }))
        }
      }
    } catch (error) {
      console.error('Failed to refresh wallet data:', error)
      showErrorToast('Failed to refresh wallet data')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Disconnect wallet
  const handleDisconnect = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/chat/wallet/disconnect', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setWallet({
            connected: false,
            expired: false,
            connected_at: null,
            expires_at: null,
            wallet_user_id: null,
            balance: 0,
          })
          showSuccessToast('Wallet disconnected successfully')
          router.reload({ only: ['wallet'] })
        }
      } else {
        showErrorToast('Failed to disconnect wallet')
      }
    } catch (error) {
      showErrorToast('An error occurred while disconnecting wallet')
    } finally {
      setIsLoading(false)
      setShowDisconnectModal(false)
    }
  }

  const handleWalletConnect = async () => {
    await refreshWalletData()
    setTimeout(() => {
      router.reload({ only: ['wallet'] })
    }, 100)
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

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "failed":
      case "cancelled":
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "refund":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <ArrowUpCircle className="h-5 w-5 text-green-500" />
      case "withdrawal":
        return <ArrowDownCircle className="h-5 w-5 text-red-500" />
      case "purchase":
        return <ShoppingCart className="h-5 w-5 text-purple-500" />
      case "refund":
        return <RefreshCcw className="h-5 w-5 text-orange-500" />
      case "donation":
        return <Heart className="h-5 w-5 text-pink-500" />
      default:
        return <Info className="h-5 w-5 text-gray-500" />
    }
  }

  const handlePageChange = (url: string | null) => {
    if (url) {
      router.get(url, {}, { preserveState: true, preserveScroll: true })
    }
  }

  const pageNumbers = useMemo(() => {
    return initialTransactions.links.filter(link => link.url && !isNaN(Number(link.label)))
  }, [initialTransactions.links])

  return (
    <ProfileLayout title="Billing & Wallet" description="Manage your wallet connection and view your balance">
      <Head title="Billing & Wallet" />
      
      <div className="space-y-6">
        {/* Wallet Connection Card */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <Wallet className="h-5 w-5" />
                  Digital Wallet
                </CardTitle>
                <CardDescription className="mt-1 text-gray-600 dark:text-gray-400">
                  Connect your digital wallet to manage payments and view your balance
                </CardDescription>
              </div>
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
          <CardContent className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center gap-3">
                {wallet.connected ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {wallet.connected ? 'Wallet Connected' : 'Wallet Not Connected'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {wallet.connected 
                      ? 'Your wallet is connected and ready to use'
                      : 'Connect your wallet to start managing payments'
                    }
                  </p>
                </div>
              </div>
              <Badge variant={wallet.connected ? 'default' : 'destructive'}>
                {wallet.connected ? 'Active' : 'Not Connected'}
              </Badge>
            </div>

            {/* Wallet Details - Only show if connected */}
            {wallet.connected && (
              <>
                {/* Balance Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Wallet Balance</p>
                          <p className="text-3xl font-bold text-primary">
                            ${wallet.balance.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                        <DollarSign className="h-10 w-10 text-primary/50" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Wallet User ID</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{wallet.wallet_user_id || 'N/A'}</p>
                        </div>
                        {wallet.connected_at && (
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Connected At</p>
                            <p className="font-semibold text-sm text-gray-900 dark:text-white">{formatDate(wallet.connected_at)}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Expiration Info */}
                {wallet.expires_at && (
                  <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-amber-900 dark:text-amber-100">
                          Token Expiration
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                          Your wallet token expires on {formatDate(wallet.expires_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Disconnect Button */}
                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    onClick={() => setShowDisconnectModal(true)}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      <>
                        <LogOut className="h-4 w-4" />
                        Disconnect Wallet
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}

            {/* Connect Wallet Button - Only show if not connected */}
            {!wallet.connected && (
              <div className="flex justify-center">
                <Button
                  onClick={() => setShowWalletPopup(true)}
                  size="lg"
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Wallet className="h-5 w-5" />
                  Connect Wallet
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing History Card */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Billing History</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              View your past transactions and invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            {initialTransactions.data.length > 0 ? (
              <>
                <div className="space-y-4">
                  {initialTransactions.data.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-700/50">
                      <div className="flex items-center gap-3">
                        {getTypeIcon(transaction.type)}
                        <div>
                          <p className="font-semibold capitalize text-gray-900 dark:text-white">
                            {transaction.type.replace(/_/g, ' ')}
                            <Badge variant="outline" className={`ml-2 ${getStatusBadgeClass(transaction.status)}`}>
                              {transaction.status}
                            </Badge>
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {transaction.transaction_id || `TXN#${transaction.id}`}
                          </p>
                          {transaction.processed_at && (
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              {formatDate(transaction.processed_at)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-bold ${
                            ['deposit', 'refund', 'donation'].includes(transaction.type)
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {['deposit', 'refund', 'donation'].includes(transaction.type) ? '+' : '-'}
                          {transaction.currency} {Number(transaction.amount).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                        {transaction.fee > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            Fee: {transaction.currency} {Number(transaction.fee).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {initialTransactions.last_page > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(initialTransactions.prev_page_url)}
                      disabled={!initialTransactions.prev_page_url}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex gap-1">
                      {pageNumbers.map((link, index) => (
                        <Button
                          key={index}
                          variant={link.active ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(link.url)}
                          disabled={link.active}
                        >
                          {link.label}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(initialTransactions.next_page_url)}
                      disabled={!initialTransactions.next_page_url}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No transactions found</p>
              </div>
            )}
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

      {/* Disconnect Confirmation Modal */}
      <AlertDialog open={showDisconnectModal} onOpenChange={setShowDisconnectModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Wallet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect your digital wallet? You will need to reconnect to manage your funds.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" disabled={isLoading}>Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={handleDisconnect} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Disconnecting...
                  </>
                ) : (
                  'Disconnect'
                )}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProfileLayout>
  )
}

