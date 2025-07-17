// components/share-certificate.tsx
"use client"

import { motion } from "framer-motion"
import { Award, Mail, Share2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ShareCertificateProps {
  certificateId: string
  nodeboxName: string
  nodeboxId: string
  amount: number
  buyerName: string
  purchaseDate: string
}

export function ShareCertificate({
  certificateId,
  nodeboxName,
  nodeboxId,
  amount,
  buyerName,
  purchaseDate,
}: ShareCertificateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative bg-white dark:bg-gray-900 p-6 sm:p-10 rounded-lg shadow-2xl border-4 border-double border-blue-600 dark:border-blue-400 text-center overflow-hidden max-w-3xl mx-auto"
    >
      {/* Decorative background pattern/seal */}
      <div className="absolute inset-0 opacity-5 dark:opacity-3">
        <img
          src="/placeholder.svg?height=600&width=600" // Placeholder for a subtle background pattern or seal
          alt="Certificate Background"
          className="grayscale"
        />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-8"
        >
          <Award className="h-20 w-20 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white leading-tight">
            CERTIFICATE OF SHARE
          </h1>
          <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 mt-2">
            Acknowledging Your Contribution to Innovation
          </p>
        </motion.div>

        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-6 sm:p-8 rounded-lg shadow-inner border border-gray-200 dark:border-gray-600 w-full max-w-xl mb-8">
          <p className="text-md text-gray-600 dark:text-gray-400 mb-2">This certifies that</p>
          <p className="text-3xl sm:text-4xl font-bold text-blue-700 dark:text-blue-300 mb-4">{buyerName}</p>
          <p className="text-md text-gray-600 dark:text-gray-400 mb-2">has acquired a share in the</p>
          <p className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">{nodeboxName}</p>
          <p className="text-md text-gray-600 dark:text-gray-400 mb-2">
            NodeBox ID: <span className="font-mono font-semibold">{nodeboxId}</span>
          </p>
          <p className="text-md text-gray-600 dark:text-gray-400 mt-4 mb-2">with a valuable contribution of</p>
          <p className="text-5xl sm:text-6xl font-extrabold text-green-600 dark:text-green-400">
            ${amount.toLocaleString()}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center w-full max-w-xl text-gray-700 dark:text-gray-300 text-sm mb-8">
          <div className="text-left mb-4 sm:mb-0">
            <p className="font-semibold">Certificate ID:</p>
            <p className="font-mono text-blue-800 dark:text-blue-200">{certificateId}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">Date of Issuance:</p>
            <p>{purchaseDate}</p>
          </div>
        </div>

        <div className="border-t border-gray-300 dark:border-gray-700 pt-6 w-full max-w-xl">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            This certificate signifies your direct impact and ownership in the future of decentralized technology. A
            digital copy has been sent to your registered email address.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Mail className="mr-2 h-4 w-4" />
              Email Certificate
            </Button>
            <Button
              variant="outline"
              className="bg-transparent border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              className="bg-transparent border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share Your Impact
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
