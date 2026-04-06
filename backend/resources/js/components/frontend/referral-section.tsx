"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { Copy, Check, Share2 } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/frontend/ui/card"

interface ReferralSectionProps {
  referralLink: string
}

export default function ReferralSection({ referralLink }: ReferralSectionProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink || "")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-6 md:mb-8"
    >
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700 shadow-lg overflow-hidden">
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Icon and Label */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="p-2 bg-blue-600 rounded-lg shadow-lg">
                <Share2 className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Referral Link</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Earn Rewards</p>
              </div>
            </div>

            {/* Input and Copy Button */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Input
                type="text"
                value={referralLink || ""}
                readOnly
                className="text-sm font-mono bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 truncate"
              />
              <Button
                onClick={handleCopy}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white transition-all duration-300 hover:scale-105 flex-shrink-0 whitespace-nowrap"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span className="hidden sm:inline ml-1">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span className="hidden sm:inline ml-1">Copy</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
