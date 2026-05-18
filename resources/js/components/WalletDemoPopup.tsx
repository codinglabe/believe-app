"use client"

import React, { useState } from 'react'
import { Wallet, Copy, Check, RefreshCw, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, ArrowLeft, QrCode, CheckCircle2, Search, Plus, Activity, Settings, MousePointer2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface WalletDemoPopupProps {
    actionView: 'main' | 'send' | 'receive' | 'swap' | 'addMoney'
    demoData: {
        sendAmount?: string
        addMoneyAmount?: string
        selectedRecipient?: {
            id: string
            type: string
            name: string
            email?: string
            display_name: string
            address: string
        } | null
        showSuccess?: boolean
        successType?: 'send' | 'receive' | 'swap' | 'addMoney' | null
        successMessage?: string
        clickPoint?: {
            x: number
            y: number
            visible: boolean
        } | null
    }
}

export function WalletDemoPopup({ actionView, demoData }: WalletDemoPopupProps) {
    const [walletBalance] = useState<number>(1250.50)
    const [walletAddress] = useState<string>('0x1234567890abcdef1234567890abcdef12345678')
    const [copied, setCopied] = useState(false)

    const formatAddress = (address: string) => {
        if (!address) return ''
        return `${address.slice(0, 6)}...${address.slice(-4)}`
    }

    const handleCopyAddress = () => {
        if (walletAddress) {
            navigator.clipboard.writeText(walletAddress)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <div className="relative bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col w-full max-w-md mx-auto h-[600px]">
                        {/* Header - MetaMask style */}
                        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                            <div className="flex items-center justify-between p-3 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    {actionView !== 'main' && (
                                        <button
                                            onClick={() => {}}
                                            className="p-1 rounded-lg hover:bg-white/20 transition-colors mr-1 opacity-0 pointer-events-none"
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
                                         actionView === 'swap' ? 'Swap' : 
                                         actionView === 'addMoney' ? 'Deposit' : 'Account'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Tabs - MetaMask style - Only show on main view */}
                        {actionView === 'main' && (
                            <div className="flex border-b border-border bg-muted/30">
                                <button className="flex-1 px-4 py-2.5 text-sm font-medium transition-colors text-primary border-b-2 border-primary bg-background">
                                    Account
                                </button>
                                <button className="flex-1 px-4 py-2.5 text-sm font-medium transition-colors text-muted-foreground hover:text-foreground">
                                    <Activity className="h-4 w-4 inline mr-1.5" />
                                    Activity
                                </button>
                            </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 overflow-hidden relative flex flex-col h-full">
                            {/* Click Point Indicator */}
                            <AnimatePresence>
                                {demoData.clickPoint?.visible && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="absolute z-[60] pointer-events-none"
                                        style={{
                                            left: `${demoData.clickPoint.x}px`,
                                            top: `${demoData.clickPoint.y}px`,
                                            transform: 'translate(-50%, -50%)'
                                        }}
                                    >
                                        <motion.div
                                            animate={{
                                                scale: [1, 1.2, 1],
                                                opacity: [1, 0.8, 1]
                                            }}
                                            transition={{
                                                duration: 0.6,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                            className="relative"
                                        >
                                            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                                                <MousePointer2 className="h-4 w-4 text-white" />
                                            </div>
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: [0, 1.5, 0] }}
                                                transition={{
                                                    duration: 0.8,
                                                    repeat: Infinity,
                                                    ease: "easeOut"
                                                }}
                                                className="absolute inset-0 bg-purple-600 rounded-full opacity-30"
                                            />
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Success Animation Overlay - Professional Design */}
                            <AnimatePresence mode="wait">
                                {demoData.showSuccess && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-background/98 via-background/95 to-background/98 backdrop-blur-md rounded-b-xl overflow-hidden"
                                    >
                                        {/* Animated Background Gradient */}
                                        <motion.div
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1.5, opacity: 0.1 }}
                                            transition={{ duration: 0.8, ease: "easeOut" }}
                                            className="absolute inset-0 bg-gradient-to-br from-green-400 via-emerald-500 to-green-600"
                                        />
                                        
                                        {/* Success Content */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            transition={{ delay: 0.1, duration: 0.4 }}
                                            className="relative z-10 text-center space-y-6 p-8 max-w-sm mx-auto"
                                        >
                                            {/* Success Icon with Animation */}
                                            <div className="relative mx-auto">
                                                {/* Outer Glow Ring */}
                                                <motion.div
                                                    initial={{ scale: 0, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                                                    className="absolute inset-0 mx-auto w-24 h-24 rounded-full bg-gradient-to-r from-green-400/30 to-emerald-500/30 blur-xl"
                                                />
                                                
                                                {/* Icon Container */}
                                                <motion.div
                                                    initial={{ scale: 0, rotate: -180 }}
                                                    animate={{ scale: 1, rotate: 0 }}
                                                    transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 15 }}
                                                    className="relative mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-green-500 via-emerald-500 to-green-600 flex items-center justify-center shadow-2xl border-4 border-white/20 dark:border-gray-800/20"
                                                >
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: [0, 1.2, 1] }}
                                                        transition={{ delay: 0.5, duration: 0.4, ease: "easeOut" }}
                                                    >
                                                        <CheckCircle2 className="h-14 w-14 text-white drop-shadow-lg" strokeWidth={2.5} />
                                                    </motion.div>
                                                    
                                                    {/* Pulsing Rings */}
                                                    <motion.div
                                                        initial={{ scale: 0, opacity: 0.8 }}
                                                        animate={{ scale: [1, 1.5, 2], opacity: [0.8, 0.4, 0] }}
                                                        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                                                        className="absolute inset-0 rounded-full border-2 border-green-400"
                                                    />
                                                    <motion.div
                                                        initial={{ scale: 0, opacity: 0.6 }}
                                                        animate={{ scale: [1, 1.5, 2], opacity: [0.6, 0.3, 0] }}
                                                        transition={{ duration: 2, repeat: Infinity, delay: 0.3, ease: "easeOut" }}
                                                        className="absolute inset-0 rounded-full border-2 border-emerald-400"
                                                    />
                                                </motion.div>
                                            </div>

                                            {/* Success Message */}
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.4, duration: 0.4 }}
                                                className="space-y-3"
                                            >
                                                <h3 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-green-600 via-emerald-600 to-green-500 dark:from-green-400 dark:via-emerald-400 dark:to-green-300 bg-clip-text text-transparent">
                                                    {demoData.successType === 'send' && 'Transaction Sent!'}
                                                    {demoData.successType === 'receive' && 'Address Copied!'}
                                                    {demoData.successType === 'swap' && 'Swap Completed!'}
                                                    {demoData.successType === 'addMoney' && 'Deposit Successful!'}
                                                </h3>
                                                <motion.p
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: 0.5 }}
                                                    className="text-sm sm:text-base text-muted-foreground font-medium px-4 leading-relaxed"
                                                >
                                                    {demoData.successMessage}
                                                </motion.p>
                                            </motion.div>

                                            {/* Progress Bar */}
                                            <motion.div
                                                initial={{ opacity: 0, scaleX: 0 }}
                                                animate={{ opacity: 1, scaleX: 1 }}
                                                transition={{ delay: 0.6, duration: 0.4 }}
                                                className="relative w-full max-w-xs mx-auto"
                                            >
                                                <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden shadow-inner">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: '100%' }}
                                                        transition={{ duration: 8, ease: 'linear' }}
                                                        className="h-full bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 rounded-full shadow-lg"
                                                    >
                                                        <motion.div
                                                            animate={{ x: ['-100%', '100%'] }}
                                                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                                            className="h-full w-1/3 bg-white/30 rounded-full blur-sm"
                                                        />
                                                    </motion.div>
                                                </div>
                                            </motion.div>

                                            {/* Decorative Elements */}
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.7 }}
                                                className="flex items-center justify-center gap-2 pt-2"
                                            >
                                                <motion.div
                                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                                    className="w-2 h-2 rounded-full bg-green-500"
                                                />
                                                <motion.div
                                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                                    transition={{ duration: 2, repeat: Infinity, delay: 0.2, ease: "easeInOut" }}
                                                    className="w-2 h-2 rounded-full bg-emerald-500"
                                                />
                                                <motion.div
                                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                                    transition={{ duration: 2, repeat: Infinity, delay: 0.4, ease: "easeInOut" }}
                                                    className="w-2 h-2 rounded-full bg-green-500"
                                                />
                                            </motion.div>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Balance Display - Show at top for all action views */}
                            {(actionView === 'send' || actionView === 'receive' || actionView === 'swap' || actionView === 'addMoney') && !demoData.showSuccess && (
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
                                                ${walletBalance.toLocaleString('en-US', { 
                                                    minimumFractionDigits: 2, 
                                                    maximumFractionDigits: 2 
                                                })}
                                            </motion.span>
                                            <button
                                                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                                                title="Refresh balance"
                                            >
                                                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {!demoData.showSuccess && actionView === 'send' ? (
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
                                                    value={demoData.sendAmount || ''}
                                                    readOnly
                                                    placeholder="0.00"
                                                    className="w-full pl-8 pr-4 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Available: ${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <div className="relative">
                                            <label className="text-xs text-muted-foreground mb-1.5 block">Send To</label>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <input
                                                    type="text"
                                                    value={demoData.selectedRecipient ? demoData.selectedRecipient.display_name : ''}
                                                    readOnly
                                                    placeholder="Search by name or email..."
                                                    className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 text-sm"
                                                />
                                            </div>
                                            
                                            {demoData.selectedRecipient && (
                                                <div className="mt-2 p-2 sm:p-2.5 bg-muted/50 rounded-lg flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                                        <span className="text-muted-foreground flex-shrink-0">Selected:</span>
                                                        <span className="font-medium truncate min-w-0">{demoData.selectedRecipient.display_name}</span>
                                                    </div>
                                                    <span className="text-muted-foreground font-mono text-[10px] sm:ml-auto flex-shrink-0">
                                                        {formatAddress(demoData.selectedRecipient.address)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        disabled
                                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 opacity-75"
                                    >
                                        Send
                                    </Button>
                                </motion.div>
                            ) : !demoData.showSuccess && actionView === 'receive' ? (
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
                                                        onClick={handleCopyAddress}
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
                                                    onClick={handleCopyAddress}
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
                            ) : !demoData.showSuccess && actionView === 'swap' ? (
                                /* Swap View */
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="p-4 space-y-4"
                                >
                                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                        <div className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full">
                                            <ArrowRightLeft className="h-8 w-8 text-white" />
                                        </div>
                                        <div className="text-center">
                                            <h3 className="text-xl font-bold mb-2">Swap Currency</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Exchange between different currencies
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : !demoData.showSuccess && actionView === 'addMoney' ? (
                                /* Add Money View */
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="p-4 space-y-4"
                                >
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-muted-foreground mb-1.5 block">Amount to Add</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10">$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    value={demoData.addMoneyAmount || ''}
                                                    readOnly
                                                    placeholder="0.00"
                                                    className="w-full pl-8 pr-4 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Enter the amount you want to add to your wallet
                                            </p>
                                        </div>
                                        
                                        {/* Payment Method Selection */}
                                        <div>
                                            <label className="text-xs text-muted-foreground mb-1.5 block">Payment Method</label>
                                            <select
                                                className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                                                defaultValue="card"
                                                disabled
                                            >
                                                <option value="card">Credit/Debit Card</option>
                                                <option value="bank">Bank Transfer</option>
                                                <option value="paypal">PayPal</option>
                                            </select>
                                        </div>
                                    </div>
                                    <Button
                                        disabled
                                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 opacity-75"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Deposit
                                    </Button>
                                </motion.div>
                            ) : actionView === 'main' ? (
                                <div className="p-4 space-y-4">
                                    {/* Balance - Prominent display */}
                                    <div className="text-center py-4">
                                        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Balance</p>
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="text-3xl font-bold">
                                                ${walletBalance.toLocaleString('en-US', { 
                                                    minimumFractionDigits: 2, 
                                                    maximumFractionDigits: 2 
                                                })}
                                            </span>
                                            <button
                                                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                                                title="Refresh balance"
                                            >
                                                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Transfer/Deposit Actions - MetaMask style */}
                                    <div className="grid grid-cols-4 gap-2 pb-4 border-b border-border">
                                        <button
                                            className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-muted transition-colors group"
                                        >
                                            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
                                                <Plus className="h-4 w-4 text-white" />
                                            </div>
                                            <span className="text-xs font-medium">Deposit</span>
                                        </button>
                                        <button
                                            className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-muted transition-colors group"
                                        >
                                            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
                                                <ArrowUpRight className="h-4 w-4 text-white" />
                                            </div>
                                            <span className="text-xs font-medium">Send</span>
                                        </button>
                                        <button
                                            className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-muted transition-colors group"
                                        >
                                            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
                                                <ArrowDownLeft className="h-4 w-4 text-white" />
                                            </div>
                                            <span className="text-xs font-medium">Receive</span>
                                        </button>
                                        <button
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
                                                    onClick={handleCopyAddress}
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
                            ) : null}
                        </div>

                        {/* Footer Actions - MetaMask style */}
                        <div className="border-t border-border p-3 bg-muted/30">
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-sm"
                                onClick={() => {}}
                            >
                                <Settings className="h-4 w-4 mr-2" />
                                Wallet Settings
                            </Button>
                        </div>
                    </div>
    )
}

