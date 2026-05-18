import React from "react"
import { motion } from "framer-motion"

/**
 * Light: soft purple/blue wash. Dark: animated orbs + starfield (same wordmark colors).
 */
export function LevelUpScenery({
  children,
  className = "",
  minHeight = "min-h-[70vh]",
}: {
  children: React.ReactNode
  className?: string
  minHeight?: string
}) {
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-slate-50 via-purple-50/35 to-blue-50/45 px-4 py-10 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100 ${minHeight} ${className}`}
    >
      {/* Light mode: static airy wash */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/60 via-transparent to-purple-100/30 dark:hidden" />
      <div className="pointer-events-none absolute -right-1/4 top-0 h-[min(70vw,420px)] w-[min(70vw,420px)] rounded-full bg-blue-200/25 blur-3xl dark:hidden" />
      <div className="pointer-events-none absolute -left-1/4 bottom-0 h-[min(65vw,380px)] w-[min(65vw,380px)] rounded-full bg-purple-200/30 blur-3xl dark:hidden" />

      {/* Dark mode: animated glows */}
      <div className="pointer-events-none absolute inset-0 hidden dark:block">
        <motion.div
          className="absolute -left-[20%] top-[-10%] h-[min(90vw,520px)] w-[min(90vw,520px)] rounded-full bg-[radial-gradient(circle,rgba(147,51,234,0.24)_0%,transparent_68%)] blur-3xl"
          animate={{
            opacity: [0.35, 0.6, 0.35],
            scale: [1, 1.06, 1],
            x: [0, 24, 0],
          }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-[15%] bottom-[-15%] h-[min(85vw,480px)] w-[min(85vw,480px)] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.22)_0%,transparent_70%)] blur-3xl"
          animate={{
            opacity: [0.28, 0.52, 0.28],
            y: [0, -18, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className="absolute left-1/2 top-1/3 h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.14)_0%,transparent_65%)] blur-2xl"
          animate={{ opacity: [0.2, 0.45, 0.2] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-5%] left-1/2 h-[220px] w-[min(80vw,420px)] -translate-x-1/2 rounded-full bg-[linear-gradient(90deg,rgba(147,51,234,0.1),rgba(37,99,235,0.12),rgba(147,51,234,0.08))] blur-3xl"
          animate={{ opacity: [0.12, 0.28, 0.12] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
      </div>

      {/* Stars: dark = light dots; light = subtle slate specks */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.15] mix-blend-multiply dark:hidden bg-[radial-gradient(1.5px_1.5px_at_18%_28%,rgba(15,23,42,0.12),transparent),radial-gradient(1px_1px_at_62%_72%,rgba(15,23,42,0.1),transparent),radial-gradient(1px_1px_at_48%_52%,rgba(15,23,42,0.08),transparent)]" />
      <div className="pointer-events-none absolute inset-0 hidden opacity-[0.28] mix-blend-screen dark:block bg-[radial-gradient(1.5px_1.5px_at_18%_28%,rgba(255,255,255,0.45),transparent),radial-gradient(1px_1px_at_62%_72%,rgba(255,255,255,0.35),transparent),radial-gradient(1px_1px_at_48%_52%,rgba(255,255,255,0.22),transparent),radial-gradient(1.5px_1.5px_at_82%_12%,rgba(255,255,255,0.4),transparent),radial-gradient(1px_1px_at_10%_58%,rgba(255,255,255,0.28),transparent)]" />

      <div className="relative z-10">{children}</div>
    </div>
  )
}
