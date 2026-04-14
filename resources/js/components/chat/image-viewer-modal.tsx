"use client"

import React from "react"
import { Dialog, DialogContent } from "@/components/chat/ui/dialog"
import { X } from "lucide-react"
import { Button } from "@/components/chat/ui/button"
import { cn } from "@/lib/utils"
import { chatGradientTopBar } from "./chat-brand"

interface ImageViewerModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string | null
}

export function ImageViewerModal({ isOpen, onClose, imageUrl }: ImageViewerModalProps) {
  if (!imageUrl) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "max-w-7xl w-full overflow-hidden border-none bg-black/95 p-0",
          "[&>button]:hidden",
        )}
      >
        <div className="relative h-[90vh] w-full">
          <div className={`${chatGradientTopBar} opacity-90`} aria-hidden />
          {/* Close — default Radix close hidden via [&>button]:hidden */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-4 top-5 z-50 h-11 w-11 rounded-full border border-white/10 bg-black/60 text-white shadow-lg ring-2 ring-purple-500/40 backdrop-blur-sm transition-all hover:bg-black/80 hover:ring-purple-400/60"
            aria-label="Close image viewer"
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="flex h-full w-full items-center justify-center px-2 pt-2">
            <img
              src={imageUrl}
              alt="Full size attachment"
              className="max-h-full max-w-full cursor-zoom-in object-contain"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = "/placeholder.svg"
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
