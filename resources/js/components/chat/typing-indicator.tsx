"use client"

import { motion } from "framer-motion"

interface TypingIndicatorProps {
  senderName: string
  senderAvatar: string
}

export function TypingIndicator({ senderName, senderAvatar }: TypingIndicatorProps) {
  const dotVariants = {
    start: {
      y: "0%",
    },
    end: {
      y: "100%",
    },
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
      <div className="relative">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground"
        >
          {senderAvatar ? (
            <img
              src={senderAvatar || "/placeholder.svg"}
              alt={senderName}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            senderName.charAt(0)
          )}
        </motion.div>
        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-background bg-green-500" />
      </div>
      <div className="flex flex-col items-start">
        <div className="rounded-lg px-4 py-2 text-sm bg-muted text-foreground flex items-center gap-1">
          <span className="font-semibold text-xs mb-1 block">{senderName}</span>
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
    </motion.div>
  )
}
