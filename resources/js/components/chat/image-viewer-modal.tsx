"use client"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/chat/ui/dialog"
import { Button } from "@/components/chat/ui/button"
import { AnimatePresence, motion } from "framer-motion"
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react"

interface ImageViewerModalProps {
  isOpen: boolean
  onClose: () => void
  images: { url: string; name: string }[]
  initialIndex: number
}

const ImageViewerModal = ({ images, initialIndex, isOpen, onClose }: ImageViewerModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [scale, setScale] = useState(1)

  const currentImage = images[currentIndex]

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)
    setScale(1) // Reset zoom on image change
  }

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length)
    setScale(1) // Reset zoom on image change
  }

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3))
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full h-full p-0 flex flex-col bg-black/90 border-none">
        <div className="absolute top-4 right-4 z-10">
          <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-white/20" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          <AnimatePresence initial={false} mode="wait">
            {currentImage && (
              <motion.img
                key={currentIndex} // Key for animating image changes
                src={currentImage.url}
                alt={currentImage.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                style={{ transform: `scale(${scale})` }}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </AnimatePresence>

          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full text-white hover:bg-white/20"
                onClick={handlePrev}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full text-white hover:bg-white/20"
                onClick={handleNext}
                aria-label="Next image"
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 rounded-full p-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-white hover:bg-white/20"
              onClick={handleZoomIn}
              aria-label="Zoom in"
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-white hover:bg-white/20"
              onClick={handleZoomOut}
              aria-label="Zoom out"
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ImageViewerModal
