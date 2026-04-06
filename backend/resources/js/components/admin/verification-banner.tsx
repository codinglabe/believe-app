"use client"
import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertCircle, Mail, X, Shield, CheckCircle, ArrowRight, Clock, Building, CreditCard } from 'lucide-react'
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { router } from "@inertiajs/react"

interface VerificationBannerProps {
  user: {
    id: number
    name: string
    email: string
    email_verified_at?: string | null
    ownership_verified_at?: string | null
  }
  onDismiss?: () => void
  className?: string
}

export default function VerificationBanner({ user, onDismiss, className = "" }: VerificationBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(60)
  const [canResend, setCanResend] = useState(true)

  // Don't show banner if user is fully verified
  if (user.email_verified_at && user.ownership_verified_at) {
    return null
  }

  useEffect(() => {
    setMounted(true)
    
    // Check if banner was dismissed in this session
    const dismissed = sessionStorage.getItem(`verification-banner-dismissed-${user.id}`)
    if (dismissed === 'true') {
      setIsVisible(false)
    }
  }, [user.id])

  // Countdown timer for resend button
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (verificationSent && timeLeft > 0) {
      setCanResend(false)
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCanResend(true)
            setVerificationSent(false)
            return 60
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [verificationSent, timeLeft])

  const handleResendVerification = async () => {
    if (!canResend) return
    
    setIsVerifying(true)
    try {
      await router.post('/email/verification-notification', {}, {
        preserveState: true,
        preserveScroll: true,
        onSuccess: () => {
          setVerificationSent(true)
          setTimeLeft(60)
        },
        onError: (errors) => {
          console.error('Failed to send verification email:', errors)
        }
      })
    } catch (error) {
      console.error('Failed to send verification email:', error)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleOwnershipVerification = () => {
    router.visit('/verification/ownership')
  }

  const handleDismiss = () => {
    setIsVisible(false)
    // Remember dismissal for this session
    sessionStorage.setItem(`verification-banner-dismissed-${user.id}`, 'true')
    setTimeout(() => {
      onDismiss?.()
    }, 300)
  }

  if (!mounted) return null

  // Determine which verification step we're on
  const isEmailVerified = !!user.email_verified_at
  const isOwnershipVerified = !!user.ownership_verified_at
  
  // Calculate progress
  let progress = 25 // Base progress
  if (isEmailVerified) progress = 50
  if (isOwnershipVerified) progress = 100

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.95 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30,
            duration: 0.6 
          }}
          className={`mb-6 ${className}`}
        >
          <Card className="border-0 shadow-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-red-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-red-900/20 overflow-hidden">
            {/* Animated background pattern */}
            <div className="absolute inset-0 overflow-hidden">
              <motion.div 
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.1, 0.2, 0.1]
                }}
                transition={{ 
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-orange-400 to-red-400 rounded-full blur-3xl"
              />
              <motion.div 
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.1, 0.15, 0.1]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1
                }}
                className="absolute -bottom-10 -left-10 w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full blur-3xl"
              />
            </div>

            <CardContent className="relative p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Icon Section */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <motion.div
                    animate={{ 
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      repeatDelay: 2
                    }}
                    className="relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-500 rounded-full blur-lg opacity-30 animate-pulse" />
                    <div className="relative bg-gradient-to-br from-orange-500 to-red-500 p-3 rounded-full shadow-lg">
                      {!isEmailVerified ? (
                        <Mail className="w-6 h-6 text-white" />
                      ) : (
                        <Building className="w-6 h-6 text-white" />
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Content Section */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                      {!isEmailVerified ? 'Email Verification Required' : 'Organization Ownership Verification Required'}
                    </h3>
                    <motion.div
                      animate={{ 
                        backgroundColor: ["#f59e0b", "#ea580c", "#dc2626", "#ea580c", "#f59e0b"],
                      }}
                      transition={{ 
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="px-3 py-1 rounded-full text-xs font-semibold text-white w-fit shadow-sm"
                    >
                      Action Required
                    </motion.div>
                  </div>

                  <div className="mb-4">
                    {!isEmailVerified ? (
                      <>
                        <p className="text-gray-700 dark:text-gray-300 text-sm sm:text-base leading-relaxed">
                          Hi <span className="font-semibold text-orange-600 dark:text-orange-400">{user.name}</span>! 
                          Please verify your email address to continue with organization setup.
                        </p>
                        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                          <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            <span className="font-mono">{user.email}</span>
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-gray-700 dark:text-gray-300 text-sm sm:text-base leading-relaxed">
                          Great! Your email is verified. Now we need to verify that you represent this organization. 
                          Connect your organization's bank account through Plaid to complete verification.
                        </p>
                        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-700">
                          <p className="text-xs text-blue-800 dark:text-blue-400 flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            We'll verify that the bank account name matches your organization name
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Success Message */}
                  <AnimatePresence>
                    {verificationSent && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -10 }}
                        className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <span className="text-green-800 dark:text-green-300 text-sm font-medium">
                            Verification email sent successfully!
                          </span>
                        </div>
                        <p className="text-green-700 dark:text-green-400 text-xs">
                          Check your inbox and spam folder. The link expires in 60 minutes.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {!isEmailVerified ? (
                      <>
                        <Button
                          onClick={handleResendVerification}
                          disabled={isVerifying || !canResend}
                          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex-1 sm:flex-none group relative overflow-hidden"
                        >
                          <motion.div
                            animate={isVerifying ? { x: ["-100%", "100%"] } : {}}
                            transition={{ duration: 1, repeat: isVerifying ? Infinity : 0 }}
                            className="absolute inset-0 bg-white/20"
                          />
                          
                          <div className="relative flex items-center justify-center">
                            {isVerifying ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                              />
                            ) : !canResend ? (
                              <Clock className="w-4 h-4 mr-2" />
                            ) : (
                              <Mail className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                            )}
                            
                            {isVerifying 
                              ? "Sending..." 
                              : !canResend 
                                ? `Resend in ${timeLeft}s`
                                : "Send Verification Email"
                            }
                            
                            {canResend && !isVerifying && (
                              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            )}
                          </div>
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => router.visit('/profile')}
                          className="border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex-1 sm:flex-none"
                        >
                          Update Email
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={handleOwnershipVerification}
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 flex-1 sm:flex-none group"
                        >
                          <CreditCard className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                          Verify Organization Ownership
                          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => router.visit('/profile')}
                          className="border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex-1 sm:flex-none"
                        >
                          View Profile
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Close Button */}
                <Button
                  onClick={handleDismiss}
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 sm:relative sm:top-auto sm:right-auto text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full flex-shrink-0 transition-colors group"
                >
                  <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
                  <span className="sr-only">Dismiss</span>
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 sm:mt-6">
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Organization Verification Progress
                  </span>
                  <span className="font-medium">{progress}% Complete</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: "25%" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full relative overflow-hidden"
                  >
                    <motion.div
                      animate={{ 
                        x: ["-100%", "100%"],
                        opacity: [0, 1, 0]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 1,
                        ease: "easeInOut"
                      }}
                      className="absolute inset-0 bg-white/40"
                    />
                  </motion.div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span className={isEmailVerified ? 'text-green-600 font-medium' : ''}>Email Verified</span>
                  <span className={isOwnershipVerified ? 'text-green-600 font-medium' : ''}>Ownership Verified</span>
                  <span className={isOwnershipVerified ? 'text-green-600 font-medium' : ''}>Fully Verified</span>
                </div>
              </div>

              {/* Security Tips */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                  🔒 {!isEmailVerified ? 'Email Verification' : 'Organization Verification'}
                </h4>
                <p className="text-xs text-blue-800 dark:text-blue-400">
                  {!isEmailVerified 
                    ? 'Email verification ensures account security and enables all platform features.'
                    : 'We use Plaid to securely verify your organization ownership. Your bank credentials are never stored.'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
