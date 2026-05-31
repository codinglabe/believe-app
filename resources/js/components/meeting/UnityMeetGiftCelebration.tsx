"use client"

import { useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Gift, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { UnityMeetGiftPayload } from "@/hooks/useUnityMeetGiftNotifications"

const AUTO_DISMISS_SEC = 9

type UnityMeetGiftCelebrationProps = {
  gift: UnityMeetGiftPayload | null
  onDismiss: () => void
}

export default function UnityMeetGiftCelebration({ gift, onDismiss }: UnityMeetGiftCelebrationProps) {
  useEffect(() => {
    if (!gift) {
      return
    }

    const timerId = window.setTimeout(onDismiss, AUTO_DISMISS_SEC * 1000)
    return () => window.clearTimeout(timerId)
  }, [gift, onDismiss])

  return (
    <AnimatePresence>
      {gift ? (
        <>
          <motion.div
            key="gift-backdrop"
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onDismiss}
            aria-hidden
          />

          <motion.div
            key="gift-card"
            role="alertdialog"
            aria-labelledby="unity-meet-gift-title"
            aria-describedby="unity-meet-gift-body"
            className="fixed inset-x-0 top-6 z-[201] mx-auto flex w-[min(100%-2rem,420px)] flex-col overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-white via-purple-50/90 to-blue-50/90 shadow-2xl shadow-purple-900/20 dark:from-zinc-950 dark:via-purple-950/40 dark:to-blue-950/30 dark:border-purple-400/25"
            initial={{ opacity: 0, y: -28, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-purple-500/20 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-blue-500/20 blur-2xl" />

            <div className="relative flex items-start gap-3 px-5 pt-5 pb-3">
              <motion.div
                className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-600/30"
                animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.06, 1] }}
                transition={{ duration: 0.9, ease: "easeInOut" }}
              >
                <Gift className="h-7 w-7" aria-hidden />
                <motion.span
                  className="absolute -right-1 -top-1 text-amber-300"
                  animate={{ opacity: [0.4, 1, 0.4], scale: [0.85, 1.15, 0.85] }}
                  transition={{ repeat: Infinity, duration: 1.6 }}
                >
                  <Sparkles className="h-4 w-4" />
                </motion.span>
              </motion.div>

              <div className="min-w-0 flex-1 pt-0.5">
                <p id="unity-meet-gift-title" className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  Gift received
                </p>
                <p className="mt-1 text-lg font-bold leading-tight text-foreground">
                  +{gift.amountLabel} Believe Points
                </p>
                <p id="unity-meet-gift-body" className="mt-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{gift.senderName}</span> sent you a gift
                  {gift.occasion ? (
                    <>
                      {" "}
                      for <span className="text-purple-700 dark:text-purple-300">{gift.occasion}</span>
                    </>
                  ) : null}
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-full"
                onClick={onDismiss}
                aria-label="Dismiss gift notification"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {gift.message ? (
              <motion.blockquote
                className="relative mx-5 mb-4 rounded-xl border border-purple-500/15 bg-white/70 px-4 py-3 text-sm italic text-foreground/90 dark:bg-black/20"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                “{gift.message}”
              </motion.blockquote>
            ) : null}

            <div className="h-1 w-full overflow-hidden bg-purple-100 dark:bg-purple-950/60">
              <motion.div
                key={gift.senderId}
                className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: AUTO_DISMISS_SEC, ease: "linear" }}
              />
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
