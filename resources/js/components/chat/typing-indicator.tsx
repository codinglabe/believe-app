"use client"

import { motion } from "framer-motion"
import { UserAvatar } from "./user-avatar"

interface TypingIndicatorProps {
  senderName: string
  senderAvatar: string
}

export function TypingIndicator({ senderName, senderAvatar }: TypingIndicatorProps) {
  const dotVariants = {
    start: { y: "0%" },
    end: { y: "100%" },
  }

  const dotTransition = {
    duration: 0.5,
    repeat: Number.POSITIVE_INFINITY,
    repeatType: "reverse" as const,
    ease: "easeInOut",
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="flex items-start gap-3 p-2 justify-start"
    >
      <UserAvatar src={senderAvatar} alt={senderName} fallback={senderName.charAt(0)} status="online" />
      <div className="flex flex-col items-start">
        <div className="rounded-lg px-4 py-2 text-sm bg-muted text-foreground">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs">{senderName} is typing</span>
            <div className="flex items-center h-4">
              <motion.span
                className="block w-1.5 h-1.5 rounded-full bg-muted-foreground mx-0.5"
                variants={dotVariants}
                initial="start"
                animate="end"
                transition={{ ...dotTransition, delay: 0 }}
              />
              <motion.span
                className="block w-1.5 h-1.5 rounded-full bg-muted-foreground mx-0.5"
                variants={dotVariants}
                initial="start"
                animate="end"
                transition={{ ...dotTransition, delay: 0.1 }}
              />
              <motion.span
                className="block w-1.5 h-1.5 rounded-full bg-muted-foreground mx-0.5"
                variants={dotVariants}
                initial="start"
                animate="end"
                transition={{ ...dotTransition, delay: 0.2 }}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
