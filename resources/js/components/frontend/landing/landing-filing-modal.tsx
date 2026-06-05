"use client"

import { Link, usePage } from "@inertiajs/react"
import { motion } from "framer-motion"
import { ArrowRight, CheckCircle2, FileText, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  LANDING_FILING_STEPS,
  landingFilingIsReturningOrg,
  resolveLandingFilingHref,
} from "./landing-data"
import { LandingGradientText } from "./landing-section"
import { landingTheme } from "./landing-theme"
import { cn } from "@/lib/utils"

type LandingFilingModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LandingFilingModal({ open, onOpenChange }: LandingFilingModalProps) {
  const { auth } = usePage().props as { auth?: { user?: { role?: string; organization?: { id: number } | null } } }
  const filingHref = resolveLandingFilingHref(auth)
  const isReturningOrg = landingFilingIsReturningOrg(auth)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[min(92vh,720px)] max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-lg",
          "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
          landingTheme.modalCloseBtn,
        )}
      >
        <DialogTitle className="sr-only">501c3ers nonprofit filing — Form 1023</DialogTitle>
        <DialogDescription className="sr-only">
          Start or continue your 501(c)(3) tax-exempt filing through Believe In Unity.
        </DialogDescription>

        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className={cn("max-h-[min(92vh,720px)]", landingTheme.modalShell)}
        >
          <div className={landingTheme.modalGradient} aria-hidden />

          <div className={cn("relative flex max-h-[min(92vh,720px)] flex-col", landingTheme.modalBody)}>
            <div className={cn("flex items-center gap-3 px-4 py-3.5 sm:px-5 sm:py-4", landingTheme.modalHeaderBorder)}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-600/30">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 pr-8">
                <p className={cn("flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider", landingTheme.modalEyebrow)}>
                  <Sparkles className="h-3.5 w-3.5" />
                  501c3ers filing
                </p>
                <p className="truncate text-sm font-semibold sm:text-base">
                  <LandingGradientText hero>501(c)(3)</LandingGradientText>
                  <span className={landingTheme.modalTitleSubtext}> tax-exempt assistance</span>
                </p>
              </div>
            </div>

            <div className="overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
              <p className={cn("text-sm leading-relaxed", landingTheme.modalBodyText)}>
                {isReturningOrg
                  ? "Continue your Form 1023 application from your dashboard. We’ll take you to the right step based on your organization’s status."
                  : "New to Believe In Unity? Register your organization first, then complete Form 1023 with guided support from our team."}
              </p>

              <ul className="mt-5 space-y-3">
                {LANDING_FILING_STEPS.map((step, index) => (
                  <li key={step.title}>
                    <motion.div
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08 + index * 0.07, duration: 0.35 }}
                      className={cn("flex gap-3 p-3.5", landingTheme.modalStepCard)}
                    >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className={cn("flex items-center gap-1.5 text-sm font-semibold", landingTheme.modalStepTitle)}>
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
                        {step.title}
                      </p>
                      <p className={cn("mt-1 text-xs leading-relaxed sm:text-sm", landingTheme.modalStepDesc)}>{step.description}</p>
                    </div>
                    </motion.div>
                  </li>
                ))}
              </ul>
            </div>

            <div className={cn("flex flex-col gap-2 px-4 py-4 sm:px-5", landingTheme.modalFooterBorder)}>
              <Link
                href={filingHref}
                onClick={() => onOpenChange(false)}
                className={cn(landingTheme.primaryBtn, "w-full px-6 py-3 text-sm sm:text-base")}
              >
                {isReturningOrg ? "Continue to dashboard" : "Start organization registration"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              {!auth?.user ? (
                <p className={cn("text-center text-xs", landingTheme.modalMutedText)}>
                  Already have an account?{" "}
                  <Link
                    href={route("login")}
                    onClick={() => onOpenChange(false)}
                    className={landingTheme.modalSignInLink}
                  >
                    Sign in
                  </Link>
                </p>
              ) : null}
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
