"use client"

import React from "react"
import { Dialog, DialogContent } from "@/components/chat/ui/dialog"
import { X } from "lucide-react"
import { Button } from "@/components/chat/ui/button"

interface ImageViewerModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string | null
}

export function ImageViewerModal({ isOpen, onClose, imageUrl }: ImageViewerModalProps) {
  if (!imageUrl) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-7xl w-full p-0 overflow-hidden bg-black/95 border-none">
        <div className="relative w-full h-[90vh] flex items-center justify-center">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 h-10 w-10"
          >
            <X className="w-5 h-5" />
          </Button>

          {/* Image */}
          <img
            src={imageUrl}
            alt="Full size image"
            className="max-w-full max-h-full object-contain cursor-zoom-in"
            onClick={(e) => {
              // Prevent closing when clicking on image
              e.stopPropagation()
            }}
            onError={(e) => {
              // Fallback if image fails to load
              const target = e.target as HTMLImageElement
              target.src = "/placeholder.svg"
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
