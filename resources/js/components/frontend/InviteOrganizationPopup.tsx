"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Mail, Send } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { useState } from "react"
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
          Accept: "application/json",
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

      showSuccessToast("Invitation sent.")
      setEmail("")
      onClose()
    } catch (error: unknown) {
      console.error("Error sending invite:", error)
      showErrorToast(error instanceof Error ? error.message : "Failed to send invite. Please try again later.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/12 via-purple-500/10 to-indigo-500/12 dark:from-blue-500/15 dark:via-purple-600/10 dark:to-indigo-600/15" />

              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 z-10 rounded-full p-2 text-gray-500 transition-colors hover:bg-blue-50 hover:text-gray-700 dark:hover:bg-purple-950/40 dark:hover:text-gray-200"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <form onSubmit={handleSubmit} className="relative p-5 pt-11">
                <div className="mb-5 flex items-start gap-3 pr-8">
                  <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 320, damping: 22 }}
                    className="relative shrink-0"
                  >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 opacity-40 blur-lg dark:opacity-50" />
                    <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-600/25 dark:shadow-purple-600/20">
                      <Mail className="h-5 w-5 text-white" aria-hidden />
                    </div>
                  </motion.div>
                  <div className="min-w-0 pt-0.5">
                    <h3 className="bg-gradient-to-r from-blue-700 to-purple-600 bg-clip-text text-lg font-bold text-transparent dark:from-blue-400 dark:to-purple-400">
                      Invite organization
                    </h3>
                    <p className="mt-1 truncate text-sm text-gray-600 dark:text-gray-300" title={organization.name}>
                      {organization.name}
                    </p>
                  </div>
                </div>

                <div className="mb-5">
                  <label htmlFor="invite-org-email" className="sr-only">
                    Organization email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-500/70 dark:text-purple-400/80" />
                    <Input
                      id="invite-org-email"
                      type="email"
                      placeholder="Organization email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setEmailError("")
                      }}
                      className={`h-10 rounded-xl border-gray-200 bg-white pl-9 text-sm transition-shadow focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-500/25 dark:border-gray-600 dark:bg-gray-700/80 dark:focus-visible:border-purple-400 dark:focus-visible:ring-purple-500/25 ${emailError ? "border-red-500" : ""}`}
                      disabled={isSubmitting}
                      autoComplete="email"
                    />
                  </div>
                  {emailError ? <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{emailError}</p> : null}
                </div>

                <div className="flex w-full gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={onClose}
                    className="h-10 min-w-0 flex-1 basis-0 rounded-xl border-blue-200 bg-white/80 text-gray-700 hover:bg-blue-50/80 dark:border-purple-500/35 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:bg-purple-950/35"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting || !email.trim()}
                    className="h-10 min-w-0 flex-1 basis-0 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-700 hover:to-purple-700 dark:shadow-purple-900/40"
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Sending
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center gap-1.5">
                        <Send className="h-3.5 w-3.5 shrink-0" />
                        Send
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
