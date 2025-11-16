"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card } from "@/components/frontend/ui/card"
import { Head, Link } from "@inertiajs/react"
import { Download, CheckCircle, Award, Coins, Calendar, Hash, ArrowLeft } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import html2canvas from "html2canvas"
import { showSuccessToast } from "@/lib/toast"

interface FractionalAsset {
    id: number
    name: string
    type: string
    symbol: string | null
}

interface FractionalOffering {
    id: number
    title: string
    asset: FractionalAsset
    price_per_share: number
    token_price: number | null
    ownership_percentage: number | null
    currency: string
}

interface User {
    id: number
    name: string
    email: string
}

interface FractionalOrder {
    id: number
    tag_number: string
    tokens: number
    shares: number
    amount: number
    paid_at: string
    meta: {
        full_shares?: number
        tokens?: number
        total_tokens?: number
        all_tag_numbers?: string[]
        [key: string]: unknown
    } | null
    offering: FractionalOffering
    user: User
}

interface CertificateProps {
    order: FractionalOrder
}

export default function FractionalCertificate({ order }: CertificateProps) {
    const certificateRef = useRef<HTMLDivElement>(null)
    const [isDownloading, setIsDownloading] = useState(false)

    const tokenPrice = order.offering.token_price || order.offering.price_per_share
    const costPerShare = order.offering.price_per_share
    const ownershipPercentage = costPerShare > 0 ? ((order.amount / costPerShare) * 100).toFixed(3) : '0'
    const ownershipPerToken = order.offering.ownership_percentage || 0
    
    // Get shares and tokens from order meta or calculate
    const orderMeta = order.meta || {}
    const fullShares = orderMeta.full_shares ?? order.shares ?? 0
    const tokensPerShare = tokenPrice > 0 && costPerShare > 0 ? Math.floor(costPerShare / tokenPrice) : 0
    const tokensFromShares = fullShares * tokensPerShare
    const tokens = orderMeta.tokens ?? Math.max(0, order.tokens - tokensFromShares)
    const totalTokens = order.tokens
    
    // Get all tag numbers from meta
    const allTagNumbers = orderMeta.all_tag_numbers || (order.tag_number ? [order.tag_number] : [])

    const handleDownload = async () => {
        if (!certificateRef.current) return

        setIsDownloading(true)
        try {
            // Wait for animations to complete
            await new Promise(resolve => setTimeout(resolve, 500))

            const canvas = await html2canvas(certificateRef.current, {
                backgroundColor: '#ffffff',
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
            })

            // Convert to blob and download
            canvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob)
                    const link = document.createElement('a')
                    link.href = url
                    link.download = `fractional-ownership-certificate-${order.tag_number.replace('#', '')}.png`
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                    URL.revokeObjectURL(url)
                    showSuccessToast('Certificate downloaded successfully!')
                }
            }, 'image/png')

            setIsDownloading(false)
        } catch (error) {
            console.error('Download error:', error)
            setIsDownloading(false)
        }
    }

    return (
        <FrontendLayout>
            <Head title={`Certificate - ${order.offering.title}`} />

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
                <div className="container mx-auto px-4">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6"
                    >
                        <Link href={route('fractional.index')}>
                            <Button variant="ghost" size="sm" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Offerings
                            </Button>
                        </Link>
                    </motion.div>

                    {/* Certificate */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="max-w-4xl mx-auto"
                    >
                        <div
                            ref={certificateRef}
                            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border-2 border-gray-200 dark:border-gray-700"
                        >
                            {/* Certificate Header with Gradient */}
                            <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 py-12 px-8 text-white">
                                <div className="absolute inset-0 opacity-10">
                                    <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
                                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
                                </div>
                                <div className="relative z-10 text-center">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                                        className="inline-block mb-4"
                                    >
                                        <Award className="h-20 w-20 mx-auto text-yellow-300" />
                                    </motion.div>
                                    <motion.h1
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                        className="text-4xl md:text-5xl font-bold mb-2"
                                    >
                                        Certificate of Ownership
                                    </motion.h1>
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                        className="text-xl opacity-90"
                                    >
                                        Fractional Ownership Investment
                                    </motion.p>
                                </div>
                            </div>

                            {/* Certificate Body */}
                            <div className="p-8 md:p-12 bg-white dark:bg-gray-800">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                    className="text-center mb-10"
                                >
                                    <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
                                        This certifies that
                                    </p>
                                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3 pb-4 border-b-2 border-blue-500 dark:border-blue-400 inline-block">
                                        {order.user.name}
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-400 mt-6 text-lg">
                                        has successfully purchased fractional ownership in
                                    </p>
                                </motion.div>

                                {/* Asset Details Card */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.7 }}
                                    className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-6 mb-8 border border-gray-200 dark:border-gray-700"
                                >
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                                        {order.offering.title}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                                <Coins className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Asset</p>
                                                <p className="text-lg font-bold text-gray-900 dark:text-white">{order.offering.asset.name}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                                                <Hash className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                                    Tag Number{allTagNumbers.length > 1 ? 's' : ''}
                                                </p>
                                                {allTagNumbers.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {allTagNumbers.map((tag, index) => (
                                                            <span 
                                                                key={index}
                                                                className="inline-block px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md font-bold text-sm border border-purple-200 dark:border-purple-700"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-lg font-bold text-gray-900 dark:text-white">{order.tag_number || 'N/A'}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Purchase Breakdown */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.75 }}
                                    className="mb-6 p-5 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900/50 dark:to-gray-800/50 rounded-xl border-2 border-blue-200 dark:border-blue-700"
                                >
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 text-center">Purchase Breakdown</p>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-center gap-6 flex-wrap">
                                            {fullShares > 0 && (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
                                                        <span className="text-white font-bold text-lg">{fullShares}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Full Share{fullShares !== 1 ? 's' : ''}</p>
                                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                                            {fullShares} {fullShares === 1 ? 'Share' : 'Shares'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                            {tokens > 0 && (
                                                <div className={`flex items-center gap-3 ${fullShares > 0 ? 'pl-6 border-l-2 border-gray-300 dark:border-gray-600' : ''}`}>
                                                    <div className="w-12 h-12 rounded-full bg-purple-600 dark:bg-purple-500 flex items-center justify-center">
                                                        <span className="text-white font-bold text-lg">{tokens}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Token{tokens !== 1 ? 's' : ''}</p>
                                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                                            {tokens} {tokens === 1 ? 'Token' : 'Tokens'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {allTagNumbers.length > 1 && (
                                            <div className="pt-4 border-t border-gray-300 dark:border-gray-600">
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 text-center">Tag Numbers</p>
                                                <div className="flex flex-wrap items-center justify-center gap-2">
                                                    {allTagNumbers.map((tag, index) => (
                                                        <span 
                                                            key={index}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border-2 border-purple-300 dark:border-purple-600 rounded-lg font-bold text-sm text-purple-700 dark:text-purple-300"
                                                        >
                                                            <Hash className="h-3.5 w-3.5" />
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>

                                {/* Investment Details Grid */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.8 }}
                                    className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8"
                                >
                                    <div className="text-center p-5 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Amount Invested</p>
                                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                            {order.offering.currency} {order.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="text-center p-5 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Ownership</p>
                                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{ownershipPercentage}%</p>
                                    </div>
                                    <div className="text-center p-5 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Purchase Date</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                            {new Date(order.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>
                                </motion.div>

                                {/* Footer */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.9 }}
                                    className="text-center border-t-2 border-gray-200 dark:border-gray-700 pt-6 mt-8"
                                >
                                    <div className="flex items-center justify-center gap-2 mb-4">
                                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                        </div>
                                        <span className="font-semibold text-gray-900 dark:text-white">Verified Purchase</span>
                                    </div>
                                    <div className="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                                        {allTagNumbers.length > 0 && (
                                            <>
                                                <span>
                                                    Tag Number{allTagNumbers.length > 1 ? 's' : ''}:{' '}
                                                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                                                        {allTagNumbers.join(', ')}
                                                    </span>
                                                </span>
                                                <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                                            </>
                                        )}
                                        <span>Order #<span className="font-semibold text-gray-700 dark:text-gray-300">{order.id}</span></span>
                                    </div>
                                </motion.div>
                            </div>
                        </div>

                        {/* Download Button */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1 }}
                            className="mt-8 text-center"
                        >
                            <Button
                                onClick={handleDownload}
                                disabled={isDownloading}
                                size="lg"
                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600 text-white px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                            >
                                {isDownloading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                        Preparing Download...
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-5 w-5 mr-2" />
                                        Download Certificate
                                    </>
                                )}
                            </Button>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </FrontendLayout>
    )
}

