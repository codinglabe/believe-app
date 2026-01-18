"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Mail, Gift, Sparkles, Send } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { useState } from "react"
import { router } from "@inertiajs/react"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

interface InviteOrganizationPopupProps {
  isOpen: boolean
  onClose: () => void
  organization: {
    id: number
    name: string
    ein?: string
  }
}

export default function InviteOrganizationPopup({ isOpen, onClose, organization }: InviteOrganizationPopupProps) {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailError, setEmailError] = useState("")

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError("")

    if (!email.trim()) {
      setEmailError("Please enter an email address")
      return
    }

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/organizations/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "include",
        body: JSON.stringify({
          organization_id: organization.id,
          organization_name: organization.name,
          email: email.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to send invite")
      }

      showSuccessToast("Invite Sent! 🎉 Your invitation has been sent successfully. You'll receive 100 points when they sign up!")
      setEmail("")
      onClose()
    } catch (error: any) {
      console.error("Error sending invite:", error)
      showErrorToast(error.message || "Failed to send invite. Please try again later.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
              {/* Decorative gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-indigo-500/10 pointer-events-none" />

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors z-10"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>

              {/* Content */}
              <form onSubmit={handleSubmit} className="relative p-8">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                    delay: 0.1,
                  }}
                  className="flex justify-center mb-6"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-xl opacity-50 animate-pulse" />
                    <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-full">
                      <Mail className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </motion.div>

                {/* Title */}
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-3"
                >
                  Invite This Organization
                </motion.h3>

                {/* Message */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center mb-6 space-y-3"
                >
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    The organization <span className="font-semibold text-gray-900 dark:text-white">"{organization.name}"</span> isn't part of our community yet.
                  </p>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    If you know this organization, you can invite them to join and help them connect with supporters like you.
                  </p>
                  
                  {/* Bonus message */}
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex-shrink-0">
                        <Gift className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                          You'll Earn Rewards! 🎉
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          Once they sign up, you'll receive <span className="font-bold text-blue-600 dark:text-blue-400">100 points</span> to spend in the Merchant Hub!
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Email Input */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mb-6"
                >
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Organization Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="Enter their email address"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setEmailError("")
                      }}
                      className={`pl-10 h-12 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl ${
                        emailError ? "border-red-500 focus:border-red-500" : ""
                      }`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {emailError && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{emailError}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    We'll send them an invitation to join our platform
                  </p>
                </motion.div>

                {/* Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-col gap-3"
                >
                  <Button
                    type="submit"
                    disabled={isSubmitting || !email.trim()}
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={onClose}
                    variant="outline"
                    disabled={isSubmitting}
                    className="w-full h-11 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl"
                  >
                    Cancel
                  </Button>
                </motion.div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
