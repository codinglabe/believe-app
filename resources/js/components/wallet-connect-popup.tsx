"use client"

import { useEffect, useState } from "react"
import { X, Wallet, Sparkles, CheckCircle2, Mail, Lock, Eye, EyeOff, DollarSign, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Input as FrontendInput } from "@/components/frontend/ui/input"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"

interface WalletConnectPopupProps {
  isOpen: boolean
  onClose: () => void
  onConnect: () => void
  isConnected?: boolean
  walletAppName?: string
  walletAppLogo?: string
  variant?: 'default' | 'frontend'
}

export function WalletConnectPopup({ 
  isOpen, 
  onClose, 
  onConnect, 
  isConnected = false,
  walletAppName = "Believe Wallet",
  walletAppLogo,
  variant = 'default'
}: WalletConnectPopupProps) {
  // Style classes based on variant
  const isFrontend = variant === 'frontend'
  const cardBg = isFrontend ? 'bg-white dark:bg-gray-800' : 'bg-card'
  const cardBorder = isFrontend ? 'border-gray-200 dark:border-gray-700' : 'border-border'
  const textPrimary = isFrontend ? 'text-gray-900 dark:text-white' : 'text-foreground'
  const textMuted = isFrontend ? 'text-gray-600 dark:text-gray-400' : 'text-muted-foreground'
  const borderColor = isFrontend ? 'border-gray-200 dark:border-gray-700' : 'border-border'
  const bgMuted = isFrontend ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-muted/50'
  const bgPrimary = isFrontend ? 'bg-blue-500' : 'bg-primary'
  const hoverPrimary = isFrontend ? 'hover:bg-blue-600' : 'hover:bg-primary/90'
  const [isAnimating, setIsAnimating] = useState(false)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [walletData, setWalletData] = useState<{
    username?: string
    balance?: number
    email?: string
  } | null>(null)

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
    }
  }, [isOpen])

  const handleConnect = () => {
    // Show login form instead of connecting immediately
    setShowLoginForm(true)
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    
    try {
      // Call backend API to connect wallet
      const response = await fetch('/chat/wallet/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text.substring(0, 200))
        throw new Error('Server returned an invalid response. Please try again.')
      }

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to connect wallet')
      }

      // Fetch wallet balance and user info after successful connection
      try {
        const balanceResponse = await fetch('/chat/wallet/balance', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            'X-Requested-With': 'XMLHttpRequest',
          },
        })

        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json()
          if (balanceData.success) {
            // Extract username from email (part before @)
            const username = email.includes('@') ? email.split('@')[0] : email
            setWalletData({
              username: username,
              email: email,
              balance: balanceData.balance || balanceData.local_balance || 0,
            })
          } else {
            // If balance fetch fails but connection succeeded
            const username = email.includes('@') ? email.split('@')[0] : email
            setWalletData({
              username: username,
              email: email,
              balance: 0,
            })
          }
        } else {
          // If balance fetch fails, still show success with email
          const username = email.includes('@') ? email.split('@')[0] : email
          setWalletData({
            username: username,
            email: email,
            balance: 0,
          })
        }
      } catch {
        // If balance fetch fails, still show success with email
        const username = email.includes('@') ? email.split('@')[0] : email
        setWalletData({
          username: username,
          email: email,
          balance: 0,
        })
      }

      // Show success popup
      setIsSubmitting(false)
      setShowLoginForm(false)
      setShowSuccess(true)
      
      // Don't call onConnect here - let user see success first
      // onConnect will be called when user clicks "Got it!" button
      
      // Don't auto-close - let user close manually
    } catch (err) {
      setIsSubmitting(false)
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while connecting your wallet'
      setError(errorMessage)
    }
  }

  const handleBackToInitial = () => {
    setShowLoginForm(false)
    setEmail("")
    setPassword("")
  }

  // Always render if isOpen is true
  if (!isOpen) return null

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            key={showSuccess ? "success" : showLoginForm ? "login" : "initial"}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className={`relative ${cardBg} ${cardBorder} rounded-2xl shadow-2xl max-w-md w-full p-6 border`}
          >
          {/* Close Button */}
          {!showSuccess && (
            <button
              onClick={showLoginForm ? handleBackToInitial : onClose}
              className={`absolute top-4 right-4 ${textMuted} ${isFrontend ? 'hover:text-gray-900 dark:hover:text-white' : 'hover:text-foreground'} transition-colors`}
              aria-label={showLoginForm ? "Back" : "Close"}
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {showSuccess ? (
            /* Success Popup */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center space-y-6"
            >
              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.6, delay: 0.2 }}
                className="relative"
              >
                <div className="w-24 h-24 bg-green-500/15 rounded-full flex items-center justify-center border-4 border-green-500/30">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                </div>
                {/* Pulse Animation */}
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 rounded-full bg-green-500/20"
                />
              </motion.div>

              {/* Success Message */}
              <div className="space-y-2">
                <h2 className={`text-2xl font-bold ${textPrimary}`}>
                  Wallet Connected!
                </h2>
                <p className={`${textMuted} text-sm`}>
                  Your wallet has been successfully connected
                </p>
              </div>

              {/* User Info Card */}
              {walletData && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className={`w-full ${bgMuted} rounded-xl p-4 space-y-4 border ${borderColor}`}
                >
                  {/* Username/Email */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/15 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`text-xs ${textMuted}`}>Connected as</p>
                      <p className={`text-sm font-semibold ${textPrimary}`}>
                        {walletData.username || walletData.email || 'User'}
                      </p>
                    </div>
                  </div>

                  {/* Balance */}
                  <div className={`flex items-center gap-3 pt-3 border-t ${borderColor}`}>
                    <div className="w-10 h-10 bg-green-500/15 rounded-full flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`text-xs ${textMuted}`}>Wallet Balance</p>
                      <p className="text-lg font-bold text-green-500">
                        ${walletData.balance?.toLocaleString('en-US', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        }) || '0.00'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Close Button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="w-full pt-4"
              >
                <Button
                  onClick={() => {
                    setShowSuccess(false)
                    setShowLoginForm(false)
                    setEmail("")
                    setPassword("")
                    setError(null)
                    setWalletData(null)
                    // Call onConnect callback when user closes success popup
                    onConnect()
                    onClose()
                  }}
                  className={`w-full ${bgPrimary} ${hoverPrimary} text-white shadow-lg`}
                >
                  Got it!
                </Button>
              </motion.div>
            </motion.div>
          ) : !showLoginForm ? (
            /* Initial Popup - Connect Wallet */
            <div className="flex flex-col items-center text-center space-y-6">
            <motion.div
              animate={{
                scale: isAnimating ? [1, 1.1, 1] : 1,
                rotate: isAnimating ? [0, 5, -5, 0] : 0,
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative"
            >
              <div className="relative w-24 h-24 bg-primary/15 rounded-2xl flex items-center justify-center shadow-lg border border-primary/20">
                <Wallet className="w-12 h-12 text-primary" />
                
                {/* Sparkle Animation */}
                <motion.div
                  animate={{
                    opacity: [0.5, 1, 0.5],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute -top-2 -right-2"
                >
                  <Sparkles className="w-6 h-6 text-primary" />
                </motion.div>
              </div>
            </motion.div>

            {/* Content */}
            <div className="space-y-3">
              <h2 className={`text-2xl font-bold ${textPrimary}`}>
                Connect Your Wallet
              </h2>
              <p className={`${textMuted} text-sm`}>
                {isConnected
                  ? "Your wallet is connected and ready to use!"
                  : "Connect your digital wallet to start managing your funds, making transactions, and accessing premium features."}
              </p>
            </div>

            {/* Features List */}
            {!isConnected && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="w-full space-y-2 text-left"
              >
                <div className={`flex items-center gap-3 text-sm ${textPrimary}`}>
                  <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                  </div>
                  <span>Secure and encrypted transactions</span>
                </div>
                <div className={`flex items-center gap-3 text-sm ${textPrimary}`}>
                  <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                  </div>
                  <span>Manage your balance and funds</span>
                </div>
                <div className={`flex items-center gap-3 text-sm ${textPrimary}`}>
                  <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                  </div>
                  <span>Access premium features</span>
                </div>
              </motion.div>
            )}

            {/* Success State */}
            {isConnected && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 text-primary font-medium"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Wallet Connected Successfully!</span>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 w-full pt-4">
              {!isConnected ? (
                <>
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="flex-1"
                  >
                    Maybe Later
                  </Button>
                  <Button
                    onClick={handleConnect}
                    className={`flex-1 ${bgPrimary} ${hoverPrimary} text-white shadow-lg`}
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect Wallet
                  </Button>
                </>
              ) : (
                <Button
                  onClick={onClose}
                  className={`w-full ${bgPrimary} ${hoverPrimary} text-white`}
                >
                  Got it!
                </Button>
              )}
            </div>
          </div>
          ) : (
            /* Login Form Popup */
            <div className="flex flex-col space-y-6">
              {/* Wallet App Branding */}
              <div className={`flex flex-col items-center space-y-4 pb-4 border-b ${borderColor}`}>
                {walletAppLogo ? (
                  <div className={`w-16 h-16 rounded-xl overflow-hidden border ${borderColor}`}>
                    <img 
                      src={walletAppLogo} 
                      alt={walletAppName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-primary/15 rounded-xl flex items-center justify-center border border-primary/20">
                    <Wallet className="w-8 h-8 text-primary" />
                  </div>
                )}
                <div className="text-center">
                  <h2 className={`text-xl font-bold ${textPrimary}`}>{walletAppName}</h2>
                  <p className={`text-sm ${textMuted} mt-1`}>Connect to your wallet account</p>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-destructive/10 border border-destructive/20 rounded-md"
                  >
                    <p className="text-sm text-destructive">{error}</p>
                  </motion.div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className={textPrimary}>
                    Email or Username
                  </Label>
                  <div className="relative">
                    <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${textMuted}`} />
                    {isFrontend ? (
                      <FrontendInput
                        id="email"
                        type="email"
                        placeholder="Enter your email or username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/20"
                      />
                    ) : (
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email or username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className={textPrimary}>
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${textMuted}`} />
                    {isFrontend ? (
                      <FrontendInput
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-10 pr-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/20"
                      />
                    ) : (
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-10 pr-10"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${textMuted} ${isFrontend ? 'hover:text-gray-900 dark:hover:text-white' : 'hover:text-foreground'} transition-colors`}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={handleBackToInitial}
                    variant="outline"
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !email || !password}
                    className={`flex-1 ${bgPrimary} ${hoverPrimary} text-white shadow-lg disabled:opacity-50`}
                  >
                    {isSubmitting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 mr-2 border-2 border-primary-foreground border-t-transparent rounded-full"
                        />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Wallet className="w-4 h-4 mr-2" />
                        Connect
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

