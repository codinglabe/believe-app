"use client"

import React from "react"
import { Dialog, DialogContent } from "@/components/chat/ui/dialog"

interface ImageViewerModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string | null
}

export function ImageViewerModal({ isOpen, onClose, imageUrl }: ImageViewerModalProps) {
  if (!imageUrl) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <img src={imageUrl || "/placeholder.svg"} alt="Full size image" className="w-full h-auto object-contain max-h-[80vh]" />
      </DialogContent>
    </Dialog>
  )
}
