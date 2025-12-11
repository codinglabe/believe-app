"use client"

import React, { useState, useEffect, useRef } from 'react'
import { X, Wallet, Copy, Check, RefreshCw, ChevronDown, Settings, Activity, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, ArrowLeft, QrCode, CheckCircle2, Search, Building2, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { showSuccessToast, showErrorToast } from '@/lib/toast'

interface WalletPopupProps {
    isOpen: boolean
    onClose: () => void
    organizationName?: string
}

export function WalletPopup({ isOpen, onClose, organizationName }: WalletPopupProps) {
    const [walletBalance, setWalletBalance] = useState<number | null>(null)
    const [walletAddress, setWalletAddress] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [copied, setCopied] = useState(false)
    const [activeTab, setActiveTab] = useState<'account' | 'activity'>('account')
    const [actionView, setActionView] = useState<'main' | 'send' | 'receive' | 'swap'>('main')
    const [sendAmount, setSendAmount] = useState('')
    const [sendAddress, setSendAddress] = useState('')
    const [recipientSearch, setRecipientSearch] = useState('')
    const [selectedRecipient, setSelectedRecipient] = useState<{ id: string; type: string; name: string; email?: string; display_name: string; address: string } | null>(null)
    const [searchResults, setSearchResults] = useState<Array<{ id: string; type: string; name: string; email?: string; display_name: string; address: string }>>([])
    const [isLoadingSearch, setIsLoadingSearch] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const [swapAmount, setSwapAmount] = useState('')
    const [swapFrom, setSwapFrom] = useState('USD')
    const [swapTo, setSwapTo] = useState('USD')
    const [showSuccess, setShowSuccess] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')
    const [successType, setSuccessType] = useState<'send' | 'receive' | 'swap' | null>(null)
    const [activities, setActivities] = useState<Array<{
        id: string | number;
        type: string;
        amount: number;
        date: string;
        status: string;
        donor_name: string;
        donor_email?: string;
        frequency: string;
        message?: string;
        transaction_id?: string;
        is_outgoing?: boolean;
        recipient_type?: string;
    }>>([])
    const [isLoadingActivities, setIsLoadingActivities] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [hasMoreActivities, setHasMoreActivities] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)

    // Fetch organization balance directly (no wallet connection checks)
    useEffect(() => {
        if (!isOpen) return

        const fetchOrganizationBalance = async () => {
            setIsLoading(true)
            try {
                // Fetch organization balance directly
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
                        // Set wallet address from response or generate from organization ID
                        if (balanceData.address) {
                            setWalletAddress(balanceData.address)
                        } else if (balanceData.organization_id) {
                            const address = '0x' + balanceData.organization_id.toString(16).padStart(40, '0')
                            setWalletAddress(address)
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch organization balance:', error)
                setWalletBalance(0)
            } finally {
                setIsLoading(false)
            }
        }

        fetchOrganizationBalance()
    }, [isOpen])

    // Fetch wallet activity when Activity tab is active
    useEffect(() => {
        if (!isOpen || activeTab !== 'activity') return

        const fetchActivities = async (page: number = 1, append: boolean = false) => {
            if (append) {
                setIsLoadingMore(true)
            } else {
                setIsLoadingActivities(true)
            }
            
            try {
                // Fetch 10 activities per page
                const response = await fetch(`/chat/wallet/activity?page=${page}&per_page=10&t=${Date.now()}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'include',
                    cache: 'no-cache',
                })

                if (response.ok) {
                    const data = await response.json()
                    if (data.success) {
                        if (append) {
                            // Append new activities
                            setActivities(prev => [...prev, ...(data.activities || [])])
                        } else {
                            // First load: show all activities from backend
                            setActivities(data.activities || [])
                        }
                        setHasMoreActivities(data.has_more || false)
                        setCurrentPage(page)
                    }
                }
            } catch (error) {
                console.error('Failed to fetch wallet activity:', error)
            } finally {
                setIsLoadingActivities(false)
                setIsLoadingMore(false)
            }
        }

        // Reset and fetch first page when tab is opened
        setCurrentPage(1)
        setHasMoreActivities(false)
        fetchActivities(1, false)
    }, [isOpen, activeTab])

    // Handle scroll to load more activities
    const handleActivityScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget
        const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight
        
        // Load more when scrolled near bottom (within 50px) and there are more activities
        if (scrollBottom < 50 && hasMoreActivities && !isLoadingMore && !isLoadingActivities) {
            const nextPage = currentPage + 1
            const fetchActivities = async (page: number) => {
                setIsLoadingMore(true)
                try {
                    const response = await fetch(`/chat/wallet/activity?page=${page}&per_page=10&t=${Date.now()}`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        credentials: 'include',
                        cache: 'no-cache',
                    })

                    if (response.ok) {
                        const data = await response.json()
                        if (data.success) {
                            // Append new activities
                            setActivities(prev => [...prev, ...(data.activities || [])])
                            setHasMoreActivities(data.has_more || false)
                            setCurrentPage(page)
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch more wallet activity:', error)
                } finally {
                    setIsLoadingMore(false)
                }
            }
            
            fetchActivities(nextPage)
        }
    }

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

    // Debounced search function
    useEffect(() => {
        if (!recipientSearch || recipientSearch.length < 2) {
            setSearchResults([])
            setShowDropdown(false)
            return
        }

        const timeoutId = setTimeout(async () => {
            setIsLoadingSearch(true)
            try {
                const response = await fetch(`/chat/wallet/search-recipients?search=${encodeURIComponent(recipientSearch)}&limit=10`, {
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
                    if (data.success) {
                        setSearchResults(data.results || [])
                        setShowDropdown(data.results && data.results.length > 0)
                    }
                }
            } catch (error) {
                console.error('Search error:', error)
                setSearchResults([])
            } finally {
                setIsLoadingSearch(false)
            }
        }, 300)

        return () => clearTimeout(timeoutId)
    }, [recipientSearch])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                searchInputRef.current &&
                !searchInputRef.current.contains(event.target as Node)
            ) {
                setShowDropdown(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Reset recipient search when switching away from send view
    useEffect(() => {
        if (actionView !== 'send') {
            setRecipientSearch('')
            setSelectedRecipient(null)
            setSendAddress('')
            setSearchResults([])
            setShowDropdown(false)
        }
    }, [actionView])

    const handleSelectRecipient = (recipient: { id: string; type: string; name: string; email?: string; display_name: string; address: string }) => {
        setSelectedRecipient(recipient)
        setSendAddress(recipient.address)
        setRecipientSearch(recipient.display_name)
        setShowDropdown(false)
    }

    const handleSend = async () => {
        if (!selectedRecipient) {
            showErrorToast('Please select a recipient')
            return
        }

        const amount = parseFloat(sendAmount)
        if (!sendAmount || isNaN(amount) || amount <= 0) {
            showErrorToast('Please enter a valid amount')
            return
        }

        if (walletBalance !== null && amount > walletBalance) {
            showErrorToast(`Insufficient balance. Available: $${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
            return
        }
        
        setIsLoading(true)
        
        try {
            const response = await fetch('/chat/wallet/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
                body: JSON.stringify({
                    amount: amount,
                    recipient_id: selectedRecipient.id,
                    recipient_address: selectedRecipient.address,
                }),
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to send money')
            }

            // Update balance from response
            if (data.data?.sender_balance !== undefined) {
                setWalletBalance(data.data.sender_balance)
            } else {
                // Refresh balance
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
                    }
                }
            }

            // Show success
            setSuccessType('send')
            setSuccessMessage(data.message || `Successfully sent $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to ${selectedRecipient.name}`)
            setShowSuccess(true)
            
            // Refresh activities to show the new transaction
            if (activeTab === 'activity') {
                try {
                    const activityResponse = await fetch(`/chat/wallet/activity?page=1&per_page=5&t=${Date.now()}`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        credentials: 'include',
                        cache: 'no-cache',
                    })

                    if (activityResponse.ok) {
                        const activityData = await activityResponse.json()
                        if (activityData.success) {
                            setActivities(activityData.activities || [])
                            setHasMoreActivities(activityData.has_more || false)
                            setCurrentPage(1)
                        }
                    }
                } catch (error) {
                    console.error('Failed to refresh activities:', error)
                }
            }
            
            // Clear form
            setSendAmount('')
            setSendAddress('')
            setSelectedRecipient(null)
            setRecipientSearch('')
            setIsLoading(false)
            
            // Hide success and return to main after 3 seconds
            setTimeout(() => {
                setShowSuccess(false)
                setSuccessType(null)
                setActionView('main')
            }, 3000)
        } catch (error) {
            console.error('Send error:', error)
            const errorMessage = error instanceof Error ? error.message : 'Failed to send money. Please try again.'
            showErrorToast(errorMessage)
            setIsLoading(false)
        }
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
                        <div className="flex-1 overflow-hidden relative flex flex-col min-h-0">
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
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10">$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max={walletBalance || undefined}
                                                    value={sendAmount}
                                                    onChange={(e) => setSendAmount(e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full pl-8 pr-4 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                                                />
                                            </div>
                                            {walletBalance !== null && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Available: ${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <label className="text-xs text-muted-foreground mb-1.5 block">Send To</label>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <input
                                                    ref={searchInputRef}
                                                    type="text"
                                                    value={recipientSearch}
                                                    onChange={(e) => {
                                                        setRecipientSearch(e.target.value)
                                                        setShowDropdown(true)
                                                        if (!e.target.value) {
                                                            setSelectedRecipient(null)
                                                            setSendAddress('')
                                                        }
                                                    }}
                                                    onFocus={() => {
                                                        if (searchResults.length > 0) {
                                                            setShowDropdown(true)
                                                        }
                                                    }}
                                                    placeholder="Search by name or email..."
                                                    className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 text-sm"
                                                />
                                                {isLoadingSearch && (
                                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                        <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Dropdown Results */}
                                            <AnimatePresence>
                                                {showDropdown && searchResults.length > 0 && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        transition={{ duration: 0.2 }}
                                                        ref={dropdownRef}
                                                        className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                                                        style={{
                                                            scrollbarWidth: 'none',
                                                            msOverflowStyle: 'none',
                                                        }}
                                                    >
                                                        {searchResults.map((result) => (
                                                            <button
                                                                key={result.id}
                                                                type="button"
                                                                onClick={() => handleSelectRecipient(result)}
                                                                className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-muted transition-colors text-left border-b border-border last:border-b-0 ${
                                                                    selectedRecipient?.id === result.id ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                                                                }`}
                                                            >
                                                                <div className={`p-2 rounded-lg ${
                                                                    result.type === 'organization' 
                                                                        ? 'bg-blue-500/10 text-blue-500' 
                                                                        : 'bg-green-500/10 text-green-500'
                                                                }`}>
                                                                    {result.type === 'organization' ? (
                                                                        <Building2 className="h-4 w-4" />
                                                                    ) : (
                                                                        <User className="h-4 w-4" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium truncate">{result.name}</p>
                                                                    {result.email && (
                                                                        <p className="text-xs text-muted-foreground truncate">{result.email}</p>
                                                                    )}
                                                                </div>
                                                                <span className={`text-xs px-2 py-1 rounded ${
                                                                    result.type === 'organization'
                                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                                }`}>
                                                                    {result.type === 'organization' ? 'Organization' : 'User'}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                            
                                            {selectedRecipient && (
                                                <div className="mt-2 p-2 sm:p-2.5 bg-muted/50 rounded-lg flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                                        <span className="text-muted-foreground flex-shrink-0">Selected:</span>
                                                        <span className="font-medium truncate min-w-0">{selectedRecipient.display_name}</span>
                                                    </div>
                                                    <span className="text-muted-foreground font-mono text-[10px] sm:ml-auto flex-shrink-0">
                                                        {formatAddress(selectedRecipient.address)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleSend}
                                        disabled={isLoading || !sendAmount || (!selectedRecipient && !sendAddress)}
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
                                                    className="flex-1 px-4 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
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
                                                    className="flex-1 px-4 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
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
                                                    className="flex-1 px-4 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
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
                                            <span className="font-medium">Organization Wallet</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Activity Tab */
                                <div 
                                    className="overflow-y-auto p-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                                    onScroll={handleActivityScroll}
                                    style={{ 
                                        height: '350px',
                                        maxHeight: '350px',
                                        minHeight: '350px',
                                    }}
                                >
                                    {isLoadingActivities ? (
                                        <div className="text-center py-8">
                                            <RefreshCw className="h-6 w-6 text-muted-foreground mx-auto mb-3 animate-spin" />
                                            <p className="text-sm text-muted-foreground">Loading activity...</p>
                                        </div>
                                    ) : activities.length === 0 ? (
                                        <div className="text-center py-12">
                                            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                                            <p className="text-sm text-muted-foreground">No transactions yet</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-2">
                                                {activities.map((activity) => {
                                                    const isTransferSent = activity.type === 'transfer_sent'
                                                    const isTransferReceived = activity.type === 'transfer_received'
                                                    const isDonation = activity.type === 'donation'
                                                    
                                                    return (
                                                        <motion.div
                                                            key={activity.id}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                <div className={`p-2 rounded-lg ${
                                                                    isTransferSent 
                                                                        ? 'bg-red-500/10' 
                                                                        : isTransferReceived 
                                                                        ? 'bg-blue-500/10'
                                                                        : 'bg-green-500/10'
                                                                }`}>
                                                                    {isTransferSent ? (
                                                                        <ArrowUpRight className="h-4 w-4 text-red-500" />
                                                                    ) : isTransferReceived ? (
                                                                        <ArrowDownLeft className="h-4 w-4 text-blue-500" />
                                                                    ) : (
                                                                        <ArrowDownLeft className="h-4 w-4 text-green-500" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium truncate">
                                                                        {isTransferSent 
                                                                            ? `Sent to ${activity.donor_name}`
                                                                            : isTransferReceived
                                                                            ? `Received from ${activity.donor_name}`
                                                                            : `Donation from ${activity.donor_name}`
                                                                        }
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {new Date(activity.date).toLocaleDateString('en-US', {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            year: 'numeric',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right ml-3">
                                                                <p className={`text-sm font-semibold ${
                                                                    isTransferSent 
                                                                        ? 'text-red-600'
                                                                        : isTransferReceived
                                                                        ? 'text-blue-600'
                                                                        : 'text-green-600'
                                                                }`}>
                                                                    {isTransferSent ? '-' : '+'}${activity.amount.toLocaleString('en-US', {
                                                                        minimumFractionDigits: 2,
                                                                        maximumFractionDigits: 2
                                                                    })}
                                                                </p>
                                                                {isDonation && activity.frequency !== 'one-time' && (
                                                                    <p className="text-xs text-muted-foreground capitalize">
                                                                        {activity.frequency}
                                                                    </p>
                                                                )}
                                                                {isTransferSent && activity.recipient_type && (
                                                                    <p className="text-xs text-muted-foreground capitalize">
                                                                        {activity.recipient_type}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )
                                                })}
                                            </div>
                                            {isLoadingMore && (
                                                <div className="text-center py-4">
                                                    <RefreshCw className="h-5 w-5 text-muted-foreground mx-auto animate-spin" />
                                                </div>
                                            )}
                                        </>
                                    )}
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

