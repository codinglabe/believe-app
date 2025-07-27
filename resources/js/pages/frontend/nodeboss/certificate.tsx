"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Award, Mail, Share2, Download, ArrowLeft, Check, ClipboardCopy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Link, router } from "@inertiajs/react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { NodeBoss } from "@/types/nodeboss"
import { useState } from "react"
interface NodeSell {
  id: number
  amount: number
  buyer_name: string
  buyer_email: string
  certificate_id: string
  created_at: string
  nodeBoss: {
    id: number
    name: string
    node_id?: string
  }
  node_share: {
    node_id?: string
  }
}

interface Props {
  nodeSell: NodeSell
  nodeBoss: NodeBoss
  refferalLink: string
}

export default function Certificate({ nodeSell, nodeBoss, refferalLink }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopyReferralLink = () => {
    navigator.clipboard.writeText(refferalLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  const handleEmailCertificate = () => {
    router.post(
      `/certificate/${nodeSell.id}/email`,
      {},
      {
        onSuccess: () => {
          alert("Certificate sent to your email!")
        },
      },
    )
  }

  const handleDownloadCertificate = () => {
    window.open(`/certificate/${nodeSell.id}/download`, "_blank")
  }

  const handleShareCertificate = () => {
    if (navigator.share) {
      navigator.share({
        title: "My NodeBoss Share Certificate",
        text: `I just purchased a share in ${nodeBoss.name} for $${nodeSell.amount}!`,
        url: window.location.href,
      })
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href)
      alert("Certificate URL copied to clipboard!")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <FrontendLayout>
      <main className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <div className="mb-6">
            <Link href="/nodeboss">
              <Button variant="outline" className="mb-4 bg-transparent">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>

          {/* Certificate */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative bg-white dark:bg-gray-900 p-6 sm:p-10 rounded-lg shadow-2xl border-4 border-double border-blue-600 dark:border-blue-400 text-center overflow-hidden"
          >
            {/* Decorative background pattern */}
            <div className="absolute inset-0 opacity-5 dark:opacity-3">
              <div className="w-full h-full bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900" />
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
                <p className="text-3xl sm:text-4xl font-bold text-blue-700 dark:text-blue-300 mb-4">
                  {nodeSell.buyer_name}
                </p>
                <p className="text-md text-gray-600 dark:text-gray-400 mb-2">has acquired a share in the</p>
                <p className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
                  {nodeBoss.name}
                </p>
                <p className="text-md text-gray-600 dark:text-gray-400 mb-2">
                  Node Boss ID: <span className="font-mono font-semibold">{nodeSell?.node_share?.node_id}</span>
                </p>
                <p className="text-md text-gray-600 dark:text-gray-400 mt-4 mb-2">with a valuable contribution of</p>
                <p className="text-5xl sm:text-6xl font-extrabold text-green-600 dark:text-green-400">
                  ${Number(nodeSell.amount).toLocaleString()}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center w-full max-w-xl text-gray-700 dark:text-gray-300 text-sm mb-8">
                <div className="text-left mb-4 sm:mb-0">
                  <p className="font-semibold">Certificate ID:</p>
                  <p className="font-mono text-blue-800 dark:text-blue-200">{nodeSell.certificate_id}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">Date of Issuance:</p>
                  <p>{formatDate(nodeSell.created_at)}</p>
                </div>
              </div>

              <div className="text-left mb-4 flex items-center gap-2 sm:mb-0">
                <p className="font-semibold">Referral:</p>
                <span className="font-mono text-blue-800 dark:text-blue-200 truncate">
                  {refferalLink}
                </span>
                <span
                  onClick={handleCopyReferralLink}
                  className="cursor-pointer text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100 transition duration-200"
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.span
                        key="check"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Check className="w-5 h-5 text-green-500" />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="copy"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ClipboardCopy className="w-5 h-5" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </div>


              <div className="border-t border-gray-300 dark:border-gray-700 pt-6 w-full max-w-xl">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  This certificate signifies your direct impact and ownership in the future of decentralized technology.
                  A digital copy has been sent to your registered email address.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={handleEmailCertificate} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Mail className="mr-2 h-4 w-4" />
                    Email Certificate
                  </Button>

                  <Button
                    onClick={handleDownloadCertificate}
                    variant="outline"
                    className="bg-transparent border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>

                  <Button
                    onClick={handleShareCertificate}
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

          {/* Additional Info */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Thank you for your contribution to {nodeBoss.name}! Your support helps drive innovation forward.
            </p>
          </div>
        </div>
      </main>
    </FrontendLayout>
  )
}
