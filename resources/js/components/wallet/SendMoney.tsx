import { motion, AnimatePresence } from 'framer-motion'
import { Search, RefreshCw, Check, Building2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Recipient } from './types'
import { formatCurrency, formatAddress } from './utils'

interface SendMoneyProps {
    sendAmount: string
    walletBalance: number | null
    recipientSearch: string
    searchResults: Recipient[]
    selectedRecipient: Recipient | null
    sendAddress: string
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

export function SendMoney({
    sendAmount,
    walletBalance,
    recipientSearch,
    searchResults,
    selectedRecipient,
    sendAddress,
    isLoading,
    isLoadingSearch,
    showDropdown,
    searchInputRef,
    dropdownRef,
    onAmountChange,
    onSearchChange,
    onSearchFocus,
    onSelectRecipient,
    onSend
}: SendMoneyProps) {
    return (
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
                            onChange={(e) => onAmountChange(e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-8 pr-4 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                        />
                    </div>
                    {walletBalance !== null && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Available: ${formatCurrency(walletBalance)}
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
                                onSearchChange(e.target.value)
                            }}
                            onFocus={onSearchFocus}
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
                        {showDropdown && (isLoadingSearch ? (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                ref={dropdownRef}
                                className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg p-2"
                            >
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 border-b border-border last:border-b-0">
                                        <Skeleton className="h-8 w-8 rounded-lg" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                        <Skeleton className="h-5 w-20 rounded" />
                                    </div>
                                ))}
                            </motion.div>
                        ) : searchResults.length > 0 && (
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
                                        onClick={() => onSelectRecipient(result)}
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
                        ))}
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
                onClick={onSend}
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
    )
}

