"use client"

import React, { useState, useEffect } from 'react'
import { X, Wallet, Copy, Check, RefreshCw, AlertCircle, ChevronDown, Settings, Activity, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, ArrowLeft, QrCode, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { showSuccessToast, showErrorToast } from '@/lib/toast'

interface WalletPopupProps {
    isOpen: boolean
    onClose: () => void
    organizationName?: string
}

export function WalletPopup({ isOpen, onClose, organizationName }: WalletPopupProps) {
    const [walletConnected, setWalletConnected] = useState(false)
    const [walletBalance, setWalletBalance] = useState<number | null>(null)
    const [walletAddress, setWalletAddress] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [copied, setCopied] = useState(false)
    const [activeTab, setActiveTab] = useState<'account' | 'activity'>('account')
    const [actionView, setActionView] = useState<'main' | 'send' | 'receive' | 'swap'>('main')
    const [sendAmount, setSendAmount] = useState('')
    const [sendAddress, setSendAddress] = useState('')
    const [swapAmount, setSwapAmount] = useState('')
    const [swapFrom, setSwapFrom] = useState('USD')
    const [swapTo, setSwapTo] = useState('USD')
    const [showSuccess, setShowSuccess] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')
    const [successType, setSuccessType] = useState<'send' | 'receive' | 'swap' | null>(null)

    // Fetch wallet status and balance
    useEffect(() => {
        if (!isOpen) return

        const fetchWalletData = async () => {
            setIsLoading(true)
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
                    // For organization users, always fetch balance (they're always "connected" using org balance)
                    if (statusData.success && (statusData.connected || statusData.source === 'organization')) {
                        setWalletConnected(true)
                        setWalletAddress(statusData.address || null)

                        // Fetch balance (will fetch organization balance for org users)
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
                                setWalletBalance(balanceData.balance || balanceData.organization_balance || balanceData.local_balance || 0)
                                // Set wallet address if provided
                                if (statusData.address) {
                                    setWalletAddress(statusData.address)
                                }
                            }
                        }
                    } else {
                        setWalletConnected(false)
                        setWalletBalance(null)
                        setWalletAddress(null)
                    }
                }
            } catch (error) {
                console.error('Failed to fetch wallet data:', error)
                setWalletConnected(false)
            } finally {
                setIsLoading(false)
            }
        }

        fetchWalletData()
    }, [isOpen])

    const handleCopyAddress = () => {
        if (walletAddress) {
            navigator.clipboard.writeText(walletAddress)
            setCopied(true)
            showSuccessToast('Wallet address copied to clipboard')
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleRefresh = async () => {
        setIsLoading(true)
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
                    setWalletBalance(balanceData.balance || balanceData.organization_balance || balanceData.local_balance || 0)
                    showSuccessToast('Balance refreshed')
                }
            }
        } catch (error) {
            console.error('Failed to refresh balance:', error)
            showErrorToast('Failed to refresh balance')
        } finally {
            setIsLoading(false)
        }
    }

    const formatAddress = (address: string | null) => {
        if (!address) return ''
        return `${address.slice(0, 6)}...${address.slice(-4)}`
    }

    const handleSend = () => {
        if (!sendAmount || !sendAddress) {
            showErrorToast('Please fill in all fields')
            return
        }
        
        setIsLoading(true)
        
        // Simulate API call delay
        setTimeout(() => {
            setSuccessType('send')
            setSuccessMessage(`Successfully sent $${parseFloat(sendAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
            setShowSuccess(true)
            setSendAmount('')
            setSendAddress('')
            setIsLoading(false)
            
            // Hide success and return to main after 3 seconds
            setTimeout(() => {
                setShowSuccess(false)
                setSuccessType(null)
                setActionView('main')
            }, 3000)
        }, 1000)
    }

    const handleSwap = () => {
        if (!swapAmount || swapFrom === swapTo) {
            showErrorToast('Please enter amount and select different currencies')
            return
        }
        
        setIsLoading(true)
        
        // Simulate API call delay
        setTimeout(() => {
            setSuccessType('swap')
            setSuccessMessage(`Successfully swapped ${swapAmount} ${swapFrom} to ${swapTo}`)
            setShowSuccess(true)
            setSwapAmount('')
            setIsLoading(false)
            
            // Hide success and return to main after 3 seconds
            setTimeout(() => {
                setShowSuccess(false)
                setSuccessType(null)
                setActionView('main')
            }, 3000)
        }, 1000)
    }
    
    const handleCopyReceiveAddress = () => {
        if (walletAddress) {
            navigator.clipboard.writeText(walletAddress)
            setCopied(true)
            setSuccessType('receive')
            setSuccessMessage('Address copied to clipboard!')
            setShowSuccess(true)
            setTimeout(() => {
                setCopied(false)
                setShowSuccess(false)
                setSuccessType(null)
            }, 2000)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop - No blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 z-50"
                    />

                    {/* Popup - MetaMask style structure */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="fixed top-16 right-4 z-50 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
                        style={{ maxHeight: '90vh' }}
                    >
                        {/* Header - MetaMask style */}
                        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                            <div className="flex items-center justify-between p-3 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    {actionView !== 'main' && (
                                        <button
                                            onClick={() => setActionView('main')}
                                            className="p-1 rounded-lg hover:bg-white/20 transition-colors mr-1"
                                        >
                                            <ArrowLeft className="h-4 w-4" />
                                        </button>
                                    )}
                                    <div className="p-1.5 bg-white/20 rounded-lg">
                                        <Wallet className="h-4 w-4" />
                                    </div>
                                    <span className="font-semibold text-sm">
                                        {actionView === 'send' ? 'Send' : 
                                         actionView === 'receive' ? 'Receive' : 
                                         actionView === 'swap' ? 'Swap' : 'Account'}
                                    </span>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Account Name - Only show on main view */}
                            {organizationName && actionView === 'main' && (
                                <div className="px-3 py-2 border-b border-white/10">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-white/80">{organizationName}</span>
                                        <ChevronDown className="h-4 w-4 text-white/80" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tabs - MetaMask style - Only show on main view */}
                        {actionView === 'main' && (
                            <div className="flex border-b border-border bg-muted/30">
                                <button
                                    onClick={() => setActiveTab('account')}
                                    className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                                        activeTab === 'account'
                                            ? 'text-primary border-b-2 border-primary bg-background'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Account
                                </button>
                                <button
                                    onClick={() => setActiveTab('activity')}
                                    className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                                        activeTab === 'activity'
                                            ? 'text-primary border-b-2 border-primary bg-background'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <Activity className="h-4 w-4 inline mr-1.5" />
                                    Activity
                                </button>
                            </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto relative">
                            {/* Success Animation Overlay */}
                            <AnimatePresence>
                                {showSuccess && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{ duration: 0.3 }}
                                        className="absolute inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm rounded-b-xl"
                                    >
                                        <div className="text-center space-y-4 p-6">
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
                                                className="mx-auto w-20 h-20 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center shadow-lg"
                                            >
                                                <CheckCircle2 className="h-12 w-12 text-white" />
                                            </motion.div>
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.2 }}
                                                className="space-y-2"
                                            >
                                                <h3 className="text-xl font-bold">
                                                    {successType === 'send' && 'Transaction Sent!'}
                                                    {successType === 'receive' && 'Address Copied!'}
                                                    {successType === 'swap' && 'Swap Completed!'}
                                                </h3>
                                                <p className="text-sm text-muted-foreground">{successMessage}</p>
                                            </motion.div>
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.4 }}
                                            >
                                                <div className="w-12 h-1 bg-primary/20 rounded-full mx-auto overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: '100%' }}
                                                        transition={{ duration: 3, ease: 'linear' }}
                                                        className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
                                                    />
                                                </div>
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Balance Display - Show at top for all action views */}
                            {(actionView === 'send' || actionView === 'receive' || actionView === 'swap') && !showSuccess && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="p-4 pb-2 border-b border-border"
                                >
                                    <div className="text-center py-4">
                                        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Balance</p>
                                        <div className="flex items-center justify-center gap-2">
                                            <motion.span
                                                key={walletBalance}
                                                initial={{ scale: 1.2 }}
                                                animate={{ scale: 1 }}
                                                transition={{ duration: 0.3 }}
                                                className="text-3xl font-bold"
                                            >
                                                ${walletBalance !== null 
                                                    ? walletBalance.toLocaleString('en-US', { 
                                                        minimumFractionDigits: 2, 
                                                        maximumFractionDigits: 2 
                                                    })
                                                    : '0.00'
                                                }
                                            </motion.span>
                                            <button
                                                onClick={handleRefresh}
                                                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                                                disabled={isLoading}
                                                title="Refresh balance"
                                            >
                                                <RefreshCw className={`h-4 w-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {!showSuccess && actionView === 'send' ? (
                                /* Send View */
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="p-4 space-y-4"
                                >
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-muted-foreground mb-1.5 block">Send Amount</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max={walletBalance || undefined}
                                                    value={sendAmount}
                                                    onChange={(e) => setSendAmount(e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full pl-8 pr-4 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                                />
                                            </div>
                                            {walletBalance !== null && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Available: ${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-xs text-muted-foreground mb-1.5 block">To Address</label>
                                            <input
                                                type="text"
                                                value={sendAddress}
                                                onChange={(e) => setSendAddress(e.target.value)}
                                                placeholder="Enter wallet address"
                                                className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleSend}
                                        disabled={isLoading || !sendAmount || !sendAddress}
                                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                                    >
                                        {isLoading ? (
                                            <>
                                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            'Send'
                                        )}
                                    </Button>
                                </motion.div>
                            ) : !showSuccess && actionView === 'receive' ? (
                                /* Receive View */
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="p-4 space-y-4"
                                >
                                    <div className="text-center py-4">
                                        <div className="inline-block p-4 bg-muted rounded-xl mb-4">
                                            <QrCode className="h-16 w-16 text-muted-foreground" />
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-4">Share this address to receive funds</p>
                                        {walletAddress && (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
                                                    <code className="text-sm font-mono flex-1 text-left break-all">
                                                        {walletAddress}
                                                    </code>
                                                    <button
                                                        onClick={handleCopyReceiveAddress}
                                                        className="p-2 rounded-lg hover:bg-background transition-colors flex-shrink-0 ml-2"
                                                        title="Copy address"
                                                    >
                                                        {copied ? (
                                                            <Check className="h-4 w-4 text-green-500" />
                                                        ) : (
                                                            <Copy className="h-4 w-4 text-muted-foreground" />
                                                        )}
                                                    </button>
                                                </div>
                                                <Button
                                                    onClick={handleCopyReceiveAddress}
                                                    variant="outline"
                                                    className="w-full"
                                                >
                                                    <Copy className="h-4 w-4 mr-2" />
                                                    Copy Address
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ) : !showSuccess && actionView === 'swap' ? (
                                /* Swap View */
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="p-4 space-y-4"
                                >
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-muted-foreground mb-1.5 block">From</label>
                                            <div className="flex gap-2">
                                                <select
                                                    value={swapFrom}
                                                    onChange={(e) => setSwapFrom(e.target.value)}
                                                    className="flex-1 px-4 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                                >
                                                    <option value="USD">USD</option>
                                                    <option value="ETH">ETH</option>
                                                    <option value="BTC">BTC</option>
                                                </select>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={swapAmount}
                                                    onChange={(e) => setSwapAmount(e.target.value)}
                                                    placeholder="0.00"
                                                    className="flex-1 px-4 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => {
                                                    const temp = swapFrom
                                                    setSwapFrom(swapTo)
                                                    setSwapTo(temp)
                                                }}
                                                className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                                            >
                                                <ArrowRightLeft className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div>
                                            <label className="text-xs text-muted-foreground mb-1.5 block">To</label>
                                            <div className="flex gap-2">
                                                <select
                                                    value={swapTo}
                                                    onChange={(e) => setSwapTo(e.target.value)}
                                                    className="flex-1 px-4 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                                >
                                                    <option value="USD">USD</option>
                                                    <option value="ETH">ETH</option>
                                                    <option value="BTC">BTC</option>
                                                </select>
                                                <input
                                                    type="text"
                                                    value={swapAmount && swapFrom !== swapTo ? (parseFloat(swapAmount) * 0.001).toFixed(6) : '0.00'}
                                                    readOnly
                                                    className="flex-1 px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-muted-foreground"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleSwap}
                                        disabled={isLoading || !swapAmount || swapFrom === swapTo}
                                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                                    >
                                        {isLoading ? (
                                            <>
                                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                Swapping...
                                            </>
                                        ) : (
                                            'Swap'
                                        )}
                                    </Button>
                                </motion.div>
                            ) : isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : activeTab === 'account' ? (
                                <div className="p-4 space-y-4">
                                    {/* Balance - Prominent display */}
                                    <div className="text-center py-4">
                                        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Balance</p>
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="text-3xl font-bold">
                                                ${walletBalance !== null 
                                                    ? walletBalance.toLocaleString('en-US', { 
                                                        minimumFractionDigits: 2, 
                                                        maximumFractionDigits: 2 
                                                    })
                                                    : '0.00'
                                                }
                                            </span>
                                            <button
                                                onClick={handleRefresh}
                                                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                                                disabled={isLoading}
                                                title="Refresh balance"
                                            >
                                                <RefreshCw className={`h-4 w-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Transfer/Deposit Actions - MetaMask style */}
                                    <div className="grid grid-cols-3 gap-2 pb-4 border-b border-border">
                                        <button
                                            onClick={() => setActionView('send')}
                                            className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-muted transition-colors group"
                                        >
                                            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
                                                <ArrowUpRight className="h-4 w-4 text-white" />
                                            </div>
                                            <span className="text-xs font-medium">Send</span>
                                        </button>
                                        <button
                                            onClick={() => setActionView('receive')}
                                            className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-muted transition-colors group"
                                        >
                                            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
                                                <ArrowDownLeft className="h-4 w-4 text-white" />
                                            </div>
                                            <span className="text-xs font-medium">Receive</span>
                                        </button>
                                        <button
                                            onClick={() => setActionView('swap')}
                                            className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-muted transition-colors group"
                                        >
                                            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
                                                <ArrowRightLeft className="h-4 w-4 text-white" />
                                            </div>
                                            <span className="text-xs font-medium">Swap</span>
                                        </button>
                                    </div>

                                    {/* Wallet Address - MetaMask style */}
                                    {walletAddress && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
                                                        <Wallet className="h-4 w-4 text-white" />
                                                    </div>
                                                    <code className="text-sm font-mono truncate">
                                                        {formatAddress(walletAddress)}
                                                    </code>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleCopyAddress()
                                                    }}
                                                    className="p-1.5 rounded-lg hover:bg-background transition-colors flex-shrink-0 ml-2"
                                                    title="Copy address"
                                                >
                                                    {copied ? (
                                                        <Check className="h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <Copy className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Network/Status */}
                                    <div className="flex items-center justify-between p-2 text-xs">
                                        <span className="text-muted-foreground">Network</span>
                                        <div className="flex items-center gap-1.5">
                                            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                                            <span className="font-medium">{walletConnected ? 'Connected' : 'Not Connected'}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Activity Tab */
                                <div className="p-4">
                                    <div className="text-center py-12">
                                        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                                        <p className="text-sm text-muted-foreground">No transactions yet</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions - MetaMask style */}
                        <div className="border-t border-border p-3 bg-muted/30">
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-sm"
                                onClick={() => {
                                    // Open settings or wallet options
                                    window.location.href = '/chat'
                                }}
                            >
                                <Settings className="h-4 w-4 mr-2" />
                                Wallet Settings
                            </Button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

