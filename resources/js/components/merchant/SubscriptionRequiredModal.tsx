import React, { useEffect, useState } from 'react'
import { Link, router } from '@inertiajs/react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Crown, Lock, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react'
import { MerchantButton } from '@/components/merchant-ui'

interface SubscriptionRequiredModalProps {
  isOpen: boolean
  onClose?: () => void
}

export function SubscriptionRequiredModal({ isOpen, onClose }: SubscriptionRequiredModalProps) {
  const [showAnimation, setShowAnimation] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Trigger animation after modal opens
      setTimeout(() => setShowAnimation(true), 100)
    } else {
      setShowAnimation(false)
    }
  }, [isOpen])

  const handleSubscribe = () => {
    router.visit('/subscription')
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 50 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl bg-gradient-to-br from-[#1a0a0a] via-[#2d1b1b] to-[#1a0a0a] rounded-2xl shadow-2xl border border-[#FF1493]/20 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 animate-pulse"></div>
          
          {/* Sparkle Effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: Math.random() * window.innerWidth,
                  y: Math.random() * window.innerHeight,
                  opacity: 0,
                  scale: 0
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  y: Math.random() * window.innerHeight,
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
                className="absolute w-2 h-2 bg-[#FF1493] rounded-full"
              />
            ))}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div className="relative z-10 p-8 sm:p-12">
            {/* Icon Animation */}
            <div className="flex justify-center mb-6">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] rounded-full blur-xl opacity-50 animate-pulse"></div>
                <div className="relative p-6 bg-gradient-to-br from-[#FF1493] via-[#DC143C] to-[#E97451] rounded-full">
                  <Lock className="w-12 h-12 text-white" />
                </div>
              </motion.div>
            </div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl sm:text-4xl font-bold text-center text-white mb-4"
            >
              Subscription Required
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center text-gray-300 mb-8 text-lg"
            >
              To access this feature, please subscribe to one of our plans. Choose the perfect plan for your business needs.
            </motion.p>

            {/* Features List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-4 mb-8"
            >
              {[
                'Unlimited Offers',
                'Advanced Analytics',
                'Priority Support',
                'QR Code Scanning',
                'Redemption Management',
              ].map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex items-center gap-3 text-gray-300"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.7 + index * 0.1, type: 'spring' }}
                  >
                    <CheckCircle2 className="w-5 h-5 text-[#FF1493]" />
                  </motion.div>
                  <span>{feature}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center"
            >
              <MerchantButton
                onClick={handleSubscribe}
                className="flex items-center justify-center gap-2 text-base sm:text-lg px-6 sm:px-10 py-3 sm:py-4 bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] hover:from-[#FF1493]/90 hover:via-[#DC143C]/90 hover:to-[#E97451]/90 text-white shadow-lg shadow-[#FF1493]/50 font-semibold"
              >
                <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
                View Plans
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </MerchantButton>
              <button
                onClick={onClose}
                className="px-6 sm:px-10 py-3 sm:py-4 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800/50 transition-colors text-base sm:text-lg font-medium"
              >
                Maybe Later
              </button>
            </motion.div>

            {/* Floating Elements */}
            <motion.div
              animate={{
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute top-20 left-10 opacity-20"
            >
              <Sparkles className="w-8 h-8 text-[#FF1493]" />
            </motion.div>
            <motion.div
              animate={{
                y: [0, 10, 0],
                rotate: [0, -5, 5, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 1,
              }}
              className="absolute bottom-20 right-10 opacity-20"
            >
              <Crown className="w-8 h-8 text-[#DC143C]" />
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
