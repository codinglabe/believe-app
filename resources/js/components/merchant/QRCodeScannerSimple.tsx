"use client"

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, QrCode, AlertCircle, CheckCircle2, Loader2, User, Mail, Gift, Calendar, Check, XCircle, Ban, Clock } from 'lucide-react'
import { MerchantButton } from '@/components/merchant-ui'
import { router } from '@inertiajs/react'
import { showErrorToast, showSuccessToast } from '@/lib/toast'
import { QrReader } from 'react-qr-reader'
import './qr-scanner.css'

interface QRCodeScannerProps {
  isOpen: boolean
  onClose: () => void
  merchantId?: number
}

export default function QRCodeScannerSimple({ isOpen, onClose, merchantId }: QRCodeScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualCode, setManualCode] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt')
  const videoContainerRef = useRef<HTMLDivElement>(null)

  // Ensure video element is visible after QrReader mounts
  useEffect(() => {
    if (scanning && cameraPermission === 'granted') {
      const checkVideo = setInterval(() => {
        // Try multiple selectors to find the video element
        const video = document.getElementById('qr-scanner-video') ||
                     document.getElementById('video') || 
                     videoContainerRef.current?.querySelector('video') ||
                     document.querySelector('.qr-reader-container video') ||
                     document.querySelector('video')
        
        if (video && video instanceof HTMLVideoElement) {
          // Force video to be visible and properly sized
          video.style.setProperty('width', '100%', 'important')
          video.style.setProperty('height', '100%', 'important')
          video.style.setProperty('min-width', '100%', 'important')
          video.style.setProperty('min-height', '100%', 'important')
          video.style.setProperty('object-fit', 'cover', 'important')
          video.style.setProperty('display', 'block', 'important')
          video.style.setProperty('visibility', 'visible', 'important')
          video.style.setProperty('opacity', '1', 'important')
          video.style.setProperty('background', '#000', 'important')
          video.style.setProperty('position', 'absolute', 'important')
          video.style.setProperty('top', '0', 'important')
          video.style.setProperty('left', '0', 'important')
          video.style.setProperty('z-index', '1', 'important')
          video.style.setProperty('padding-top', '0', 'important')
          
          // Ensure video is playing
          if (video.paused && video.readyState >= 2) {
            video.play().catch(err => console.error('Video play error:', err))
          }
          
          // Log for debugging
          console.log('Video element found and styled:', {
            width: video.videoWidth,
            height: video.videoHeight,
            readyState: video.readyState,
            paused: video.paused
          })
          
          clearInterval(checkVideo)
        }
      }, 100)

      return () => clearInterval(checkVideo)
    }
  }, [scanning, cameraPermission, facingMode])

  const handleResult = (result: any, error: any) => {
    if (!!result) {
      handleScannedCode(result?.text || result)
    }

    if (!!error) {
      // Only log errors, don't show them for every scan attempt
      // The library will continuously try to scan, so we don't want to spam errors
      if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
        setCameraPermission('denied')
        setError('Camera access denied. Please allow camera access in your browser settings and try again.')
        setScanning(false)
      } else if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
        setCameraPermission('denied')
        setError('No camera found. Please connect a camera device.')
        setScanning(false)
      } else if (error?.name === 'NotReadableError' || error?.name === 'TrackStartError') {
        setCameraPermission('denied')
        setError('Camera is already in use by another application. Please close other apps using the camera.')
        setScanning(false)
      }
      // Don't show error for scanning errors (like "No QR code found"), only for camera access errors
    }
  }

  const [redemptionData, setRedemptionData] = useState<any>(null)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [isAlreadyUsed, setIsAlreadyUsed] = useState(false)
  const [alreadyUsedData, setAlreadyUsedData] = useState<any>(null)

  const handleScannedCode = async (code: string) => {
    if (isProcessing) return

    setIsProcessing(true)
    setError(null)

    let qrData: any = null

    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(code.trim())
      
      // Validate JSON structure
      if (parsed.type === 'redemption' && parsed.code) {
        // Validate the code from JSON starts with RED-
        if (!parsed.code.startsWith('RED-')) {
          setError('Invalid redemption code format in QR code data. Code should start with "RED-"')
          setIsProcessing(false)
          return
        }
        qrData = parsed
      } else {
        throw new Error('Invalid JSON structure')
      }
    } catch (jsonError) {
      // Not valid JSON, try to extract code from URL or plain text
      let redemptionCode = code.trim()
      
      // Check if it's a URL
      try {
        const url = new URL(redemptionCode)
        const pathMatch = url.pathname.match(/redemption\/verify-page\/([A-Z0-9-]+)/i) ||
                         url.pathname.match(/redemption\/verify\/([A-Z0-9-]+)/i)
        if (pathMatch) {
          redemptionCode = pathMatch[1]
        }
      } catch {
        // Not a URL, check if it's a redemption code
        if (!redemptionCode.startsWith('RED-')) {
          const codeMatch = redemptionCode.match(/RED-[A-Z0-9-]+/i)
          if (codeMatch) {
            redemptionCode = codeMatch[0]
          } else {
            setError('Invalid QR code format. Please scan a valid redemption QR code.')
            setIsProcessing(false)
            return
          }
        }
      }

      // Validate code format
      if (!redemptionCode || !redemptionCode.startsWith('RED-')) {
        setError('Invalid redemption code format. Code should start with "RED-"')
        setIsProcessing(false)
        return
      }

      // If we have a code but not JSON, create a simple object
      qrData = { type: 'redemption', code: redemptionCode }
    }

    // Stop scanning
    setScanning(false)

    // Verify redemption from backend
    try {
      const response = await fetch('/merchant-hub/redemption/verify-from-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify(qrData),
      })

      const data = await response.json()

      if (!response.ok) {
        // Check if it's already used
        if (data.error && (data.error.includes('already been used') || data.error.includes('already used')) && data.redemption) {
          setIsAlreadyUsed(true)
          setAlreadyUsedData(data.redemption)
          setScanning(false)
          setIsProcessing(false)
          return
        }
        
        // Check if it's not for this merchant
        if (data.error && data.error.includes('not for your merchant')) {
          setError('This QR code is not for your merchant. You can only scan QR codes for your own offers.')
          setIsProcessing(false)
          setScanning(true) // Resume scanning on error
          return
        }
        
        setError(data.error || data.message || 'Failed to verify redemption')
        setIsProcessing(false)
        setScanning(true) // Resume scanning on error
        return
      }

      // Show verification modal with redemption data
      setRedemptionData(data.redemption)
      setShowVerificationModal(true)
      setIsProcessing(false)
    } catch (err: any) {
      setError('Failed to verify redemption. Please try again.')
      setIsProcessing(false)
      setScanning(true) // Resume scanning on error
    }
  }

  const handleManualSubmit = async () => {
    if (!manualCode.trim()) {
      setError('Please enter a redemption code')
      return
    }

    await handleScannedCode(manualCode)
  }

  const requestCameraPermission = async () => {
    try {
      setError(null)
      setCameraPermission('prompt')
      
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera API not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.')
        setCameraPermission('denied')
        return
      }

      // First, enumerate devices to check if camera exists (optional, may require permission first)
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter(device => device.kind === 'videoinput')
        if (videoDevices.length === 0) {
          // If no devices found, it might be because we need permission first
          // So we'll still try to get user media
          console.warn('No video devices found in enumeration, but will try getUserMedia anyway')
        } else {
          console.log(`Found ${videoDevices.length} camera device(s)`)
        }
      } catch (enumError) {
        // If enumeration fails (often due to no permission yet), we'll still try getUserMedia
        console.warn('Could not enumerate devices (this is normal if permission not granted yet):', enumError)
      }

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      })
      
      // Permission granted, stop the stream immediately (QrReader will start its own)
      stream.getTracks().forEach(track => track.stop())
      setCameraPermission('granted')
      setScanning(true)
      setManualCode('')
    } catch (err: any) {
      console.error('Camera permission error:', err)
      setCameraPermission('denied')
      setScanning(false)
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera access denied. Please allow camera access in your browser settings and try again.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found. Please connect a camera device and refresh the page.')
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is already in use by another application. Please close other apps using the camera.')
      } else if (err.name === 'OverconstrainedError') {
        setError('Camera constraints not supported. Trying with default settings...')
        // Try again with simpler constraints
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true })
          stream.getTracks().forEach(track => track.stop())
          setCameraPermission('granted')
          setScanning(true)
          setError(null)
        } catch (retryErr: any) {
          setError('Failed to access camera. Please try again or use manual code entry.')
        }
      } else {
        setError('Failed to access camera. Please try again or use manual code entry.')
      }
    }
  }

  const handleStartScan = async () => {
    // First request camera permission explicitly
    await requestCameraPermission()
  }

  const handleClose = () => {
    setScanning(false)
    setError(null)
    setManualCode('')
    setIsProcessing(false)
    onClose()
  }

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')
    // Restart scanner with new camera
    setScanning(false)
    setTimeout(() => {
      if (cameraPermission === 'granted') {
        setScanning(true)
      }
    }, 100)
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
              className="w-full max-w-sm bg-black border border-[#FF1493]/20 rounded-lg overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-[#FF1493]/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF1493] to-[#DC143C] flex items-center justify-center">
                    <QrCode className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Scan QR Code</h2>
                    <p className="text-xs text-gray-400">Scan or enter code</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg hover:bg-[#FF1493]/10 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-3 space-y-3">
                {isAlreadyUsed ? (
                  /* Already Used Animation Screen */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center justify-center py-8"
                  >
                    {/* Animated Icon */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 200, 
                        damping: 15,
                        delay: 0.1
                      }}
                      className="relative mb-6"
                    >
                      <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center">
                        <motion.div
                          animate={{ 
                            rotate: [0, -10, 10, -10, 0],
                            scale: [1, 1.1, 1]
                          }}
                          transition={{ 
                            duration: 0.5,
                            repeat: Infinity,
                            repeatDelay: 2
                          }}
                        >
                          <Ban className="w-12 h-12 text-red-500" />
                        </motion.div>
                      </div>
                      {/* Pulsing ring */}
                      <motion.div
                        className="absolute inset-0 rounded-full border-4 border-red-500/30"
                        animate={{
                          scale: [1, 1.3, 1],
                          opacity: [0.5, 0, 0.5]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                    </motion.div>

                    {/* Title */}
                    <motion.h3
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-xl font-bold text-white mb-2 text-center"
                    >
                      Already Used
                    </motion.h3>

                    {/* Message */}
                    <motion.p
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-sm text-gray-400 text-center mb-6 max-w-xs"
                    >
                      This redemption has already been used and cannot be used again.
                    </motion.p>

                    {/* Redemption Details */}
                    {alreadyUsedData && (
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="w-full bg-gray-900/50 rounded-lg p-3 mb-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Code:</span>
                          <span className="text-xs font-mono text-[#FF1493]">{alreadyUsedData.code}</span>
                        </div>
                        {alreadyUsedData.user_name && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">Customer:</span>
                            <span className="text-xs text-white">{alreadyUsedData.user_name}</span>
                          </div>
                        )}
                        {alreadyUsedData.used_at && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Used At:
                            </span>
                            <span className="text-xs text-white">
                              {new Date(alreadyUsedData.used_at).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {alreadyUsedData.offer && (
                          <div className="pt-2 border-t border-gray-700">
                            <p className="text-xs text-gray-400 mb-1">Offer:</p>
                            <p className="text-xs text-white font-medium">{alreadyUsedData.offer.title}</p>
                          </div>
                        )}
                        {alreadyUsedData.pricingBreakdown && (
                          <div className="pt-2 border-t border-gray-700">
                            <p className="text-xs text-gray-400 mb-1.5">Pricing Breakdown</p>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">Regular Price</span>
                                <span className="text-xs text-white line-through">
                                  ${alreadyUsedData.pricingBreakdown.regularPrice.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">
                                  Discount ({alreadyUsedData.pricingBreakdown.discountPercentage}%)
                                </span>
                                <span className="text-xs text-green-400">
                                  -${alreadyUsedData.pricingBreakdown.discountAmount.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between pt-1 border-t border-gray-700">
                                <span className="text-xs font-medium text-gray-300">You Paid</span>
                                <span className="text-xs font-bold text-white">
                                  ${alreadyUsedData.pricingBreakdown.discountPrice.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Action Button */}
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="w-full"
                    >
                      <MerchantButton
                        onClick={() => {
                          setIsAlreadyUsed(false)
                          setAlreadyUsedData(null)
                          setScanning(true)
                        }}
                        className="w-full bg-gradient-to-r from-[#FF1493] to-[#DC143C]"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Scan Another Code
                      </MerchantButton>
                    </motion.div>
                  </motion.div>
                ) : !scanning ? (
                  <>
                    <div className="w-full bg-gray-900 rounded-lg flex items-center justify-center border-2 border-dashed border-[#FF1493]/30" style={{ aspectRatio: '1', minHeight: '300px' }}>
                      <div className="text-center">
                        <Camera className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-400 text-xs">Ready to scan</p>
                      </div>
                    </div>
                    
                    {/* Manual Input */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400">Or enter code manually:</label>
                      <input
                        type="text"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                        placeholder="RED-XXXXXXXX"
                        className="w-full px-3 py-2 text-sm bg-black/50 border border-[#FF1493]/20 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF1493]/50"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleManualSubmit()
                          }
                        }}
                      />
                    </div>

                    {error && (
                      <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-400">{error}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <MerchantButton
                        onClick={handleStartScan}
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-[#FF1493] to-[#DC143C] text-sm"
                      >
                        <Camera className="w-3.5 h-3.5 mr-1.5" />
                        Scan
                      </MerchantButton>
                      <MerchantButton
                        onClick={handleManualSubmit}
                        disabled={!manualCode.trim() || isProcessing}
                        size="sm"
                        className="flex-1 text-sm"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Verify
                      </MerchantButton>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="relative w-full bg-black rounded-lg overflow-hidden border-2 border-[#FF1493]" style={{ aspectRatio: '1', minHeight: '300px' }}>
                      {cameraPermission === 'granted' && scanning ? (
                        <div ref={videoContainerRef} className="relative w-full h-full">
                          <QrReader
                            onResult={handleResult}
                            constraints={{ facingMode: facingMode }}
                            containerStyle={{ 
                              width: '100%', 
                              height: '100%', 
                              position: 'relative',
                              padding: 0,
                              paddingTop: 0,
                              margin: 0,
                              display: 'block'
                            }}
                            videoContainerStyle={{ 
                              width: '100%', 
                              height: '100%', 
                              padding: 0,
                              paddingTop: 0,
                              margin: 0,
                              position: 'relative',
                              overflow: 'visible',
                              display: 'block'
                            }}
                            videoStyle={{ 
                              width: '100%', 
                              height: '100%',
                              minWidth: '100%',
                              minHeight: '100%',
                              objectFit: 'cover',
                              display: 'block',
                              visibility: 'visible',
                              opacity: 1,
                              background: '#000',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              zIndex: 1
                            }}
                            className="qr-reader-container"
                            scanDelay={300}
                            videoId="qr-scanner-video"
                          />
                          {/* Scanning overlay */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                            <div className="w-48 h-48 border-2 border-[#FF1493] rounded-lg relative">
                              {/* Corner indicators */}
                              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#FF1493]"></div>
                              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#FF1493]"></div>
                              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#FF1493]"></div>
                              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#FF1493]"></div>
                              
                              {/* Scanning line animation */}
                              <motion.div
                                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#FF1493] to-transparent"
                                initial={{ top: 0 }}
                                animate={{ 
                                  top: ['0%', '100%', '0%'],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "linear"
                                }}
                                style={{
                                  boxShadow: '0 0 10px #FF1493, 0 0 20px #FF1493'
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : cameraPermission === 'prompt' ? (
                        <div className="w-full h-full flex items-center justify-center" style={{ minHeight: '300px' }}>
                          <div className="text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-[#FF1493] mx-auto mb-2" />
                            <p className="text-gray-400 text-xs">Requesting camera access...</p>
                            <p className="text-gray-500 text-xs mt-1">Please allow camera access</p>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ minHeight: '300px' }}>
                          <div className="text-center p-3">
                            <Camera className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                            <p className="text-gray-400 text-xs mb-1">Camera not available</p>
                            <p className="text-gray-500 text-xs">Use manual entry below</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-center text-xs text-gray-400">
                      Position QR code within frame
                    </p>

                    {/* Camera toggle button */}
                    <MerchantButton
                      variant="outline"
                      onClick={toggleCamera}
                      className="w-full"
                      size="sm"
                    >
                      <Camera className="w-3.5 h-3.5 mr-1.5" />
                      <span className="text-xs">Switch to {facingMode === 'environment' ? 'Front' : 'Back'} Camera</span>
                    </MerchantButton>
                    
                    {/* Manual input fallback */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400">Or enter code manually:</label>
                      <input
                        type="text"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                        placeholder="RED-XXXXXXXX"
                        className="w-full px-3 py-2 text-sm bg-black/50 border border-[#FF1493]/20 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF1493]/50"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleManualSubmit()
                          }
                        }}
                      />
                    </div>

                    {error && (
                      <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-400">{error}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <MerchantButton
                        variant="outline"
                        onClick={() => {
                          setScanning(false)
                        }}
                        size="sm"
                        className="flex-1 text-sm"
                      >
                        Cancel
                      </MerchantButton>
                      <MerchantButton
                        onClick={handleManualSubmit}
                        disabled={!manualCode.trim() || isProcessing}
                        size="sm"
                        className="flex-1 text-sm"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Verify
                      </MerchantButton>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>

          {/* Verification Modal */}
          <AnimatePresence>
            {showVerificationModal && redemptionData && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowVerificationModal(false)}
                  className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
                />
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-white">Redemption Details</h2>
                          <p className="text-xs text-gray-400">Verify and approve redemption</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowVerificationModal(false)
                          setRedemptionData(null)
                          handleClose()
                        }}
                        className="p-2 rounded-lg hover:bg-[#FF1493]/10 transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                      {/* User Info */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Customer Information
                        </h3>
                        <div className="bg-gray-900/50 rounded-lg p-3 space-y-2">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Name</p>
                            <p className="text-sm font-medium text-white">{redemptionData.user_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Email</p>
                            <p className="text-sm font-medium text-white">{redemptionData.user_email}</p>
                          </div>
                        </div>
                      </div>

                      {/* Redemption Info */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                          <Gift className="w-4 h-4" />
                          Redemption Details
                        </h3>
                        <div className="bg-gray-900/50 rounded-lg p-3 space-y-2">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Offer</p>
                            <p className="text-sm font-medium text-white">{redemptionData.offer?.title || 'N/A'}</p>
                            <p className="text-xs text-gray-500">{redemptionData.offer?.merchant_name || ''}</p>
                          </div>
                          <div className="flex gap-4">
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Code</p>
                              <p className="text-sm font-mono font-medium text-[#FF1493]">{redemptionData.code}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Points</p>
                              <p className="text-sm font-medium text-white">{redemptionData.points_spent}</p>
                            </div>
                          </div>
                          {redemptionData.pricingBreakdown ? (
                            <>
                              <div className="pt-2 border-t border-gray-700">
                                <p className="text-xs text-gray-400 mb-2">Pricing Breakdown</p>
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-400">Regular Price</span>
                                    <span className="text-sm font-medium text-white line-through">
                                      ${redemptionData.pricingBreakdown.regularPrice.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-400">
                                      Discount ({redemptionData.pricingBreakdown.discountPercentage}%)
                                    </span>
                                    <span className="text-sm font-medium text-green-400">
                                      -${redemptionData.pricingBreakdown.discountAmount.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between pt-1 border-t border-gray-700">
                                    <span className="text-xs font-medium text-gray-300">
                                      {redemptionData.used_at ? 'You Paid' : 'Discounted Price'}
                                    </span>
                                    <span className="text-sm font-bold text-white">
                                      ${redemptionData.pricingBreakdown.discountPrice.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Discount</p>
                              <p className="text-sm font-medium text-white">
                                {redemptionData.discount_percentage}% (Max: ${redemptionData.discount_cap?.toFixed(2) || '0.00'})
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Redeemed At
                            </p>
                            <p className="text-sm text-gray-300">
                              {new Date(redemptionData.redeemed_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex items-center justify-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          redemptionData.status === 'fulfilled' 
                            ? 'bg-green-500/20 text-green-400' 
                            : redemptionData.status === 'approved'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {redemptionData.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-4 border-t border-[#FF1493]/20 flex gap-3">
                      <MerchantButton
                        variant="outline"
                        onClick={() => {
                          setShowVerificationModal(false)
                          setRedemptionData(null)
                          setScanning(true)
                        }}
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel
                      </MerchantButton>
                      <MerchantButton
                        onClick={async () => {
                          try {
                            setIsProcessing(true)
                            const response = await fetch(`/merchant-hub/redemption/${redemptionData.code}/mark-used`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                              },
                            })

                            const data = await response.json()

                            if (!response.ok) {
                              showErrorToast(data.error || 'Failed to approve redemption')
                              setIsProcessing(false)
                              return
                            }

                            showSuccessToast('Redemption approved successfully!')
                            setShowVerificationModal(false)
                            setRedemptionData(null)
                            handleClose()
                            setIsProcessing(false)
                          } catch (err: any) {
                            showErrorToast('Failed to approve redemption. Please try again.')
                            setIsProcessing(false)
                          }
                        }}
                        disabled={isProcessing || redemptionData.status === 'fulfilled'}
                        className="flex-1 bg-gradient-to-r from-[#FF1493] to-[#DC143C]"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        Approve
                      </MerchantButton>
                    </div>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  )
}
