"use client"

import React, { useState, useEffect } from 'react'
import { X, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface PromotionalBannerProps {
    banner: {
        id: number
        title?: string | null
        type: 'image' | 'text'
        image_url?: string | null
        text_content?: string | null
        external_link?: string | null
        background_color?: string | null
        text_color?: string | null
    } | null
    banners?: Array<{
        id: number
        title?: string | null
        type: 'image' | 'text'
        image_url?: string | null
        text_content?: string | null
        external_link?: string | null
        background_color?: string | null
        text_color?: string | null
    }> | null
}

export default function PromotionalBanner({ banner, banners }: PromotionalBannerProps) {
    // If multiple banners provided, use carousel mode; otherwise single banner
    const allBanners = banners && banners.length > 0 ? banners : (banner ? [banner] : [])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isVisible, setIsVisible] = useState(true)
    const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set())
    const [isPaused, setIsPaused] = useState(false)

    // Filter out dismissed banners
    const activeBanners = allBanners.filter(b => !dismissedIds.has(b.id))

    // Check if banners were dismissed in session storage
    useEffect(() => {
        const dismissed = new Set<number>()
        allBanners.forEach(b => {
            const isDismissed = sessionStorage.getItem(`banner_${b.id}_dismissed`)
            if (isDismissed === 'true') {
                dismissed.add(b.id)
            }
        })
        setDismissedIds(dismissed)
    }, [allBanners])

    // Auto-slide effect (only if multiple banners and not paused)
    useEffect(() => {
        if (activeBanners.length <= 1 || isPaused) return

        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % activeBanners.length)
        }, 5000) // Change banner every 5 seconds

        return () => clearInterval(interval)
    }, [activeBanners.length, isPaused])

    // Reset index when active banners change
    useEffect(() => {
        if (currentIndex >= activeBanners.length) {
            setCurrentIndex(0)
        }
    }, [activeBanners.length, currentIndex])

    const handleDismiss = (bannerId: number) => {
        setDismissedIds(prev => new Set([...prev, bannerId]))
        sessionStorage.setItem(`banner_${bannerId}_dismissed`, 'true')
        
        // If all banners dismissed, hide component
        if (dismissedIds.size + 1 >= activeBanners.length) {
            setIsVisible(false)
        } else {
            // Adjust current index if needed
            const newIndex = currentIndex >= activeBanners.length - 1 ? 0 : currentIndex
            setCurrentIndex(newIndex)
        }
    }

    const handlePrevious = () => {
        setCurrentIndex((prevIndex) => (prevIndex - 1 + activeBanners.length) % activeBanners.length)
        setIsPaused(true)
        setTimeout(() => setIsPaused(false), 10000) // Resume after 10 seconds
    }

    const handleNext = () => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % activeBanners.length)
        setIsPaused(true)
        setTimeout(() => setIsPaused(false), 10000) // Resume after 10 seconds
    }

    const handleClick = (banner: typeof activeBanners[0]) => {
        if (banner.external_link) {
            window.open(banner.external_link, '_blank', 'noopener,noreferrer')
        }
    }

    if (!isVisible || activeBanners.length === 0) {
        return null
    }

    const currentBanner = activeBanners[currentIndex]

    const isImageBanner = currentBanner.type === 'image' && currentBanner.image_url
    const bannerHeight = 'h-32 sm:h-40 md:h-44 lg:h-48' // Responsive fixed height (reduced)

    return (
        <div 
            className={`relative w-full mb-6 overflow-hidden rounded-xl shadow-lg ${bannerHeight} ${
                isImageBanner ? 'bg-transparent' : ''
            }`}
            style={!isImageBanner ? {
                backgroundColor: currentBanner.background_color || '#3b82f6',
            } : undefined}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Close Button - Fixed Position in Top Right */}
            <button
                onClick={() => handleDismiss(currentBanner.id)}
                className={`absolute top-2 right-2 sm:top-3 sm:right-3 z-30 p-1.5 rounded-full backdrop-blur-sm transition-colors ${
                    isImageBanner 
                        ? 'bg-black/40 hover:bg-black/50' 
                        : 'bg-black/20 hover:bg-black/30'
                }`}
                aria-label="Close banner"
            >
                <X className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: isImageBanner ? '#ffffff' : (currentBanner.text_color || '#ffffff') }} />
            </button>

            {/* Sliding Content Container */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentBanner.id}
                    initial={{ opacity: 0, x: 300 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -300 }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                    className="w-full h-full"
                    style={!isImageBanner ? {
                        color: currentBanner.text_color || '#ffffff',
                    } : undefined}
                >
                    {isImageBanner ? (
                        /* Image Banner - No background, image fills container */
                        <div className="relative w-full h-full">
                            <motion.img
                                src={currentBanner.image_url!}
                                alt={currentBanner.title || 'Promotional banner'}
                                className="w-full h-full object-cover"
                                initial={{ scale: 1 }}
                                whileHover={currentBanner.external_link ? { scale: 1.02 } : {}}
                                transition={{ duration: 0.3 }}
                            />
                            {currentBanner.external_link && (
                                <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-2 py-1 sm:px-3 sm:py-1.5 rounded-full">
                                    <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="text-xs sm:text-sm font-medium">Learn More</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Text Banner - With background color */
                        <div
                            onClick={currentBanner.external_link ? () => handleClick(currentBanner) : undefined}
                            className={`relative w-full h-full flex items-center justify-between p-4 sm:p-6 ${
                                currentBanner.external_link ? 'cursor-pointer' : ''
                            } ${activeBanners.length > 1 ? 'pl-12 sm:pl-14 pr-12 sm:pr-14' : 'pl-4 sm:pl-6 pr-12 sm:pr-14'}`}
                        >
                            <motion.div
                                className="flex-1 min-w-0 flex flex-col justify-center"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                {currentBanner.title && (
                                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2">{currentBanner.title}</h3>
                                )}
                                {currentBanner.text_content && (
                                    <p className="text-sm sm:text-base md:text-lg leading-relaxed">{currentBanner.text_content}</p>
                                )}
                            </motion.div>
                            {currentBanner.external_link && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="flex-shrink-0 hidden sm:block"
                                >
                                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-colors whitespace-nowrap">
                                        <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
                                        <span className="font-semibold text-sm sm:text-base">Visit</span>
                                    </div>
                                </motion.div>
                            )}
                            
                            {/* Animated Background Gradient - Only for text banners */}
                            <motion.div
                                className="absolute inset-0 opacity-10 pointer-events-none"
                                animate={{
                                    background: [
                                        'radial-gradient(circle at 0% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)',
                                        'radial-gradient(circle at 100% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)',
                                        'radial-gradient(circle at 0% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)',
                                    ],
                                }}
                                transition={{
                                    duration: 8,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                }}
                            />
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons - Fixed Position on edges (only show if multiple banners) */}
            {activeBanners.length > 1 && (
                <>
                    <button
                        onClick={handlePrevious}
                        className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-30 p-1.5 sm:p-2 rounded-full bg-black/40 hover:bg-black/50 backdrop-blur-sm transition-colors shadow-lg"
                        aria-label="Previous banner"
                    >
                        <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-white" />
                    </button>
                    <button
                        onClick={handleNext}
                        className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-30 p-1.5 sm:p-2 rounded-full bg-black/40 hover:bg-black/50 backdrop-blur-sm transition-colors shadow-lg"
                        aria-label="Next banner"
                    >
                        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-white" />
                    </button>
                </>
            )}

            {/* Dots Indicator - Fixed Position (only show if multiple banners) */}
            {activeBanners.length > 1 && (
                <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                    {activeBanners.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                setCurrentIndex(index)
                                setIsPaused(true)
                                setTimeout(() => setIsPaused(false), 10000)
                            }}
                            className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                                index === currentIndex 
                                    ? 'w-6 sm:w-8 bg-white/80' 
                                    : 'w-1.5 sm:w-2 bg-white/40 hover:bg-white/60'
                            }`}
                            aria-label={`Go to banner ${index + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

