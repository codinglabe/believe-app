"use client"

import { Head, Link, usePage } from "@inertiajs/react"
import { motion, type Variants } from "framer-motion"
import { ArrowRight, Check, Mail, Sparkles, Wallet, Zap } from "lucide-react"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PlansSuccessProps {
  successMessage?: string
  planName?: string
  trialDays?: number
  isWalletSubscription?: boolean
  isSupporterSubscription?: boolean
  supporterTier?: string | null
  welcomeBonus?: {
    aiTokens: number
    emails: number
  } | null
}

const logoGradientFrame = "bg-gradient-to-r from-purple-600 to-blue-600"
const logoGradientCTA = "bg-gradient-to-r from-purple-600 to-blue-600"
const logoGradientDiagonal = "bg-gradient-to-br from-purple-600 via-purple-700 to-blue-600"

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 320, damping: 26 },
  },
}

function SuccessIcon({ isWallet }: { isWallet: boolean }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
      className="relative mx-auto mb-2 flex h-20 w-20 items-center justify-center"
    >
      <motion.span
        className={cn(
          "pointer-events-none absolute inset-0 rounded-full blur-2xl",
          isWallet ? "bg-emerald-500/30" : "bg-purple-500/35 dark:bg-purple-600/30",
        )}
        animate={{ scale: [1, 1.15, 1], opacity: [0.55, 0.85, 0.55] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <motion.span
        className={cn(
          "pointer-events-none absolute -inset-3 rounded-full border-2",
          isWallet ? "border-emerald-400/40" : "border-purple-400/35 dark:border-blue-400/30",
        )}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1.35, opacity: 0 }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
        aria-hidden
      />
      <motion.div
        className={cn(
          "absolute inset-0 flex items-center justify-center rounded-full shadow-lg ring-4 ring-white/80 dark:ring-white/10",
          isWallet
            ? "bg-gradient-to-br from-emerald-500 to-teal-600"
            : logoGradientDiagonal,
        )}
      >
        {isWallet ? (
          <Wallet className="h-9 w-9 text-white drop-shadow-sm" strokeWidth={2.2} />
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35, duration: 0.45 }}
            className="flex items-center justify-center"
          >
            <Check className="h-10 w-10 text-white drop-shadow-sm" strokeWidth={3} />
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}

function FloatingOrb({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.span
      className={cn("pointer-events-none absolute rounded-full blur-3xl", className)}
      animate={{ y: [0, -12, 0], opacity: [0.35, 0.6, 0.35] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay }}
      aria-hidden
    />
  )
}

export default function PlansSuccess({
  successMessage,
  planName,
  trialDays = 0,
  isWalletSubscription: isWalletSubscriptionProp = false,
  isSupporterSubscription: isSupporterSubscriptionProp = false,
  welcomeBonus = null,
}: PlansSuccessProps) {
  const { url, auth } = usePage().props as { url?: string; auth?: { user?: { role?: string } } }
  const isSupporterSubscription =
    isSupporterSubscriptionProp ||
    Boolean(
      successMessage &&
        !successMessage.toLowerCase().includes("wallet") &&
        (successMessage.toLowerCase().includes("supporter") ||
          successMessage.toLowerCase().includes("believe in unity")),
    )
  const isWalletSubscription =
    isWalletSubscriptionProp ||
    (!isSupporterSubscription &&
      (url?.includes("/wallet/subscription/success") ||
        successMessage?.toLowerCase().includes("wallet") === true))

  const Layout = isSupporterSubscription || isWalletSubscription ? FrontendLayout : AppSidebarLayout
  const profileHref = route("user.profile.index")
  const hasTrial = !isWalletSubscription && trialDays > 0
  const displayPlan = planName ?? "Unity Membership"

  return (
    <Layout>
      <Head
        title={
          isSupporterSubscription
            ? "Supporter Plan Active - BelieveInUnity.org"
            : isWalletSubscription
              ? "Wallet Subscription Successful - BelieveInUnity.org"
              : "Subscription Successful - BelieveInUnity.org"
        }
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          "relative flex min-h-[calc(100vh-4rem)] w-full items-center justify-center overflow-hidden p-4 sm:p-6",
          isWalletSubscription
            ? "min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 dark:from-[#0A0A1A] dark:via-[#0b0b18] dark:to-emerald-950/20"
            : "bg-gradient-to-b from-violet-50/80 via-white to-sky-50/50 dark:from-[#0A0A1A] dark:via-[#0b0b18] dark:to-blue-950/20",
        )}
      >
        <FloatingOrb className="left-[8%] top-[18%] h-32 w-32 bg-purple-500/25 dark:bg-purple-600/20" />
        <FloatingOrb
          className="right-[10%] bottom-[20%] h-40 w-40 bg-blue-500/20 dark:bg-blue-600/15"
          delay={1.2}
        />

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className={cn("relative w-full max-w-lg rounded-2xl p-[2px] shadow-xl", logoGradientFrame)}
        >
          <motion.div
            className="overflow-hidden rounded-[14px] border border-white/20 bg-white dark:border-white/[0.06] dark:bg-[#0b0b18]"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <div className={cn("relative px-5 py-4 text-center text-white sm:px-6", logoGradientDiagonal)}>
              <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-blue-400/30 blur-2xl" />
              <div className="pointer-events-none absolute -left-4 bottom-0 h-20 w-20 rounded-full bg-purple-400/25 blur-2xl" />
              <motion.div variants={itemVariants} className="relative flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-200/95" />
                <span className="text-xs font-bold uppercase tracking-[0.22em]">Believe In Unity</span>
              </motion.div>
            </div>

            <motion.div variants={itemVariants} className="flex justify-center px-6 pt-8 sm:px-8">
              <SuccessIcon isWallet={isWalletSubscription} />
            </motion.div>

            <motion.div variants={itemVariants} className="px-6 pb-6 pt-2 text-center sm:px-8">
              <motion.h1
                variants={itemVariants}
                className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white"
              >
                {isSupporterSubscription
                  ? "Supporter plan active!"
                  : isWalletSubscription
                    ? "Wallet Activated!"
                    : "You're all set!"}
              </motion.h1>

              {successMessage && (
                <motion.p
                  variants={itemVariants}
                  className="mt-3 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-base font-semibold text-transparent dark:from-purple-400 dark:to-blue-400"
                >
                  {successMessage}
                </motion.p>
              )}

              {!isWalletSubscription && (
                <motion.div variants={itemVariants} className="mt-5 space-y-3">
                  <p className="text-sm leading-relaxed text-slate-600 sm:text-base dark:text-white/75">
                    {hasTrial ? (
                      <>
                        Your <span className="font-semibold text-slate-900 dark:text-white">{trialDays}-day</span>{" "}
                        free trial has started. Enjoy full access to{" "}
                        <span className="font-semibold text-slate-900 dark:text-white">{displayPlan}</span>.
                      </>
                    ) : (
                      <>
                        You now have full access to{" "}
                        <span className="font-semibold text-slate-900 dark:text-white">{displayPlan}</span>.
                      </>
                    )}
                  </p>

                  {hasTrial && (
                    <motion.div
                      variants={itemVariants}
                      className="rounded-xl border border-violet-200/80 bg-violet-50/60 px-4 py-3 text-left dark:border-purple-500/25 dark:bg-purple-950/20"
                    >
                      <p className="text-xs leading-relaxed text-slate-600 dark:text-white/70">
                        After your trial, your membership continues automatically unless you cancel from your plan
                        settings.
                      </p>
                    </motion.div>
                  )}

                  {welcomeBonus && (welcomeBonus.aiTokens > 0 || welcomeBonus.emails > 0) && (
                    <motion.div
                      variants={itemVariants}
                      className="rounded-xl border border-purple-200/80 bg-gradient-to-br from-purple-50/80 to-blue-50/60 px-4 py-4 text-left dark:border-purple-500/25 dark:from-purple-950/30 dark:to-blue-950/20"
                    >
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        Your first-month starter credits
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-white/70">
                        Use these to try AI and email. After that, add more anytime with pay-as-you-go packs.
                      </p>
                      <ul className="mt-3 space-y-2">
                        {welcomeBonus.aiTokens > 0 && (
                          <li className="flex items-center gap-2 text-sm text-slate-700 dark:text-white/85">
                            <Zap className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
                            <span>
                              <span className="font-semibold">{welcomeBonus.aiTokens.toLocaleString()}</span> AI tokens
                              <span className="text-slate-500 dark:text-white/55"> ($5 pack)</span>
                            </span>
                          </li>
                        )}
                        {welcomeBonus.emails > 0 && (
                          <li className="flex items-center gap-2 text-sm text-slate-700 dark:text-white/85">
                            <Mail className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                            <span>
                              <span className="font-semibold">{welcomeBonus.emails.toLocaleString()}</span> emails
                              <span className="text-slate-500 dark:text-white/55"> ($1 credit)</span>
                            </span>
                          </li>
                        )}
                      </ul>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {isSupporterSubscription && (
                <motion.p
                  variants={itemVariants}
                  className="mt-5 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-white/75"
                >
                  Your supporter account is ready. Manage donations, follows, rewards, and more from your profile.
                </motion.p>
              )}

              {isWalletSubscription && !isSupporterSubscription && (
                <motion.p
                  variants={itemVariants}
                  className="mt-5 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-white/75"
                >
                  Your digital wallet is ready. Start sending, receiving, and managing funds in one place.
                </motion.p>
              )}

              <motion.div variants={itemVariants} className="mt-8 flex flex-col gap-3 sm:flex-row">
                {isSupporterSubscription ? (
                  <>
                    <Link href={profileHref} className="flex-1">
                      <Button className="group relative h-11 w-full overflow-hidden border-0 font-semibold text-white shadow-md">
                        <span className={cn("absolute inset-0", logoGradientCTA)} aria-hidden />
                        <span className="relative flex items-center justify-center gap-2">
                          Go to Profile
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </Button>
                    </Link>
                    <Link href="/pricing?tab=supporters" className="flex-1">
                      <Button variant="outline" className="h-11 w-full border-violet-200 dark:border-purple-500/30">
                        View Supporter Plans
                      </Button>
                    </Link>
                  </>
                ) : isWalletSubscription ? (
                  <>
                    <Link href="/" className="flex-1">
                      <Button variant="outline" className="h-11 w-full">
                        Back to Home
                      </Button>
                    </Link>
                    <Button
                      className="group relative h-11 flex-1 overflow-hidden border-0 font-semibold text-white shadow-md"
                      onClick={() => {
                        window.location.href = "/"
                      }}
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600" aria-hidden />
                      <span className="relative flex items-center justify-center gap-2">
                        Open Wallet
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Button>
                  </>
                ) : (
                  <>
                    <Link
                      href={
                        auth?.user?.role === "organization" || auth?.user?.role === "organization_pending"
                          ? "/dashboard?verify_bridge=1"
                          : "/dashboard"
                      }
                      className="flex-1"
                    >
                      <Button className="group relative h-11 w-full overflow-hidden border-0 font-semibold text-white shadow-md">
                        <span className={cn("absolute inset-0", logoGradientCTA)} aria-hidden />
                        <span className="relative flex items-center justify-center gap-2">
                          Go to Dashboard
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </Button>
                    </Link>
                    <Link href="/plans" className="flex-1">
                      <Button variant="outline" className="h-11 w-full border-violet-200 dark:border-purple-500/30">
                        View Plans
                      </Button>
                    </Link>
                  </>
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </Layout>
  )
}
