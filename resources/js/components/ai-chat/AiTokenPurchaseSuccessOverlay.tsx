"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

type AiTokenPurchaseSuccessOverlayProps = {
  /** When true, plays enter animation (parent should clear after a timeout for exit animation). */
  active: boolean
  /** Optional line under the headline (e.g. flash success text) */
  message?: string | null
}

export function AiTokenPurchaseSuccessOverlay({ active, message }: AiTokenPurchaseSuccessOverlayProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(typeof document !== "undefined")
  }, [])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {active ? (
        <motion.div
          key="ai-token-purchase-success"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="absolute inset-0 bg-background/55 backdrop-blur-[2px] dark:bg-zinc-950/65" />

          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", damping: 22, stiffness: 320, delay: 0.05 }}
            className={cn(
              "relative mx-4 max-w-sm rounded-2xl border border-emerald-500/25 bg-card px-8 py-10 text-center shadow-2xl",
              "dark:border-emerald-500/35 dark:bg-zinc-900/95"
            )}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 14, stiffness: 260, delay: 0.12 }}
              className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center"
            >
              <span className="absolute inset-0 rounded-full bg-emerald-500/25 blur-xl dark:bg-emerald-400/20" />
              <span className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg ring-4 ring-emerald-500/20">
                <CheckCircle2 className="h-10 w-10 text-white" strokeWidth={2.2} aria-hidden />
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.35 }}
              className="text-xl font-bold tracking-tight text-foreground dark:text-white"
            >
              Tokens added
            </motion.h2>

            {message ? (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, duration: 0.35 }}
                className="mt-2 text-sm leading-relaxed text-muted-foreground dark:text-zinc-400"
              >
                {message}
              </motion.p>
            ) : (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, duration: 0.35 }}
                className="mt-2 text-sm text-muted-foreground dark:text-zinc-400"
              >
                Your balance has been updated. Keep chatting!
              </motion.p>
            )}

            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
              className="mt-6 flex justify-center text-emerald-600/90 dark:text-emerald-400/90"
            >
              <Sparkles className="h-8 w-8" aria-hidden />
            </motion.div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}

/** Matches CreditPurchaseController success / payWithBelievePoints flash copy */
export function isAiCreditPurchaseFlashSuccess(msg: unknown): msg is string {
  return (
    typeof msg === "string" &&
    msg.includes("Successfully purchased") &&
    (msg.includes("wallet credits") || msg.includes("Believe Points"))
  )
}
