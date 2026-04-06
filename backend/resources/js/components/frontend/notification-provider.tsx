"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Warning, Success, Error as NotificationError, Info } from "./notification"

type NotificationType = "warning" | "success" | "error" | "info"

interface NotificationContent {
  type: NotificationType
  title?: string
  message: string
}

interface NotificationContextType {
  showNotification: (content: NotificationContent) => void
}

const NotificationContext = React.createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notification, setNotification] = React.useState<NotificationContent | null>(null)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const showNotification = React.useCallback((content: NotificationContent) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setNotification(content)
    timeoutRef.current = setTimeout(() => {
      setNotification(null)
    }, 5000) // Notification disappears after 5 seconds
  }, [])

  const NotificationComponent = React.useMemo(() => {
    if (!notification) return null

    const commonProps = {
      title: notification.title,
      description: notification.message,
      className: "w-full", // Ensure it takes full width of its container
    }

    switch (notification.type) {
      case "warning":
        return <Warning {...commonProps} />
      case "success":
        return <Success {...commonProps} />
      case "error":
        return <NotificationError {...commonProps} />
      case "info":
        return <Info {...commonProps} />
      default:
        return null
    }
  }, [notification])

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {/* Positioned on the right side */}
      <div className="fixed top-4 right-0 z-50 w-full max-w-sm px-4 sm:px-0 mt-12">
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, x: 100 }} // Start off-screen to the right
              animate={{ opacity: 1, x: 0 }} // Slide in to position
              exit={{ opacity: 0, x: 100 }} // Slide out to the right
              transition={{ duration: 0.3 }}
            >
              {NotificationComponent}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = React.useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotification must be used within a NotificationProvider")
  }
  return context
}
