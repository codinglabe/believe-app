import { motion, AnimatePresence } from 'framer-motion'
import {
    Search,
    RefreshCw,
    Building2,
    User,
    Send,
    X,
    AlertCircle,
    Info,
    ArrowUpRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Recipient } from './types'
import { formatCurrency } from './utils'

interface SendMoneyProps {
    sendAmount: string
    walletBalance: number | null
    recipientSearch: string
    searchResults: Recipient[]
    selectedRecipient: Recipient | null
    isLoading: boolean
    isLoadingSearch: boolean
    showDropdown: boolean
    searchInputRef: React.RefObject<HTMLInputElement>
    dropdownRef: React.RefObject<HTMLDivElement>
    onAmountChange: (amount: string) => void
    onSearchChange: (search: string) => void
    onSearchFocus: () => void
    onSelectRecipient: (recipient: Recipient | null) => void
    onSend: () => void
}

function RecipientAvatar({ type }: { type: string }) {
    const isOrg = type === 'organization'
    return (
        <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                isOrg
                    ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/10 text-blue-600 dark:text-blue-400'
                    : 'bg-gradient-to-br from-purple-500/20 to-purple-600/10 text-purple-600 dark:text-purple-400'
            }`}
        >
            {isOrg ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
        </div>
    )
}

export function SendMoney({
    sendAmount,
    walletBalance,
    recipientSearch,
    searchResults,
    selectedRecipient,
    isLoading,
    isLoadingSearch,
    showDropdown,
    searchInputRef,
    dropdownRef,
    onAmountChange,
    onSearchChange,
    onSearchFocus,
    onSelectRecipient,
    onSend,
}: SendMoneyProps) {
    const amount = parseFloat(sendAmount) || 0
    const hasValidAmount = sendAmount !== '' && amount > 0
    const exceedsBalance = walletBalance !== null && hasValidAmount && amount > walletBalance
    const canSend =
        hasValidAmount &&
        !exceedsBalance &&
        selectedRecipient !== null &&
        !isLoading

    const handleMaxClick = () => {
        if (walletBalance !== null && walletBalance > 0) {
            onAmountChange(walletBalance.toFixed(2))
        }
    }

    const handleClearRecipient = () => {
        onSelectRecipient(null)
        onSearchChange('')
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            layout={false}
            className="p-4 space-y-4"
        >
            {/* Amount card */}
            <div className="relative overflow-hidden rounded-xl border border-border bg-card">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-purple-600 to-blue-600" />
                <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600/10 to-blue-600/10">
                                <Send className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">Amount to send</span>
                        </div>
                        {walletBalance !== null && walletBalance > 0 && (
                            <button
                                type="button"
                                onClick={handleMaxClick}
                                disabled={isLoading}
                                className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50"
                            >
                                Max
                            </button>
                        )}
                    </div>

                    <div className="relative">
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-semibold text-muted-foreground">
                            $
                        </span>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={walletBalance ?? undefined}
                            value={sendAmount}
                            onChange={(e) => onAmountChange(e.target.value)}
                            placeholder="0.00"
                            disabled={isLoading}
                            className="w-full bg-transparent pl-7 pr-2 py-1 text-3xl font-semibold tracking-tight focus:outline-none placeholder:text-muted-foreground/40 disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                    </div>

                    {walletBalance !== null && (
                        <p className="text-xs text-muted-foreground">
                            Available balance:{' '}
                            <span className="font-medium text-foreground">${formatCurrency(walletBalance)}</span>
                        </p>
                    )}

                    {exceedsBalance && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Amount exceeds available balance
                        </p>
                    )}
                </div>
            </div>

            {/* Recipient */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Recipient</label>

                {selectedRecipient ? (
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
                        <RecipientAvatar type={selectedRecipient.type} />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{selectedRecipient.name}</p>
                            {selectedRecipient.email && (
                                <p className="text-xs text-muted-foreground truncate">{selectedRecipient.email}</p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={handleClearRecipient}
                            disabled={isLoading}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                            aria-label="Clear recipient"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                ) : (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={recipientSearch}
                            onChange={(e) => onSearchChange(e.target.value)}
                            onFocus={onSearchFocus}
                            placeholder="Search wallet-connected members or organizations…"
                            disabled={isLoading}
                            className="w-full rounded-xl border border-border bg-muted/50 py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all disabled:opacity-50"
                        />
                        {isLoadingSearch && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        )}

                        <AnimatePresence>
                            {showDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.15 }}
                                    ref={dropdownRef}
                                    className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg"
                                >
                                    {isLoadingSearch ? (
                                        <div className="p-2 space-y-1">
                                            {[1, 2, 3].map((i) => (
                                                <div key={i} className="flex items-center gap-3 p-2.5">
                                                    <Skeleton className="h-9 w-9 rounded-full" />
                                                    <div className="flex-1 space-y-1.5">
                                                        <Skeleton className="h-3.5 w-28" />
                                                        <Skeleton className="h-3 w-36" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : searchResults.length > 0 ? (
                                        <div className="max-h-56 overflow-y-auto wallet-scroll-nested">
                                            {searchResults.map((result) => {
                                                const isSelected = selectedRecipient?.id === result.id
                                                const isOrg = result.type === 'organization'
                                                return (
                                                    <button
                                                        key={result.id}
                                                        type="button"
                                                        onClick={() => onSelectRecipient(result)}
                                                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-border/60 last:border-b-0 ${
                                                            isSelected
                                                                ? 'bg-purple-50 dark:bg-purple-900/20'
                                                                : 'hover:bg-muted/60'
                                                        }`}
                                                    >
                                                        <RecipientAvatar type={result.type} />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium truncate">{result.name}</p>
                                                            {result.email && (
                                                                <p className="text-xs text-muted-foreground truncate">
                                                                    {result.email}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <span
                                                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                                                isOrg
                                                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                                    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                                            }`}
                                                        >
                                                            {isOrg ? 'Org' : 'Member'}
                                                        </span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    ) : recipientSearch.trim().length > 0 ? (
                                        <div className="px-4 py-6 text-center">
                                            <p className="text-sm text-muted-foreground">No wallet-connected recipients found</p>
                                            <p className="text-xs text-muted-foreground/70 mt-0.5">
                                                Only verified members and organizations with a connected wallet appear here
                                            </p>
                                        </div>
                                    ) : null}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Summary */}
            {hasValidAmount && selectedRecipient && !exceedsBalance && (
                <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-purple-200/60 dark:border-purple-800/40 bg-gradient-to-r from-purple-50/80 to-blue-50/80 dark:from-purple-950/30 dark:to-blue-950/30 p-3"
                >
                    <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Sending to</p>
                            <p className="text-sm font-medium truncate">{selectedRecipient.name}</p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                ${formatCurrency(amount)}
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Info */}
            <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                    Wallet-to-wallet transfers are processed instantly between verified Believe members.
                </p>
            </div>

            <Button
                onClick={onSend}
                disabled={!canSend}
                className="w-full h-11 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Sending…
                    </>
                ) : (
                    <>
                        <ArrowUpRight className="h-4 w-4 mr-2" />
                        Send ${hasValidAmount ? formatCurrency(amount) : '0.00'}
                    </>
                )}
            </Button>
        </motion.div>
    )
}
