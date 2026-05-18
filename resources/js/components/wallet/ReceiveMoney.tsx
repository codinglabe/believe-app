import { motion } from 'framer-motion'
import { QrCode, Copy, Check, AlertCircle, RefreshCw, Coins, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DepositInstructions } from './types'
import { showSuccessToast, showErrorToast } from '@/lib/toast'
import { useState, useEffect } from 'react'
import { getCsrfToken } from './utils'

interface ReceiveMoneyProps {
    isLoading: boolean
    qrCodeUrl: string | null
    depositInstructions: DepositInstructions | null
    walletAddress: string | null
    copied: boolean
    onCopyAddress: () => void
}

interface LiquidationAddress {
    id: string
    chain: string
    currency: string
    address: string
    destination_payment_rail: string
    destination_currency: string
    state: string
}

export function ReceiveMoney({
    isLoading,
    qrCodeUrl,
    depositInstructions,
    walletAddress,
    copied,
    onCopyAddress
}: ReceiveMoneyProps) {
    // Only show crypto, no tabs needed
    const [liquidationAddresses, setLiquidationAddresses] = useState<LiquidationAddress[]>([])
    const [selectedCrypto, setSelectedCrypto] = useState<{chain: string, currency: string} | null>(null)
    const [cryptoQrCodeUrl, setCryptoQrCodeUrl] = useState<string | null>(null)
    const [loadingCrypto, setLoadingCrypto] = useState(false)
    const [cryptoCopied, setCryptoCopied] = useState(false)

    // Fetch liquidation addresses on mount
    useEffect(() => {
        if (liquidationAddresses.length === 0) {
            fetchLiquidationAddresses()
        }
    }, [])

    // Fetch QR code when crypto is selected
    useEffect(() => {
        if (selectedCrypto) {
            fetchCryptoQrCode()
        }
    }, [selectedCrypto])

    const fetchLiquidationAddresses = async () => {
        try {
            setLoadingCrypto(true)
            const timestamp = Date.now()
            const response = await fetch(`/wallet/bridge/liquidation-addresses?t=${timestamp}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
                cache: 'no-store',
            })

            if (response.ok) {
                const data = await response.json()
                if (data.success && data.data) {
                    // Handle both paginated and direct array responses
                    const addresses = Array.isArray(data.data) 
                        ? data.data 
                        : (data.data.data || [])
                    setLiquidationAddresses(addresses)
                    
                    // Auto-select first address if available
                    if (addresses.length > 0) {
                        setSelectedCrypto({
                            chain: addresses[0].chain,
                            currency: addresses[0].currency
                        })
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch liquidation addresses:', error)
        } finally {
            setLoadingCrypto(false)
        }
    }

    const fetchCryptoQrCode = async () => {
        if (!selectedCrypto) return

        try {
            setLoadingCrypto(true)
            // Find the liquidation address for selected crypto
            const liquidationAddress = liquidationAddresses.find(
                addr => addr.chain === selectedCrypto.chain && addr.currency === selectedCrypto.currency
            )

            if (!liquidationAddress) {
                // Create new liquidation address if it doesn't exist
                await createLiquidationAddress()
                // After creating, refetch addresses and QR code
                await fetchLiquidationAddresses()
                return
            }

            const timestamp = Date.now()
            const response = await fetch(`/wallet/bridge/liquidation-address-qr-code?id=${liquidationAddress.id}&t=${timestamp}`, {
                method: 'GET',
                headers: {
                    'Accept': 'image/svg+xml, image/png, image/*',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
                cache: 'no-store',
            })

            if (response.ok) {
                const blob = await response.blob()
                const url = URL.createObjectURL(blob)
                setCryptoQrCodeUrl(url)
            }
        } catch (error) {
            console.error('Failed to fetch crypto QR code:', error)
        } finally {
            setLoadingCrypto(false)
        }
    }

    const createLiquidationAddress = async () => {
        if (!selectedCrypto) return

        try {
            setLoadingCrypto(true)
            const response = await fetch('/wallet/bridge/liquidation-address', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
                cache: 'no-store',
                body: JSON.stringify({
                    chain: selectedCrypto.chain,
                    currency: selectedCrypto.currency,
                    destination_payment_rail: selectedCrypto.chain, // Use same chain as destination
                    destination_currency: selectedCrypto.chain === 'ethereum' ? 'usdc' : 'usdb', // Sandbox uses usdc, production uses usdb
                }),
            })

            if (response.ok) {
                const data = await response.json()
                if (data.success && data.data) {
                    setLiquidationAddresses(prev => [...prev, data.data])
                    // Fetch QR code for the new address
                    setTimeout(() => fetchCryptoQrCode(), 500)
                } else {
                    // Show error message to user
                    const errorMessage = data.message || 'Failed to create liquidation address'
                    console.error('Failed to create liquidation address:', errorMessage)
                    showErrorToast(errorMessage)
                }
            } else {
                const errorData = await response.json()
                const errorMessage = errorData.message || 'Failed to create liquidation address'
                console.error('Failed to create liquidation address:', errorMessage)
                showErrorToast(errorMessage)
            }
        } catch (error) {
            console.error('Failed to create liquidation address:', error)
        } finally {
            setLoadingCrypto(false)
        }
    }

    const handleCopyCryptoAddress = () => {
        if (!selectedCrypto) return

        const liquidationAddress = liquidationAddresses.find(
            addr => addr.chain === selectedCrypto.chain && addr.currency === selectedCrypto.currency
        )

        if (liquidationAddress?.address) {
            navigator.clipboard.writeText(liquidationAddress.address)
            setCryptoCopied(true)
            showSuccessToast('Address copied to clipboard!')
            setTimeout(() => setCryptoCopied(false), 2000)
        }
    }

    const getSelectedLiquidationAddress = () => {
        if (!selectedCrypto) return null
        return liquidationAddresses.find(
            addr => addr.chain === selectedCrypto.chain && addr.currency === selectedCrypto.currency
        )
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const renderCryptoTab = () => {
        const selectedAddress = getSelectedLiquidationAddress()

        return (
            <div className="space-y-4">
                {/* Crypto Selection */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Select Crypto</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { chain: 'solana', currency: 'usdc', label: 'USDC', sublabel: 'Solana', color: 'purple' },
                            { chain: 'ethereum', currency: 'usdc', label: 'USDC', sublabel: 'Ethereum', color: 'blue' },
                            { chain: 'ethereum', currency: 'usdt', label: 'USDT', sublabel: 'Ethereum', color: 'green' },
                        ].map((option) => {
                            const isSelected = selectedCrypto?.chain === option.chain && selectedCrypto?.currency === option.currency
                            const colorClasses = {
                                purple: isSelected 
                                    ? 'border-purple-500 bg-purple-500/10' 
                                    : 'border-border hover:border-purple-400/50 hover:bg-purple-500/5',
                                blue: isSelected 
                                    ? 'border-blue-500 bg-blue-500/10' 
                                    : 'border-border hover:border-blue-400/50 hover:bg-blue-500/5',
                                green: isSelected 
                                    ? 'border-green-500 bg-green-500/10' 
                                    : 'border-border hover:border-green-400/50 hover:bg-green-500/5',
                            }
                            
                            return (
                                <button
                                    key={`${option.chain}-${option.currency}`}
                                    onClick={() => setSelectedCrypto({ chain: option.chain, currency: option.currency })}
                                    className={`p-2.5 rounded-lg border transition-colors ${colorClasses[option.color as keyof typeof colorClasses]}`}
                                >
                                    <div className="text-center">
                                        <p className="text-xs font-semibold text-foreground">
                                            {option.label}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {option.sublabel}
                                        </p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {loadingCrypto ? (
                    <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : selectedAddress ? (
                    <>
                        {/* QR Code Section */}
                        <div className="text-center py-4">
                            <p className="text-sm font-semibold text-foreground mb-4">Scan to receive crypto</p>
                            {cryptoQrCodeUrl ? (
                                <div className="inline-block p-4 bg-white dark:bg-background rounded-xl border-2 border-border mb-4">
                                    <img 
                                        src={cryptoQrCodeUrl} 
                                        alt="Crypto Deposit QR Code" 
                                        className="w-64 h-64"
                                        onError={(e) => {
                                            console.error('Failed to load crypto QR code:', cryptoQrCodeUrl)
                                            e.currentTarget.style.display = 'none'
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="inline-block p-4 bg-muted rounded-xl mb-4">
                                    <QrCode className="h-16 w-16 text-muted-foreground" />
                                </div>
                            )}
                            
                            {/* Address Display */}
                            <div className="space-y-3 mt-4">
                                <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
                                    <code className="text-xs font-mono flex-1 text-left break-all">
                                        {selectedAddress.address}
                                    </code>
                                    <button
                                        onClick={handleCopyCryptoAddress}
                                        className="p-2 rounded-lg hover:bg-background transition-colors flex-shrink-0 ml-2"
                                        title="Copy address"
                                    >
                                        {cryptoCopied ? (
                                            <Check className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Copy className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </button>
                                </div>
                                <Button
                                    onClick={handleCopyCryptoAddress}
                                    variant="outline"
                                    className="w-full"
                                >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy Address
                                </Button>
                            </div>
                        </div>

                        {/* Instructions Card */}
                        <div className="p-3.5 bg-green-50/50 dark:bg-green-900/20 border border-green-200/50 dark:border-green-800/50 rounded-lg">
                            <div className="flex items-start gap-2.5">
                                <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-green-900 dark:text-green-100 mb-1.5">
                                        How to Receive Crypto
                                    </p>
                                    <p className="text-xs leading-relaxed text-green-700 dark:text-green-300">
                                        Send {selectedAddress.currency.toUpperCase()} from Binance or any exchange to the address above. Bridge will automatically convert and forward the funds to your wallet. Make sure to send on the {selectedAddress.chain} network.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                ) : selectedCrypto ? (
                    <div className="text-center py-8">
                        <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Creating liquidation address...</p>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <Coins className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Select a crypto to receive</p>
                    </div>
                )}
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="p-4 space-y-4"
        >
            {renderCryptoTab()}
        </motion.div>
    )
}

