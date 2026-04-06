"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Download, QrCode, CheckCircle } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent } from "@/components/frontend/ui/card"

interface QRCodeModalProps {
  isOpen: boolean
  onClose: () => void
  qrCodeUrl: string
  receiptCode: string
  offerTitle: string
  merchantName: string
}

export default function QRCodeModal({
  isOpen,
  onClose,
  qrCodeUrl,
  receiptCode,
  offerTitle,
  merchantName,
}: QRCodeModalProps) {
  const [qrCodeData, setQrCodeData] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && qrCodeUrl) {
      setIsLoading(true)
      setError(null)
      
      // Fetch QR code image
      fetch(qrCodeUrl)
        .then((response) => {
          if (!response.ok) throw new Error('Failed to load QR code')
          return response.text()
        })
        .then((svg) => {
          setQrCodeData(svg)
          setIsLoading(false)
        })
        .catch((err) => {
          setError(err.message)
          setIsLoading(false)
        })
    }
  }, [isOpen, qrCodeUrl])

  const handleDownload = () => {
    if (!qrCodeData) return

    // Create a blob from the SVG
    const blob = new Blob([qrCodeData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    
    // Create a temporary link and trigger download
    const link = document.createElement('a')
    link.href = url
    link.download = `redemption-qr-${receiptCode}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
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
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs"
            >
              <Card className="relative overflow-hidden">
                <CardContent className="p-3">
                  {/* Close Button */}
                  <button
                    onClick={onClose}
                    className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
                  >
                    <X className="h-3.5 w-3.5 text-gray-500" />
                  </button>

                  {/* Header */}
                  <div className="text-center mb-3">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-2">
                      <QrCode className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white mb-0.5">
                      Redemption QR Code
                    </h2>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Show to merchant
                    </p>
                  </div>

                  {/* Offer Info */}
                  <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white mb-0.5">
                      {offerTitle}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {merchantName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 font-mono">
                      {receiptCode}
                    </p>
                  </div>

                  {/* QR Code Display */}
                  <div className="flex flex-col items-center justify-center mb-3">
                    {isLoading ? (
                      <div className="w-40 h-40 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                      </div>
                    ) : error ? (
                      <div className="w-40 h-40 flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                        <p className="text-xs text-red-600 dark:text-red-400 text-center">{error}</p>
                      </div>
                    ) : qrCodeData ? (
                      <div className="relative p-2 bg-white dark:bg-gray-900 rounded-lg border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center">
                        <div
                          dangerouslySetInnerHTML={{ __html: qrCodeData }}
                          className="w-40 h-40 flex items-center justify-center"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        />
                      </div>
                    ) : null}
                  </div>

                  {/* Instructions */}
                  <div className="mb-3 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-blue-800 dark:text-blue-200">
                        <p className="font-semibold mb-0.5">How to use:</p>
                        <ol className="list-decimal list-inside space-y-0.5 text-xs">
                          <li>Show QR code to merchant</li>
                          <li>Merchant scans to verify</li>
                          <li>Discount applied at checkout</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleDownload}
                      disabled={!qrCodeData || isLoading}
                      size="sm"
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-xs"
                    >
                      <Download className="h-3 w-3 mr-1.5" />
                      Download
                    </Button>
                    <Button
                      onClick={onClose}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                    >
                      Close
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
