"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Play, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { LANDING_HERO_VIDEO_YOUTUBE_ID } from "./landing-data"
import { LandingGradientText } from "./landing-section"
import { landingTheme } from "./landing-theme"
import { cn } from "@/lib/utils"

type LandingHeroVideoModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LandingHeroVideoModal({ open, onOpenChange }: LandingHeroVideoModalProps) {
  const [embedActive, setEmbedActive] = useState(false)

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setEmbedActive(true))
      return () => cancelAnimationFrame(id)
    }
    setEmbedActive(false)
  }, [open])

  const embedSrc = `https://www.youtube-nocookie.com/embed/${LANDING_HERO_VIDEO_YOUTUBE_ID}?autoplay=1&rel=0&modestbranding=1`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-3xl lg:max-w-4xl",
          "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
          landingTheme.modalCloseBtn,
        )}
      >
        <DialogTitle className="sr-only">Watch the 2-minute Believe In Unity demo</DialogTitle>
        <DialogDescription className="sr-only">
          Video walkthrough of the Believe In Unity platform on YouTube.
        </DialogDescription>

        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className={landingTheme.modalShell}
        >
          <div className={landingTheme.modalGradient} aria-hidden />

          <div className={landingTheme.modalBody}>
            <div className={cn("flex items-center gap-3 px-4 py-3.5 sm:px-5 sm:py-4", landingTheme.modalHeaderBorder)}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-600/30">
                <Play className="h-4 w-4 fill-white" />
              </span>
              <div className="min-w-0 flex-1 pr-8">
                <p className={cn("flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider", landingTheme.modalEyebrow)}>
                  <Sparkles className="h-3.5 w-3.5" />
                  Quick demo
                </p>
                <p className="truncate text-sm font-semibold sm:text-base">
                  <LandingGradientText hero>Believe In Unity</LandingGradientText>
                  <span className={landingTheme.modalTitleSubtext}> in 2 minutes</span>
                </p>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.12, duration: 0.35 }}
              className="relative aspect-video w-full bg-black"
            >
              {embedActive ? (
                <iframe
                  title="Believe In Unity — 2 minute demo"
                  src={embedSrc}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <div className={landingTheme.modalVideoLoading}>
                  <span className="h-10 w-10 animate-pulse rounded-full bg-gradient-to-r from-purple-600 to-blue-600 opacity-60" />
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
