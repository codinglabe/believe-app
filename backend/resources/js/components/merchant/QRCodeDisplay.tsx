import React, { useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QrCode, Download, Share2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface QRCodeDisplayProps {
  qrCodeData: string
  onDownload?: () => void
  onShare?: () => void
  title?: string
  instruction?: string
}

export function QRCodeDisplay({
  qrCodeData,
  onDownload,
  onShare,
  title = "QR Code",
  instruction = "Scan to Redeem"
}: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // Generate QR code on canvas
    // For demo purposes, we'll create a simple pattern
    // In production, use a QR code library like qrcode.react
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        // Simple QR-like pattern for demo
        const size = 200
        const blockSize = 10
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, size, size)
        ctx.fillStyle = '#fff'
        
        // Create a simple pattern
        for (let i = 0; i < size; i += blockSize) {
          for (let j = 0; j < size; j += blockSize) {
            if ((i + j) % (blockSize * 2) === 0 || (i - j) % (blockSize * 3) === 0) {
              ctx.fillRect(i, j, blockSize, blockSize)
            }
          }
        }
      }
    }
  }, [qrCodeData])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center min-h-[400px]"
    >
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800 dark:text-gray-100">
            {title}
          </h2>
          
          <div className="flex justify-center mb-6">
            <div className="bg-white p-4 rounded-lg shadow-lg">
              <canvas
                ref={canvasRef}
                width={200}
                height={200}
                className="border-2 border-gray-200"
              />
            </div>
          </div>

          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            {instruction}
          </p>

          <div className="flex gap-3">
            {onDownload && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={onDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
            {onShare && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={onShare}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

