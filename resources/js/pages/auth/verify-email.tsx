"use client"
import { Button } from "@/components/ui/button"
import type React from "react"
import { motion } from "framer-motion"
import { Send, CheckCircle, Mail } from "lucide-react"
import { Link, useForm, usePage } from "@inertiajs/react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"

interface PageProps {
  status?: string
  auth?: {
    user?: {
      id: number
      name?: string
      email?: string
    } | null
  }
  [key: string]: unknown
}

export default function VerifyEmail({ status }: { status?: string }) {
  const { post, processing } = useForm({})
  const pageProps = usePage<PageProps>().props
  const auth = pageProps.auth || (pageProps as PageProps).auth
  const userEmail = auth?.user?.email || "your email address"

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    // Use relative URL to ensure we stay on the current domain (main app, not livestock)
    // This prevents CORS issues when route() resolves to wrong domain
    post('/email/verification-notification')
  }

  return (
    <FrontendLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-lg"
      >
        <div className="bg-gray-800 dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 dark:border-gray-700 p-8 md:p-10">
          {/* Success Indicator */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex justify-center mb-6"
          >
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
          </motion.div>

          {/* Main Heading */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-2"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Verify Your Email
            </h1>
            <p className="text-lg text-gray-300">
              Please check your email to complete verification
            </p>
          </motion.div>

          {/* Email Confirmation Box */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 mb-6"
          >
            <div className="bg-gray-700 dark:bg-gray-700/50 rounded-xl p-5 border border-gray-600 dark:border-gray-600">
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-1">
                  <Send className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm leading-relaxed">
                    We've sent a verification link to{" "}
                    <span className="font-semibold text-green-500">{userEmail}</span>.
                    Please check your inbox and click the link to verify your account.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Success Message */}
          {status === "verification-link-sent" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ delay: 0.5 }}
              className="mb-6"
            >
              <div className="bg-green-600/20 border border-green-600/50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                  <p className="text-green-400 text-sm">
                    A new verification link has been sent to your email address.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Resend Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-6"
          >
            <form onSubmit={submit}>
              <Button
                type="submit"
                disabled={processing}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <Mail className="h-5 w-5 mr-2 animate-pulse" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Resend Verification Email
                  </>
                )}
              </Button>
            </form>
          </motion.div>

          {/* Support Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center pt-4 border-t border-gray-700 dark:border-gray-700"
          >
            <p className="text-sm text-gray-400">
              Questions about email verification?{" "}
              <Link
                href="/help"
                className="text-blue-400 hover:text-blue-300 underline transition-colors"
              >
                Contact our support team
              </Link>
            </p>
          </motion.div>

          {/* Log Out Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center mt-4"
          >
            <Link
              href={route("logout.main")}
              method="post"
              as="button"
              className="text-sm text-gray-400 hover:text-gray-300 underline transition-colors"
            >
              Log Out
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
    </FrontendLayout>
  )
}