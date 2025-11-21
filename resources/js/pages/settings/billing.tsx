"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Head, router } from "@inertiajs/react"
import SettingsLayout from "@/layouts/settings/layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Wallet, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  LogOut,
  DollarSign,
  Calendar,
  User,
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
  Eye
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
      const response = await fetch('/chat/wallet/status', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.connected) {
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
              connected_at: data.connected_at,
              expires_at: data.expires_at,
              wallet_user_id: data.wallet_user_id,
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
    }
  }

  const handleWalletConnect = async () => {
    // Don't close popup here - let success popup show first
    // Popup will be closed when user clicks "Got it!" button
    await refreshWalletData()
    // Reload after a short delay to allow success popup to be visible
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

  return (
    <SettingsLayout activeTab="billing">
      <Head title="Billing & Wallet" />
      
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Billing & Wallet</h1>
          <p className="text-muted-foreground mt-2">
            Manage your wallet connection and view your balance
          </p>
        </div>

        {/* Wallet Connection Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Digital Wallet
                </CardTitle>
                <CardDescription className="mt-1">
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
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                {wallet.connected ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
                <div>
                  <p className="font-semibold">
                    {wallet.connected ? 'Wallet Connected' : 'Wallet Not Connected'}
                  </p>
                  <p className="text-sm text-muted-foreground">
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
                <Separator />
                
                {/* Balance Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
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

                  <Card>
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Wallet User ID</p>
                          <p className="font-semibold">{wallet.wallet_user_id || 'N/A'}</p>
                        </div>
                        {wallet.connected_at && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Connected At</p>
                            <p className="font-semibold text-sm">{formatDate(wallet.connected_at)}</p>
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
                    className="flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Disconnect Wallet
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
                  className="flex items-center gap-2"
                >
                  <Wallet className="h-5 w-5" />
                  Connect Wallet
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing History Card */}
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>
              View your past transactions and invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            {initialTransactions.data.length > 0 ? (
              <>
                <div className="space-y-3 mb-6">
                  {initialTransactions.data.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex-shrink-0">
                          {transaction.type === 'deposit' && <ArrowUpCircle className="h-5 w-5 text-green-500" />}
                          {transaction.type === 'withdrawal' && <ArrowDownCircle className="h-5 w-5 text-red-500" />}
                          {transaction.type === 'purchase' && <ShoppingCart className="h-5 w-5 text-purple-500" />}
                          {transaction.type === 'refund' && <RefreshCcw className="h-5 w-5 text-orange-500" />}
                          {transaction.type === 'donation' && <Heart className="h-5 w-5 text-pink-500" />}
                          {!['deposit', 'withdrawal', 'purchase', 'refund', 'donation'].includes(transaction.type) && (
                            <Info className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold capitalize">{transaction.type.replace(/_/g, ' ')}</p>
                            <Badge
                              variant={
                                transaction.status === 'completed'
                                  ? 'default'
                                  : transaction.status === 'pending'
                                  ? 'secondary'
                                  : 'destructive'
                              }
                              className="text-xs"
                            >
                              {transaction.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="font-mono text-xs">
                              {transaction.transaction_id || `TXN#${transaction.id}`}
                            </span>
                            <span>
                              {transaction.processed_at
                                ? new Date(transaction.processed_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : new Date(transaction.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                            </span>
                            {transaction.payment_method && (
                              <span className="capitalize">{transaction.payment_method}</span>
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
                            <p className="text-xs text-muted-foreground">
                              Fee: {transaction.currency} {Number(transaction.fee).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {initialTransactions.last_page > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing <span className="font-semibold">{initialTransactions.from || 0}</span> to{' '}
                      <span className="font-semibold">{initialTransactions.to || 0}</span> of{' '}
                      <span className="font-semibold">{initialTransactions.total || 0}</span> results
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (initialTransactions.prev_page_url) {
                            router.get(initialTransactions.prev_page_url, {}, { preserveState: true, preserveScroll: true })
                          }
                        }}
                        disabled={!initialTransactions.prev_page_url}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {initialTransactions.links
                          .filter((link) => link.url && !isNaN(Number(link.label)))
                          .map((link, index) => (
                            <Button
                              key={index}
                              variant={link.active ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => {
                                if (!link.active && link.url) {
                                  router.get(link.url, {}, { preserveState: true, preserveScroll: true })
                                }
                              }}
                              disabled={link.active}
                              className="min-w-[40px]"
                            >
                              {link.label}
                            </Button>
                          ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (initialTransactions.next_page_url) {
                            router.get(initialTransactions.next_page_url, {}, { preserveState: true, preserveScroll: true })
                          }
                        }}
                        disabled={!initialTransactions.next_page_url}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No transactions found</p>
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
        />
      )}

      {/* Disconnect Wallet Confirmation Modal */}
      <AlertDialog open={showDisconnectModal} onOpenChange={setShowDisconnectModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Wallet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect your wallet? You will need to reconnect it to access your wallet features and balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                'Disconnect'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsLayout>
  )
}

