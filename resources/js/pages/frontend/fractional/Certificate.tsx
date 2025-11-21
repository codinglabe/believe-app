"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card } from "@/components/frontend/ui/card"
import { Head, Link } from "@inertiajs/react"
import { Download, CheckCircle, Award, Coins, Calendar, Hash, ArrowLeft, Sparkles, Star } from "lucide-react"
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
    order_number: string | null
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
    const [showConfetti, setShowConfetti] = useState(true)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Trigger entrance animation
        setIsVisible(true)
        
        // Show confetti for 5 seconds
        const confettiTimer = setTimeout(() => setShowConfetti(false), 5000)
        return () => clearTimeout(confettiTimer)
    }, [])

    const tokenPrice = order.offering.token_price || order.offering.price_per_share
    const costPerShare = order.offering.price_per_share
    const ownershipPercentageValue = costPerShare > 0 ? ((order.amount / costPerShare) * 100) : 0
    // Format percentage: remove trailing zeros, show up to 3 decimal places
    const ownershipPercentage = ownershipPercentageValue > 0 
        ? parseFloat(ownershipPercentageValue.toFixed(3)).toString() 
        : '0'
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
                    const tagNumbers = allTagNumbers.length > 0 ? allTagNumbers[0].replace('#', '') : 'certificate'
                    link.download = `fractional-ownership-certificate-${tagNumbers}.png`
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

    // Confetti Component
    const ConfettiExplosion = () => (
        <AnimatePresence>
            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                    {[...Array(100)].map((_, i) => {
                        const colors = [
                            '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
                            '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE',
                            '#FFA07A', '#20B2AA', '#87CEEB', '#FFB6C1', '#DDA0DD'
                        ]
                        const randomColor = colors[Math.floor(Math.random() * colors.length)]
                        const randomLeft = Math.random() * 100
                        const randomDelay = Math.random() * 2
                        const randomDuration = 2 + Math.random() * 3
                        const randomRotation = Math.random() * 360

                        return (
                            <motion.div
                                key={i}
                                className="absolute w-3 h-3 rounded-full"
                                style={{
                                    backgroundColor: randomColor,
                                    left: `${randomLeft}%`,
                                    top: '-10px',
                                    boxShadow: `0 0 6px ${randomColor}`,
                                }}
                                initial={{ 
                                    y: -10, 
                                    opacity: 1, 
                                    scale: 0,
                                    rotate: 0,
                                }}
                                animate={{
                                    y: window.innerHeight + 100,
                                    opacity: [1, 1, 0],
                                    scale: [0, 1.2, 0.8, 0],
                                    rotate: randomRotation,
                                    x: (Math.random() - 0.5) * 200,
                                }}
                                transition={{
                                    duration: randomDuration,
                                    ease: "easeOut",
                                    delay: randomDelay,
                                }}
                            />
                        )
                    })}
                    {/* Sparkle effects */}
                    {[...Array(30)].map((_, i) => (
                        <motion.div
                            key={`sparkle-${i}`}
                            className="absolute"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                            }}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{
                                opacity: [0, 1, 0],
                                scale: [0, 1, 0],
                                rotate: 360,
                            }}
                            transition={{
                                duration: 1.5 + Math.random(),
                                repeat: Infinity,
                                delay: Math.random() * 2,
                            }}
                        >
                            <Sparkles className="w-4 h-4 text-yellow-400" />
                        </motion.div>
                    ))}
                </div>
            )}
        </AnimatePresence>
    )

    return (
        <FrontendLayout>
            <Head title={`Certificate - ${order.offering.title}`} />

            {/* Confetti Animation */}
            <ConfettiExplosion />

            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 relative overflow-hidden">
                {/* Animated background elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(20)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-64 h-64 rounded-full opacity-10 blur-3xl"
                            style={{
                                background: `linear-gradient(135deg, ${
                                    ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981'][i % 4]
                                }, transparent)`,
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                            }}
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.1, 0.2, 0.1],
                            }}
                            transition={{
                                duration: 5 + Math.random() * 5,
                                repeat: Infinity,
                                delay: Math.random() * 2,
                            }}
                        />
                    ))}
                </div>

                <div className="container mx-auto px-4 relative z-10">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={isVisible ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.5 }}
                        className="mb-6"
                    >
                        <Link href={route('fractional.index')}>
                            <Button variant="ghost" size="sm" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white backdrop-blur-sm bg-white/50 dark:bg-gray-800/50">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Offerings
                            </Button>
                        </Link>
                    </motion.div>

                    {/* Certificate */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 50 }}
                        animate={isVisible ? { opacity: 1, scale: 1, y: 0 } : {}}
                        transition={{ 
                            duration: 0.8,
                            type: "spring",
                            stiffness: 100,
                            damping: 15
                        }}
                        className="max-w-5xl mx-auto"
                    >
                        <div className="p-1 rounded-[2rem] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 shadow-2xl">
                            <div
                                ref={certificateRef}
                                className="bg-white dark:bg-gray-800 rounded-[2rem] overflow-hidden relative"
                            >
                            {/* Ornamental border corners */}
                            <div className="absolute top-0 left-0 w-24 h-24 border-t-4 border-l-4 border-blue-500 dark:border-blue-400 rounded-tl-[2rem] opacity-50"></div>
                            <div className="absolute top-0 right-0 w-24 h-24 border-t-4 border-r-4 border-purple-500 dark:border-purple-400 rounded-tr-[2rem] opacity-50"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 border-b-4 border-l-4 border-pink-500 dark:border-pink-400 rounded-bl-[2rem] opacity-50"></div>
                            <div className="absolute bottom-0 right-0 w-24 h-24 border-b-4 border-r-4 border-blue-500 dark:border-blue-400 rounded-br-[2rem] opacity-50"></div>
                            {/* Certificate Header with Gradient */}
                            <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 py-16 px-8 text-white overflow-hidden">
                                {/* Animated background pattern */}
                                <div className="absolute inset-0 opacity-20">
                                    <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
                                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-300 rounded-full blur-3xl opacity-30"></div>
                                </div>
                                
                                {/* Floating stars */}
                                {[...Array(8)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className="absolute"
                                        style={{
                                            left: `${10 + i * 12}%`,
                                            top: `${20 + (i % 3) * 30}%`,
                                        }}
                                        animate={{
                                            y: [0, -20, 0],
                                            rotate: [0, 180, 360],
                                            opacity: [0.3, 0.8, 0.3],
                                        }}
                                        transition={{
                                            duration: 3 + Math.random() * 2,
                                            repeat: Infinity,
                                            delay: Math.random() * 2,
                                        }}
                                    >
                                        <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                                    </motion.div>
                                ))}

                                <div className="relative z-10 text-center">
                                    <motion.div
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={isVisible ? { scale: 1, rotate: 0 } : {}}
                                        transition={{ 
                                            delay: 0.3, 
                                            type: "spring", 
                                            stiffness: 200,
                                            damping: 15
                                        }}
                                        className="inline-block mb-6"
                                    >
                                        <motion.div
                                            animate={{
                                                rotate: [0, 10, -10, 0],
                                                scale: [1, 1.1, 1],
                                            }}
                                            transition={{
                                                duration: 2,
                                                repeat: Infinity,
                                                repeatDelay: 3,
                                            }}
                                        >
                                            <Award className="h-24 w-24 mx-auto text-yellow-300 drop-shadow-2xl" />
                                        </motion.div>
                                    </motion.div>
                                    <motion.h1
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={isVisible ? { opacity: 1, y: 0 } : {}}
                                        transition={{ delay: 0.5, duration: 0.6 }}
                                        className="text-5xl md:text-6xl font-bold mb-3 tracking-tight"
                                        style={{
                                            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                                        }}
                                    >
                                        Certificate of Ownership
                                    </motion.h1>
                                    <motion.p
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={isVisible ? { opacity: 1, y: 0 } : {}}
                                        transition={{ delay: 0.7, duration: 0.6 }}
                                        className="text-2xl opacity-95 font-medium tracking-wide"
                                    >
                                        Fractional Ownership Investment
                                    </motion.p>
                                    
                                    {/* Decorative line */}
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={isVisible ? { width: '200px' } : {}}
                                        transition={{ delay: 0.9, duration: 0.8 }}
                                        className="mx-auto mt-6 h-1 bg-gradient-to-r from-transparent via-yellow-300 to-transparent rounded-full"
                                    />
                                </div>
                            </div>

                            {/* Certificate Body */}
                            <div className="p-8 md:p-12 bg-white dark:bg-gray-800 relative">
                                {/* Subtle pattern overlay */}
                                <div className="absolute inset-0 opacity-5 pointer-events-none">
                                    <div className="absolute inset-0" style={{
                                        backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
                                        backgroundSize: '20px 20px',
                                    }}></div>
                                </div>

                                <div className="relative z-10">
                                    <motion.div
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={isVisible ? { opacity: 1, y: 0 } : {}}
                                        transition={{ delay: 0.8, duration: 0.6 }}
                                        className="text-center mb-12"
                                    >
                                        <motion.p 
                                            className="text-gray-600 dark:text-gray-400 text-xl mb-6 font-medium"
                                            initial={{ opacity: 0 }}
                                            animate={isVisible ? { opacity: 1 } : {}}
                                            transition={{ delay: 1 }}
                                        >
                                            This certifies that
                                        </motion.p>
                                        <motion.h2 
                                            className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 pb-6 border-b-4 border-gradient-to-r from-blue-500 via-purple-500 to-pink-500 inline-block"
                                            style={{
                                                borderImage: 'linear-gradient(135deg, #3B82F6, #8B5CF6, #EC4899) 1',
                                            }}
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={isVisible ? { scale: 1, opacity: 1 } : {}}
                                            transition={{ delay: 1.1, type: "spring", stiffness: 150 }}
                                        >
                                            {order.user.name}
                                        </motion.h2>
                                        <motion.p 
                                            className="text-gray-600 dark:text-gray-400 mt-8 text-xl font-medium"
                                            initial={{ opacity: 0 }}
                                            animate={isVisible ? { opacity: 1 } : {}}
                                            transition={{ delay: 1.3 }}
                                        >
                                            has successfully purchased fractional ownership in
                                        </motion.p>
                                    </motion.div>

                                {/* Asset Details Card */}
                                <motion.div
                                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                    animate={isVisible ? { opacity: 1, y: 0, scale: 1 } : {}}
                                    transition={{ delay: 1.4, duration: 0.6, type: "spring" }}
                                    className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/80 dark:to-gray-800/80 rounded-2xl p-8 mb-10 border-2 border-gray-200 dark:border-gray-700 shadow-lg relative overflow-hidden"
                                >
                                    {/* Decorative corner elements */}
                                    <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-blue-400 dark:border-blue-500 rounded-tl-2xl opacity-30"></div>
                                    <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-purple-400 dark:border-purple-500 rounded-br-2xl opacity-30"></div>
                                    
                                    <motion.h3 
                                        className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center relative z-10"
                                        initial={{ opacity: 0 }}
                                        animate={isVisible ? { opacity: 1 } : {}}
                                        transition={{ delay: 1.5 }}
                                    >
                                        {order.offering.title}
                                    </motion.h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                        <motion.div 
                                            className="flex items-start gap-4 p-5 bg-white dark:bg-gray-800 rounded-xl border-2 border-blue-200 dark:border-blue-700 shadow-md hover:shadow-lg transition-shadow"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={isVisible ? { opacity: 1, x: 0 } : {}}
                                            transition={{ delay: 1.6 }}
                                        >
                                            <motion.div 
                                                className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 flex items-center justify-center flex-shrink-0 shadow-md"
                                                animate={{ rotate: [0, 5, -5, 0] }}
                                                transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                                            >
                                                <Coins className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                                            </motion.div>
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Asset</p>
                                                <p className="text-xl font-bold text-gray-900 dark:text-white">{order.offering.asset.name}</p>
                                            </div>
                                        </motion.div>
                                        <motion.div 
                                            className="flex items-start gap-4 p-5 bg-white dark:bg-gray-800 rounded-xl border-2 border-purple-200 dark:border-purple-700 shadow-md hover:shadow-lg transition-shadow"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={isVisible ? { opacity: 1, x: 0 } : {}}
                                            transition={{ delay: 1.7 }}
                                        >
                                            <motion.div 
                                                className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 flex items-center justify-center flex-shrink-0 shadow-md"
                                                animate={{ rotate: [0, -5, 5, 0] }}
                                                transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                                            >
                                                <Hash className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                                            </motion.div>
                                            <div className="flex-1">
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                                    Tag Number{allTagNumbers.length > 1 ? 's' : ''}
                                                </p>
                                                {allTagNumbers.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {allTagNumbers.map((tag, index) => (
                                                            <motion.span 
                                                                key={index}
                                                                className="inline-block px-4 py-2 bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 text-purple-700 dark:text-purple-300 rounded-lg font-bold text-sm border-2 border-purple-300 dark:border-purple-600 shadow-sm"
                                                                initial={{ scale: 0 }}
                                                                animate={isVisible ? { scale: 1 } : {}}
                                                                transition={{ delay: 1.8 + index * 0.1, type: "spring" }}
                                                            >
                                                                {tag}
                                                            </motion.span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xl font-bold text-gray-900 dark:text-white">{order.tag_number || 'N/A'}</p>
                                                )}
                                            </div>
                                        </motion.div>
                                    </div>
                                </motion.div>

                                {/* Purchase Breakdown */}
                                <motion.div
                                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                    animate={isVisible ? { opacity: 1, y: 0, scale: 1 } : {}}
                                    transition={{ delay: 1.9, duration: 0.6 }}
                                    className="mb-8 p-8 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900/60 dark:via-gray-800/60 dark:to-gray-900/60 rounded-2xl border-2 border-blue-300 dark:border-blue-600 shadow-lg relative overflow-hidden"
                                >
                                    {/* Animated gradient overlay */}
                                    <motion.div
                                        className="absolute inset-0 opacity-20"
                                        animate={{
                                            background: [
                                                'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                                                'linear-gradient(135deg, #8B5CF6, #EC4899)',
                                                'linear-gradient(135deg, #EC4899, #3B82F6)',
                                                'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                                            ],
                                        }}
                                        transition={{
                                            duration: 5,
                                            repeat: Infinity,
                                        }}
                                    />
                                    <div className="relative z-10">
                                        <motion.p 
                                            className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-6 text-center"
                                            initial={{ opacity: 0 }}
                                            animate={isVisible ? { opacity: 1 } : {}}
                                            transition={{ delay: 2 }}
                                        >
                                            Purchase Breakdown
                                        </motion.p>
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-center gap-8 flex-wrap">
                                                {fullShares > 0 && (
                                                    <motion.div 
                                                        className="flex items-center gap-4"
                                                        initial={{ opacity: 0, scale: 0.5, x: -50 }}
                                                        animate={isVisible ? { opacity: 1, scale: 1, x: 0 } : {}}
                                                        transition={{ delay: 2.1, type: "spring", stiffness: 200 }}
                                                    >
                                                        <motion.div 
                                                            className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 flex items-center justify-center shadow-xl"
                                                            animate={{ 
                                                                boxShadow: [
                                                                    '0 0 0 0 rgba(59, 130, 246, 0.7)',
                                                                    '0 0 0 10px rgba(59, 130, 246, 0)',
                                                                    '0 0 0 0 rgba(59, 130, 246, 0)',
                                                                ],
                                                            }}
                                                            transition={{ duration: 2, repeat: Infinity }}
                                                        >
                                                            <span className="text-white font-bold text-xl">{fullShares}</span>
                                                        </motion.div>
                                                        <div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Full Share{fullShares !== 1 ? 's' : ''}</p>
                                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                                {fullShares} {fullShares === 1 ? 'Share' : 'Shares'}
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                )}
                                                {tokens > 0 && (
                                                    <motion.div 
                                                        className={`flex items-center gap-4 ${fullShares > 0 ? 'pl-8 border-l-2 border-gray-300 dark:border-gray-600' : ''}`}
                                                        initial={{ opacity: 0, scale: 0.5, x: 50 }}
                                                        animate={isVisible ? { opacity: 1, scale: 1, x: 0 } : {}}
                                                        transition={{ delay: 2.2, type: "spring", stiffness: 200 }}
                                                    >
                                                        <motion.div 
                                                            className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 dark:from-purple-500 dark:to-purple-600 flex items-center justify-center shadow-xl"
                                                            animate={{ 
                                                                boxShadow: [
                                                                    '0 0 0 0 rgba(139, 92, 246, 0.7)',
                                                                    '0 0 0 10px rgba(139, 92, 246, 0)',
                                                                    '0 0 0 0 rgba(139, 92, 246, 0)',
                                                                ],
                                                            }}
                                                            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                                                        >
                                                            <span className="text-white font-bold text-xl">{tokens}</span>
                                                        </motion.div>
                                                        <div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Token{tokens !== 1 ? 's' : ''}</p>
                                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                                {tokens} {tokens === 1 ? 'Token' : 'Tokens'}
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>
                                            {allTagNumbers.length > 1 && (
                                                <motion.div 
                                                    className="pt-6 border-t-2 border-gray-300 dark:border-gray-600"
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={isVisible ? { opacity: 1, y: 0 } : {}}
                                                    transition={{ delay: 2.3 }}
                                                >
                                                    <p className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-4 text-center">Tag Numbers</p>
                                                    <div className="flex flex-wrap items-center justify-center gap-3">
                                                        {allTagNumbers.map((tag, index) => (
                                                            <motion.span 
                                                                key={index}
                                                                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-2 border-purple-400 dark:border-purple-500 rounded-xl font-bold text-sm text-purple-700 dark:text-purple-300 shadow-md"
                                                                initial={{ opacity: 0, scale: 0 }}
                                                                animate={isVisible ? { opacity: 1, scale: 1 } : {}}
                                                                transition={{ delay: 2.4 + index * 0.1, type: "spring" }}
                                                                whileHover={{ scale: 1.1 }}
                                                            >
                                                                <Hash className="h-4 w-4" />
                                                                {tag}
                                                            </motion.span>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Investment Details Grid */}
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={isVisible ? { opacity: 1, y: 0 } : {}}
                                    transition={{ delay: 2.5, duration: 0.6 }}
                                    className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-10"
                                >
                                    <motion.div 
                                        className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900/60 dark:to-gray-800/60 rounded-2xl border-2 border-blue-200 dark:border-blue-700 shadow-lg"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={isVisible ? { opacity: 1, scale: 1 } : {}}
                                        transition={{ delay: 2.6, type: "spring" }}
                                        whileHover={{ scale: 1.05, y: -5 }}
                                    >
                                        <p className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-3">Amount Invested</p>
                                        <motion.p 
                                            className="text-3xl font-bold text-blue-600 dark:text-blue-400"
                                            initial={{ scale: 0 }}
                                            animate={isVisible ? { scale: 1 } : {}}
                                            transition={{ delay: 2.7, type: "spring" }}
                                        >
                                            {order.offering.currency} {order.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </motion.p>
                                    </motion.div>
                                    <motion.div 
                                        className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-gray-900/60 dark:to-gray-800/60 rounded-2xl border-2 border-purple-200 dark:border-purple-700 shadow-lg"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={isVisible ? { opacity: 1, scale: 1 } : {}}
                                        transition={{ delay: 2.7, type: "spring" }}
                                        whileHover={{ scale: 1.05, y: -5 }}
                                    >
                                        <p className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-3">Ownership</p>
                                        <motion.p 
                                            className="text-3xl font-bold text-purple-600 dark:text-purple-400"
                                            initial={{ scale: 0 }}
                                            animate={isVisible ? { scale: 1 } : {}}
                                            transition={{ delay: 2.8, type: "spring" }}
                                        >
                                            {ownershipPercentage}%
                                        </motion.p>
                                    </motion.div>
                                    <motion.div 
                                        className="text-center p-6 bg-gradient-to-br from-pink-50 to-pink-100 dark:from-gray-900/60 dark:to-gray-800/60 rounded-2xl border-2 border-pink-200 dark:border-pink-700 shadow-lg"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={isVisible ? { opacity: 1, scale: 1 } : {}}
                                        transition={{ delay: 2.8, type: "spring" }}
                                        whileHover={{ scale: 1.05, y: -5 }}
                                    >
                                        <p className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-3">Purchase Date</p>
                                        <motion.p 
                                            className="text-xl font-bold text-gray-900 dark:text-white"
                                            initial={{ scale: 0 }}
                                            animate={isVisible ? { scale: 1 } : {}}
                                            transition={{ delay: 2.9, type: "spring" }}
                                        >
                                            {new Date(order.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </motion.p>
                                    </motion.div>
                                </motion.div>

                                {/* Footer */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={isVisible ? { opacity: 1, y: 0 } : {}}
                                    transition={{ delay: 3, duration: 0.6 }}
                                    className="text-center border-t-4 border-gradient-to-r from-blue-500 via-purple-500 to-pink-500 pt-8 mt-10 relative"
                                    style={{
                                        borderImage: 'linear-gradient(135deg, #3B82F6, #8B5CF6, #EC4899) 1',
                                    }}
                                >
                                    <motion.div 
                                        className="flex items-center justify-center gap-3 mb-6"
                                        initial={{ scale: 0 }}
                                        animate={isVisible ? { scale: 1 } : {}}
                                        transition={{ delay: 3.1, type: "spring" }}
                                    >
                                        <motion.div 
                                            className="w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40 flex items-center justify-center shadow-lg"
                                            animate={{ 
                                                rotate: [0, 10, -10, 0],
                                            }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        >
                                            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                                        </motion.div>
                                        <span className="font-bold text-lg text-gray-900 dark:text-white">Verified Purchase</span>
                                    </motion.div>
                                    <motion.div 
                                        className="flex items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400 flex-wrap"
                                        initial={{ opacity: 0 }}
                                        animate={isVisible ? { opacity: 1 } : {}}
                                        transition={{ delay: 3.2 }}
                                    >
                                        {allTagNumbers.length > 0 && (
                                            <>
                                                <span className="font-medium">
                                                    Tag Number{allTagNumbers.length > 1 ? 's' : ''}:{' '}
                                                    <span className="font-bold text-gray-800 dark:text-gray-200">
                                                        {allTagNumbers.join(', ')}
                                                    </span>
                                                </span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                            </>
                                        )}
                                        <span className="font-medium">
                                            Order ID: <span className="font-bold text-gray-800 dark:text-gray-200">{order.order_number || `#${order.id}`}</span>
                                        </span>
                                    </motion.div>
                                </motion.div>
                                </div>
                            </div>
                            </div>
                        </div>

                        {/* Download Button */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={isVisible ? { opacity: 1, y: 0 } : {}}
                            transition={{ delay: 3.3, duration: 0.6 }}
                            className="mt-10 text-center"
                        >
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <Button
                                    onClick={handleDownload}
                                    disabled={isDownloading}
                                    size="lg"
                                    className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 dark:from-blue-500 dark:via-purple-500 dark:to-pink-500 dark:hover:from-blue-600 dark:hover:via-purple-600 dark:hover:to-pink-600 text-white px-10 py-7 text-xl font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 relative overflow-hidden"
                                >
                                    {/* Animated background shimmer */}
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                        animate={{
                                            x: ['-100%', '100%'],
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            repeatDelay: 1,
                                        }}
                                    />
                                    <span className="relative z-10 flex items-center">
                                        {isDownloading ? (
                                            <>
                                                <motion.div 
                                                    className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mr-3"
                                                />
                                                Preparing Download...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="h-6 w-6 mr-3" />
                                                Download Certificate
                                            </>
                                        )}
                                    </span>
                                </Button>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </FrontendLayout>
    )
}

