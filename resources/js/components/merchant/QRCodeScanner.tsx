"use client"

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, QrCode, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { MerchantButton } from '@/components/merchant-ui'
import { router } from '@inertiajs/react'
import { showErrorToast, showSuccessToast } from '@/lib/toast'

interface QRCodeScannerProps {
  isOpen: boolean
  onClose: () => void
  merchantId?: number
}

export default function QRCodeScanner({ isOpen, onClose, merchantId }: QRCodeScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scannedCode, setScannedCode] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scanningIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isOpen && scanning) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [isOpen, scanning])

  const startCamera = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        await videoRef.current.play()
        startScanning()
      }
    } catch (err: any) {
      console.error('Camera access error:', err)
      setError(
        err.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera access to scan QR codes.'
          : err.name === 'NotFoundError'
          ? 'No camera found. Please connect a camera device.'
          : 'Failed to access camera. Please try again.'
      )
      setScanning(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (scanningIntervalRef.current) {
      clearInterval(scanningIntervalRef.current)
      scanningIntervalRef.current = null
    }
  }

  const startScanning = () => {
    if (!videoRef.current || !canvasRef.current) return

    scanningIntervalRef.current = setInterval(() => {
      try {
        const video = videoRef.current!
        const canvas = canvasRef.current!
        const context = canvas.getContext('2d')

        if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0, canvas.width, canvas.height)

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        const code = detectQRCode(imageData)

        if (code) {
          handleScannedCode(code)
        }
      } catch (err) {
        console.error('Scanning error:', err)
      }
    }, 300) // Scan every 300ms
  }

  // QR code detection - will use jsQR library if available
  // Install with: npm install jsqr @types/jsqr
  const detectQRCode = (imageData: ImageData): string | null => {
    try {
      // Try to use jsQR if available
      // @ts-ignore
      if (typeof window !== 'undefined' && (window as any).jsQR) {
        // @ts-ignore
        const code = (window as any).jsQR(imageData.data, imageData.width, imageData.height)
        if (code && code.data) {
          return code.data
        }
      }
      
      // Fallback: Use BarcodeDetector API if available (Chrome/Edge)
      // @ts-ignore
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        // This would require async handling, so we'll keep it simple for now
        // The BarcodeDetector API is experimental and not widely supported
      }
    } catch (err) {
      console.error('QR detection error:', err)
    }
    return null
  }

  const handleScannedCode = async (code: string) => {
    setScannedCode(code)
    stopCamera()
    setScanning(false)

    // Extract redemption code from URL if it's a verification URL
    let redemptionCode = code.trim()
    
    // Check if it's a full URL
    try {
      const url = new URL(code)
      const pathMatch = url.pathname.match(/redemption\/verify-page\/([A-Z0-9-]+)/i)
      if (pathMatch) {
        redemptionCode = pathMatch[1]
      }
    } catch {
      // Not a URL, check if it's a redemption code pattern
      if (redemptionCode.startsWith('RED-')) {
        // Already a code
      } else {
        // Try to find redemption code pattern in the string
        const codeMatch = redemptionCode.match(/RED-[A-Z0-9]+/i)
        if (codeMatch) {
          redemptionCode = codeMatch[0]
        }
      }
    }

    if (!redemptionCode || !redemptionCode.startsWith('RED-')) {
      setError('Invalid QR code format. Please scan a valid redemption QR code.')
      setScannedCode(null)
      return
    }

    // Redirect directly to verification page (backend will verify merchant ownership)
    showSuccessToast('QR code scanned successfully!')
    router.visit(`/merchant-hub/redemption/verify/${redemptionCode}`)
    onClose()
  }

  const handleStartScan = () => {
    setScanning(true)
    setError(null)
    setScannedCode(null)
  }

  const handleClose = () => {
    stopCamera()
    setScanning(false)
    setError(null)
    setScannedCode(null)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-black border border-[#FF1493]/20 rounded-lg overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[#FF1493]/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF1493] to-[#DC143C] flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Scan QR Code</h2>
                    <p className="text-xs text-gray-400">Scan a redemption QR code</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-[#FF1493]/10 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4">
                {!scanning && !scannedCode ? (
                  <div className="space-y-4">
                    <div className="aspect-square bg-gray-900 rounded-lg flex items-center justify-center border-2 border-dashed border-[#FF1493]/30">
                      <div className="text-center">
                        <Camera className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 text-sm">Ready to scan</p>
                      </div>
                    </div>
                    {error && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-400">{error}</p>
                      </div>
                    )}
                    <MerchantButton onClick={handleStartScan} className="w-full">
                      <Camera className="w-4 h-4 mr-2" />
                      Start Scanning
                    </MerchantButton>
                  </div>
                ) : scanning ? (
                  <div className="space-y-4">
                    <div className="relative aspect-square bg-black rounded-lg overflow-hidden border-2 border-[#FF1493]">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      {/* Scanning overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-64 h-64 border-2 border-[#FF1493] rounded-lg">
                          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#FF1493]"></div>
                          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#FF1493]"></div>
                          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#FF1493]"></div>
                          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#FF1493]"></div>
                        </div>
                      </div>
                    </div>
                    <p className="text-center text-sm text-gray-400">
                      Position the QR code within the frame
                    </p>
                    <MerchantButton
                      variant="outline"
                      onClick={() => {
                        setScanning(false)
                        stopCamera()
                      }}
                      className="w-full"
                    >
                      Cancel
                    </MerchantButton>
                  </div>
                ) : scannedCode ? (
                  <div className="space-y-4">
                    <div className="aspect-square bg-gray-900 rounded-lg flex items-center justify-center border-2 border-green-500/30">
                      <div className="text-center">
                        <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                        <p className="text-white font-semibold mb-1">QR Code Scanned!</p>
                        <p className="text-xs text-gray-400">Processing...</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
