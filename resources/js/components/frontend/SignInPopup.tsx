"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, LogIn, Sparkles } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { router } from "@inertiajs/react"

interface SignInPopupProps {
  isOpen: boolean
  onClose: () => void
  onSignIn: () => void
}

export default function SignInPopup({ isOpen, onClose, onSignIn }: SignInPopupProps) {
  const handleSignIn = () => {
    onSignIn()
    const currentPath = window.location.pathname + window.location.search
    router.visit(`/login?redirect=${encodeURIComponent(currentPath)}`)
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
              <div className="relative p-8">
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
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full blur-xl opacity-50 animate-pulse" />
                    <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-full">
                      <Sparkles className="h-8 w-8 text-white" />
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
                  Please Sign In
                </motion.h3>

                {/* Message */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center text-gray-600 dark:text-gray-300 mb-8 leading-relaxed"
                >
                  To search and discover organizations, please sign in to your account. It only takes a moment!
                </motion.p>

                {/* Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-col gap-3"
                >
                  <Button
                    onClick={handleSignIn}
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    <LogIn className="h-5 w-5 mr-2" />
                    Sign In Now
                  </Button>
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="w-full h-11 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl"
                  >
                    Maybe Later
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
