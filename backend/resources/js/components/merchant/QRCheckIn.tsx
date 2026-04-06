import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QrCode, Camera, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface QRCheckInProps {
  eventId: string
  eventName: string
  onCheckIn: (code: string) => void
  onClose?: () => void
}

export function QRCheckIn({ eventId, eventName, onCheckIn, onClose }: QRCheckInProps) {
  const [scanned, setScanned] = useState(false)
  const [code, setCode] = useState('')

  const handleScan = () => {
    // In production, integrate with camera/QR scanner
    // For now, simulate scan
    const mockCode = `EVENT_${eventId}_${Date.now()}`
    setCode(mockCode)
    setScanned(true)
  }

  const handleConfirm = () => {
    onCheckIn(code)
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Check In to Event</CardTitle>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          {eventName}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!scanned ? (
          <>
            <div className="flex justify-center p-8 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <QrCode className="w-32 h-32 text-gray-400" />
            </div>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Scan the QR code at the event location to check in
            </p>
            <Button className="w-full" onClick={handleScan}>
              <Camera className="w-4 h-4 mr-2" />
              Scan QR Code
            </Button>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <CheckCircle2 className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto" />
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              QR Code Scanned Successfully!
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Code: {code}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setScanned(false)}>
                Scan Again
              </Button>
              <Button className="flex-1" onClick={handleConfirm}>
                Confirm Check In
              </Button>
            </div>
          </motion.div>
        )}
        {onClose && (
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

