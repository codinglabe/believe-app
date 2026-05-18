"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
  Award,
  Mail,
  Share2,
  Download,
  ArrowLeft,
  Check,
  ClipboardCopy,
  Crown,
  Star,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Link, router } from "@inertiajs/react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import type { NodeBoss } from "@/types/nodeboss"
import { useState, useEffect } from "react"

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
  isBigBoss?: boolean
}

export default function Certificate({ nodeSell, nodeBoss, refferalLink, isBigBoss = false }: Props) {
  const [copied, setCopied] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (isBigBoss) {
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [isBigBoss])

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
        title: isBigBoss ? "My Big Boss Certificate" : "My NodeBoss Share Certificate",
        text: `I just purchased a share in ${nodeBoss.name} for $${nodeSell.amount}!`,
        url: window.location.href,
      })
    } else {
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

  // Confetti Animation
  const ConfettiExplosion = () => (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {[...Array(50)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 rounded-full"
          style={{
            backgroundColor: [
              '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
              '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE'
            ][i % 10],
            left: Math.random() * 100 + '%',
            top: '-10px',
          }}
          initial={{ y: -10, opacity: 1, scale: 0 }}
          animate={{
            y: window.innerHeight + 10,
            opacity: 0,
            scale: [0, 1, 0.5, 0],
            rotate: Math.random() * 360,
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            ease: "easeOut",
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  )

  // Floating elements for Big Boss
  const FloatingElements = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{
            x: Math.random() * 100 + "%",
            y: Math.random() * 100 + "%",
            opacity: 0,
            scale: 0,
          }}
          animate={{
            y: [null, Math.random() * 100 + "%"],
            opacity: [0, 0.8, 0],
            scale: [0, 1.2, 0],
            rotate: [0, 360],
          }}
          transition={{
            duration: Math.random() * 4 + 3,
            repeat: Number.POSITIVE_INFINITY,
            delay: Math.random() * 3,
            ease: "easeInOut",
          }}
        >
          {i % 4 === 0 ? (
            <Star className="h-4 w-4 text-amber-400 dark:text-amber-300 drop-shadow-lg" />
          ) : i % 4 === 1 ? (
            <Sparkles className="h-3 w-3 text-yellow-500 dark:text-yellow-400 drop-shadow-lg" />
          ) : i % 4 === 2 ? (
            <Zap className="h-3 w-3 text-orange-500 dark:text-orange-400 drop-shadow-lg" />
          ) : (
            <div className="h-2 w-2 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full shadow-lg" />
          )}
        </motion.div>
      ))}
    </div>
  )

  // Lightning bolts animation
  const LightningBolts = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: Math.random() * 100 + '%',
            top: Math.random() * 100 + '%',
          }}
          initial={{ opacity: 0, scale: 0, rotate: Math.random() * 360 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
            rotate: Math.random() * 360,
          }}
          transition={{
            duration: 0.8,
            repeat: Number.POSITIVE_INFINITY,
            delay: Math.random() * 4 + 2,
            ease: "easeInOut",
          }}
        >
          <Zap className="h-6 w-6 text-yellow-400 drop-shadow-lg" />
        </motion.div>
      ))}
    </div>
  )

  if (isBigBoss) {
    return (
      <FrontendLayout>
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-orange-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-amber-900/20 py-8 px-4 relative overflow-hidden">
          {showConfetti && <ConfettiExplosion />}
          <FloatingElements />
          <LightningBolts />

          {/* Animated Background Glow */}
          <motion.div
            className="fixed inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-orange-500/10 dark:from-amber-400/5 dark:via-yellow-400/5 dark:to-orange-400/5"
              animate={{
                background: [
                  "radial-gradient(circle at 20% 50%, rgba(245, 158, 11, 0.1) 0%, transparent 50%)",
                  "radial-gradient(circle at 80% 50%, rgba(245, 158, 11, 0.1) 0%, transparent 50%)",
                  "radial-gradient(circle at 50% 20%, rgba(245, 158, 11, 0.1) 0%, transparent 50%)",
                  "radial-gradient(circle at 50% 80%, rgba(245, 158, 11, 0.1) 0%, transparent 50%)",
                  "radial-gradient(circle at 20% 50%, rgba(245, 158, 11, 0.1) 0%, transparent 50%)",
                ],
              }}
              transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            />
          </motion.div>

          <div className="max-w-4xl mx-auto relative z-10">
            {/* Back Button */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-8"
            >
              <Link href="/nodeboss">
                <Button
                  variant="outline"
                  className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </Link>
            </motion.div>

            {/* Big Boss Certificate */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.8, rotateX: -15 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              transition={{
                duration: 1.2,
                ease: "easeOut",
                type: "spring",
                bounce: 0.3
              }}
              className="relative"
            >
              {/* Outer Glow Effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 rounded-2xl blur-xl opacity-30"
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              />

              {/* Outer Frame */}
              <motion.div
                className="relative bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 dark:from-amber-500 dark:via-yellow-600 dark:to-orange-600 p-1 rounded-2xl shadow-2xl"
                animate={{
                  boxShadow: [
                    "0 25px 50px -12px rgba(245, 158, 11, 0.25)",
                    "0 25px 50px -12px rgba(245, 158, 11, 0.4)",
                    "0 25px 50px -12px rgba(245, 158, 11, 0.25)",
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              >
                <div className="bg-gradient-to-br from-amber-50 via-white to-yellow-50/50 dark:from-slate-800 dark:via-slate-900 dark:to-amber-900/20 rounded-xl overflow-hidden">

                  {/* Header Section */}
                  <div className="relative bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 dark:from-amber-600 dark:via-yellow-600 dark:to-orange-600 px-8 py-12 text-center overflow-hidden">
                    {/* Animated Background Pattern */}
                    <div className="absolute inset-0 opacity-20">
                      <motion.div
                        className="absolute top-4 left-4"
                        animate={{
                          rotate: 360,
                          scale: [1, 1.2, 1],
                        }}
                        transition={{
                          rotate: { duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
                          scale: { duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
                        }}
                      >
                        <Crown className="h-8 w-8" />
                      </motion.div>
                      <motion.div
                        className="absolute top-4 right-4"
                        animate={{
                          rotate: -360,
                          y: [0, -10, 0],
                        }}
                        transition={{
                          rotate: { duration: 25, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
                          y: { duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
                        }}
                      >
                        <Shield className="h-6 w-6" />
                      </motion.div>
                      <motion.div
                        className="absolute bottom-4 left-8"
                        animate={{
                          rotate: 360,
                          scale: [0.8, 1.3, 0.8],
                        }}
                        transition={{
                          rotate: { duration: 30, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
                          scale: { duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
                        }}
                      >
                        <Star className="h-4 w-4" />
                      </motion.div>
                      <motion.div
                        className="absolute bottom-4 right-8"
                        animate={{
                          rotate: -360,
                          x: [0, 10, 0],
                        }}
                        transition={{
                          rotate: { duration: 22, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
                          x: { duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
                        }}
                      >
                        <Sparkles className="h-5 w-5" />
                      </motion.div>
                    </div>

                    <div className="relative z-10">
                      {/* Crown Animation */}
                      <motion.div
                        initial={{ scale: 0, rotate: -180, y: -50 }}
                        animate={{ scale: 1, rotate: 0, y: 0 }}
                        transition={{
                          delay: 0.5,
                          duration: 1.2,
                          type: "spring",
                          bounce: 0.6
                        }}
                        className="mb-6"
                      >
                        <div className="relative inline-block">
                          <motion.div
                            animate={{
                              rotate: [0, 5, -5, 0],
                              scale: [1, 1.1, 1],
                            }}
                            transition={{
                              duration: 4,
                              repeat: Number.POSITIVE_INFINITY,
                              ease: "easeInOut"
                            }}
                          >
                            <Crown className="h-20 w-20 text-white mx-auto drop-shadow-2xl" />
                          </motion.div>

                          {/* Crown Glow Effect */}
                          <motion.div
                            animate={{
                              scale: [1, 1.4, 1],
                              opacity: [0.3, 0.6, 0.3],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Number.POSITIVE_INFINITY,
                              ease: "easeInOut"
                            }}
                            className="absolute inset-0 bg-white/30 rounded-full blur-2xl"
                          />

                          {/* Sparkle Effects around Crown */}
                          {[...Array(8)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="absolute w-2 h-2 bg-white rounded-full"
                              style={{
                                left: `${50 + 40 * Math.cos((i * Math.PI * 2) / 8)}%`,
                                top: `${50 + 40 * Math.sin((i * Math.PI * 2) / 8)}%`,
                              }}
                              animate={{
                                scale: [0, 1, 0],
                                opacity: [0, 1, 0],
                              }}
                              transition={{
                                duration: 1.5,
                                repeat: Number.POSITIVE_INFINITY,
                                delay: i * 0.2,
                                ease: "easeInOut",
                              }}
                            />
                          ))}
                        </div>
                      </motion.div>

                      {/* Title Animations */}
                      <motion.h1
                        initial={{ opacity: 0, y: 30, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.8, duration: 0.8, type: "spring", bounce: 0.4 }}
                        className="text-4xl md:text-6xl font-bold text-white mb-2 tracking-wide"
                      >
                        <motion.span
                          animate={{
                            textShadow: [
                              "0 0 20px rgba(255,255,255,0.5)",
                              "0 0 40px rgba(255,255,255,0.8)",
                              "0 0 20px rgba(255,255,255,0.5)",
                            ],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "easeInOut",
                          }}
                        >
                          BIG BOSS
                        </motion.span>
                      </motion.h1>

                      <motion.h2
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1, duration: 0.8 }}
                        className="text-2xl md:text-3xl font-semibold text-white/90 mb-3"
                      >
                        <motion.span
                          animate={{
                            scale: [1, 1.05, 1],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "easeInOut",
                          }}
                        >
                          CERTIFICATE
                        </motion.span>
                      </motion.h2>

                      <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.2, duration: 0.8 }}
                        className="text-lg text-white/80 font-medium"
                      >
                        <motion.span
                          animate={{
                            opacity: [0.8, 1, 0.8],
                          }}
                          transition={{
                            duration: 2.5,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "easeInOut",
                          }}
                        >
                          Elite Contributor & Innovation Leader
                        </motion.span>
                      </motion.p>
                    </div>
                  </div>

                  {/* Certificate Content */}
                  <div className="px-8 py-12">
                    <motion.div
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6, duration: 1 }}
                      className="text-center mb-12"
                    >
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.4 }}
                        className="text-lg text-slate-600 dark:text-slate-300 mb-6 font-medium"
                      >
                        This prestigious certificate honors
                      </motion.p>

                      {/* Name with dramatic entrance */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5, rotateY: -90 }}
                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                        transition={{
                          delay: 1.6,
                          duration: 1,
                          type: "spring",
                          bounce: 0.4
                        }}
                        className="mb-8"
                      >
                        <motion.h3
                          animate={{
                            scale: [1, 1.02, 1],
                            textShadow: [
                              "0 0 20px rgba(245, 158, 11, 0.3)",
                              "0 0 40px rgba(245, 158, 11, 0.6)",
                              "0 0 20px rgba(245, 158, 11, 0.3)",
                            ],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "easeInOut"
                          }}
                          className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 dark:from-amber-400 dark:via-orange-400 dark:to-red-400 bg-clip-text text-transparent mb-2"
                        >
                          {nodeSell.buyer_name}
                        </motion.h3>

                        {/* Underline effect */}
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ delay: 2, duration: 1 }}
                          className="h-1 bg-gradient-to-r from-amber-400 to-orange-500 mx-auto max-w-md rounded-full"
                        />
                      </motion.div>

                      <motion.p
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.8, duration: 0.8 }}
                        className="text-lg text-slate-600 dark:text-slate-300 mb-4 font-medium"
                      >
                        as the exclusive Big Boss of
                      </motion.p>

                      <motion.h4
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 2, duration: 0.8 }}
                        className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-8"
                      >
                        <motion.span
                          animate={{
                            scale: [1, 1.03, 1],
                          }}
                          transition={{
                            duration: 4,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "easeInOut",
                          }}
                        >
                          {nodeBoss.name}
                        </motion.span>
                      </motion.h4>

                      {/* Node ID Badge with animation */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 2.2, duration: 0.6, type: "spring", bounce: 0.5 }}
                        className="inline-flex items-center bg-slate-100 dark:bg-slate-800 px-6 py-3 rounded-full border border-slate-200 dark:border-slate-700 mb-8 shadow-lg"
                      >
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                        >
                          <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
                        </motion.div>
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Node Boss ID:</span>
                        <motion.span
                          animate={{ opacity: [0.7, 1, 0.7] }}
                          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                          className="ml-2 font-mono font-bold text-blue-600 dark:text-blue-400"
                        >
                          {nodeSell?.node_share?.node_id}
                        </motion.span>
                      </motion.div>

                      <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 2.4, duration: 0.8 }}
                        className="text-lg text-slate-600 dark:text-slate-300 mb-4 font-medium"
                      >
                        with an exceptional investment of
                      </motion.p>

                      {/* Amount with explosive entrance */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0, rotate: -180 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{
                          delay: 2.6,
                          duration: 1.2,
                          type: "spring",
                          bounce: 0.6
                        }}
                        className="relative mb-8"
                      >
                        <motion.div
                          animate={{
                            scale: [1, 1.05, 1],
                            textShadow: [
                              "0 0 30px rgba(34, 197, 94, 0.3)",
                              "0 0 60px rgba(34, 197, 94, 0.6)",
                              "0 0 30px rgba(34, 197, 94, 0.3)"
                            ]
                          }}
                          transition={{
                            duration: 2.5,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "easeInOut"
                          }}
                          className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 dark:from-green-400 dark:via-emerald-400 dark:to-teal-400 bg-clip-text text-transparent"
                        >
                          ${Number(nodeSell.amount).toLocaleString()}
                        </motion.div>

                        {/* Money glow effect */}
                        <motion.div
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.2, 0.4, 0.2],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "easeInOut"
                          }}
                          className="absolute inset-0 bg-green-400 rounded-full blur-3xl -z-10"
                        />
                      </motion.div>
                    </motion.div>

                    {/* Certificate Details with staggered animation */}
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.2, duration: 0.8 }}
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 mb-8 border border-slate-200 dark:border-slate-700 shadow-lg"
                    >
                      <div className="grid md:grid-cols-2 gap-6 text-center md:text-left">
                        <motion.div
                          initial={{ opacity: 0, x: -30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 3, duration: 0.6 }}
                        >
                          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Certificate ID</p>
                          <motion.p
                            animate={{ opacity: [0.8, 1, 0.8] }}
                            transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                            className="font-mono font-bold text-slate-800 dark:text-slate-200"
                          >
                            {nodeSell.certificate_id}
                          </motion.p>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 3.2, duration: 0.6 }}
                        >
                          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Date of Issuance</p>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(nodeSell.created_at)}</p>
                        </motion.div>
                      </div>
                    </motion.div>

                    {/* Referral Link with enhanced animation */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.4, duration: 0.8 }}
                      className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-6 mb-8 border border-amber-200 dark:border-amber-800 shadow-lg"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 3.4 }}
                            className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2"
                          >
                            Big Boss Referral Link
                          </motion.p>
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 3.6 }}
                            className="font-mono text-sm text-slate-600 dark:text-slate-300 break-all"
                          >
                            {refferalLink}
                          </motion.p>
                        </div>
                        <motion.button
                          onClick={handleCopyReferralLink}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          whileTap={{ scale: 0.9 }}
                          initial={{ opacity: 0, rotate: -90 }}
                          animate={{ opacity: 1, rotate: 0 }}
                          transition={{ delay: 3.8, duration: 0.6 }}
                          className="flex-shrink-0 p-3 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 rounded-lg border border-amber-300 dark:border-amber-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                        >
                          <AnimatePresence mode="wait">
                            {copied ? (
                              <motion.div
                                key="check"
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0, rotate: 180 }}
                                transition={{ duration: 0.4, type: "spring", bounce: 0.6 }}
                              >
                                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                              </motion.div>
                            ) : (
                              <motion.div
                                key="copy"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <ClipboardCopy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      </div>
                    </motion.div>

                    {/* Congratulations Message with celebration */}
                    <motion.div
                      initial={{ opacity: 0, y: 30, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 1.6, duration: 0.8, type: "spring", bounce: 0.3 }}
                      className="text-center mb-8"
                    >
                      <motion.div
                        animate={{
                          boxShadow: [
                            "0 0 20px rgba(34, 197, 94, 0.2)",
                            "0 0 40px rgba(34, 197, 94, 0.4)",
                            "0 0 20px rgba(34, 197, 94, 0.2)",
                          ],
                        }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                        className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800"
                      >
                        <div className="flex items-center justify-center mb-3">
                          <motion.div
                            animate={{
                              rotate: [0, 10, -10, 0],
                              scale: [1, 1.1, 1],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Number.POSITIVE_INFINITY,
                              ease: "easeInOut"
                            }}
                          >
                            <Crown className="h-6 w-6 text-amber-500 dark:text-amber-400 mr-2" />
                          </motion.div>
                          <motion.h5
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 4 }}
                            className="text-xl font-bold text-slate-800 dark:text-slate-100"
                          >
                            Welcome to the Elite Circle!
                          </motion.h5>
                        </div>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 4.2 }}
                          className="text-slate-600 dark:text-slate-300 leading-relaxed"
                        >
                          🎉 Congratulations! As a Big Boss, you have exclusive access to premium features and priority support.
                          Your leadership drives the future of decentralized innovation!
                        </motion.p>
                      </motion.div>
                    </motion.div>

                    {/* Action Buttons with staggered entrance */}
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.8, duration: 0.8 }}
                      className="flex flex-col sm:flex-row gap-4 justify-center"
                    >
                      {[
                        {
                          onClick: handleEmailCertificate,
                          icon: Mail,
                          text: "Email Certificate",
                          gradient: "from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600",
                          delay: 4.4
                        },
                        {
                          onClick: handleDownloadCertificate,
                          icon: Download,
                          text: "Download PDF",
                          variant: "outline",
                          delay: 4.6
                        },
                        {
                          onClick: handleShareCertificate,
                          icon: Share2,
                          text: "Share Achievement",
                          variant: "outline",
                          delay: 4.8
                        }
                      ].map((button, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20, scale: 0.8 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: button.delay, duration: 0.6, type: "spring", bounce: 0.4 }}
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            onClick={button.onClick}
                            variant={button.variant as any}
                            className={
                              button.gradient
                                ? `bg-gradient-to-r ${button.gradient} text-white font-semibold shadow-lg border-0 px-6 py-3 hover:shadow-xl transition-all duration-300`
                                : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold shadow-lg px-6 py-3 hover:shadow-xl transition-all duration-300"
                            }
                          >
                            <motion.div
                              animate={{ rotate: [0, 5, -5, 0] }}
                              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                            >
                              <button.icon className="mr-2 h-4 w-4" />
                            </motion.div>
                            {button.text}
                          </Button>
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Footer Message with final celebration */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2, duration: 0.8 }}
              className="mt-8 text-center"
            >
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 30px rgba(245, 158, 11, 0.1)",
                    "0 0 60px rgba(245, 158, 11, 0.2)",
                    "0 0 30px rgba(245, 158, 11, 0.1)",
                  ],
                }}
                transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-slate-200 dark:border-slate-700"
              >
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 5 }}
                  className="text-slate-600 dark:text-slate-300 font-medium"
                >
                  🏆 Your full investment in <span className="font-bold text-slate-800 dark:text-slate-100">{nodeBoss.name}</span> makes you a cornerstone of innovation.
                  Enjoy exclusive benefits, priority access, and premium support as our valued Big Boss!
                </motion.p>
              </motion.div>
            </motion.div>
          </div>
        </main>
      </FrontendLayout>
    )
  }

  // Regular Certificate Design (keeping existing animations)
  return (
    <FrontendLayout>
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-900 dark:to-slate-800 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <div className="mb-8">
            <Link href="/nodeboss">
              <Button
                variant="outline"
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 shadow-lg"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
          {/* Regular Certificate */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative"
          >
            {/* Outer Frame */}
            <div className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 dark:from-blue-600 dark:via-indigo-600 dark:to-purple-600 p-1 rounded-2xl shadow-2xl">
              <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden">

                {/* Header Section */}
                <div className="relative bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 dark:from-blue-600 dark:via-indigo-600 dark:to-purple-600 px-8 py-12 text-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3, duration: 0.8, type: "spring", bounce: 0.4 }}
                    className="mb-6"
                  >
                    <Award className="h-16 w-16 text-white mx-auto drop-shadow-lg" />
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                    className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-wide"
                  >
                    CERTIFICATE OF SHARE
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.6 }}
                    className="text-lg text-white/80 font-medium"
                  >
                    Acknowledging Your Contribution to Innovation
                  </motion.p>
                </div>

                {/* Certificate Content */}
                <div className="px-8 py-12">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="text-center mb-12"
                  >
                    <p className="text-lg text-slate-600 dark:text-slate-300 mb-6 font-medium">
                      This certifies that
                    </p>

                    <h3 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent mb-8">
                      {nodeSell.buyer_name}
                    </h3>

                    <p className="text-lg text-slate-600 dark:text-slate-300 mb-4 font-medium">
                      has acquired a share in the
                    </p>

                    <h4 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-8">
                      {nodeBoss.name}
                    </h4>

                    {/* Node ID Badge */}
                    <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 px-6 py-3 rounded-full border border-slate-200 dark:border-slate-700 mb-8">
                      <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Node Boss ID:</span>
                      <span className="ml-2 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {nodeSell?.node_share?.node_id}
                      </span>
                    </div>

                    <p className="text-lg text-slate-600 dark:text-slate-300 mb-4 font-medium">
                      with a valuable contribution of
                    </p>

                    <div className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 dark:from-green-400 dark:via-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                      ${Number(nodeSell.amount).toLocaleString()}
                    </div>
                  </motion.div>

                  {/* Certificate Details */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 mb-8 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="grid md:grid-cols-2 gap-6 text-center md:text-left">
                      <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Certificate ID</p>
                        <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{nodeSell.certificate_id}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Date of Issuance</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(nodeSell.created_at)}</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Referral Link */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 mb-8 border border-blue-200 dark:border-blue-800"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">Referral Link</p>
                        <p className="font-mono text-sm text-slate-600 dark:text-slate-300 break-all">{refferalLink}</p>
                      </div>
                      <motion.button
                        onClick={handleCopyReferralLink}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex-shrink-0 p-3 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg border border-blue-300 dark:border-blue-700 transition-colors"
                      >
                        <AnimatePresence mode="wait">
                          {copied ? (
                            <motion.div
                              key="check"
                              initial={{ scale: 0, rotate: -90 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0, rotate: 90 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="copy"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ClipboardCopy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </div>
                  </motion.div>

                  {/* Description */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="text-center mb-8"
                  >
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        This certificate signifies your direct impact and ownership in the future of decentralized technology.
                        A digital copy has been sent to your registered email address.
                      </p>
                    </div>
                  </motion.div>

                  {/* Action Buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center"
                  >
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        onClick={handleEmailCertificate}
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold shadow-lg border-0 px-6 py-3"
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Email Certificate
                      </Button>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        onClick={handleDownloadCertificate}
                        variant="outline"
                        className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold shadow-lg px-6 py-3"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        onClick={handleShareCertificate}
                        variant="outline"
                        className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold shadow-lg px-6 py-3"
                      >
                        <Share2 className="mr-2 h-4 w-4" />
                        Share Your Impact
                      </Button>
                    </motion.div>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Footer Message */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3 }}
              className="mt-8 text-center"
            >
              <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-300">
                  Thank you for your contribution to <span className="font-bold text-slate-800 dark:text-slate-100">{nodeBoss.name}</span>!
                  Your support helps drive innovation forward.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </FrontendLayout>
  )
}

