"use client"

import { ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Shield, Lock, AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { useCan, useRole } from "@/lib/can"

interface PermissionGuardProps {
  children: ReactNode
  permission?: string
  role?: string | string[]
  fallback?: ReactNode
  showFallback?: boolean
  className?: string
}

export function PermissionGuard({
  children,
  permission,
  role,
  fallback,
  showFallback = true,
  className = ""
}: PermissionGuardProps) {
  const hasPermission = permission ? useCan(permission) : true
  const hasRole = role ? useRole(role) : true

  const canAccess = hasPermission && hasRole

  if (canAccess) {
    return <>{children}</>
  }

  if (!showFallback) {
    return null
  }

  const defaultFallback = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`${className}`}
    >
      <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              Access Restricted
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              You don't have permission to view this content
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )

  return (
    <AnimatePresence>
      {fallback || defaultFallback}
    </AnimatePresence>
  )
}

interface PermissionButtonProps {
  children: ReactNode
  permission?: string
  role?: string | string[]
  onClick?: () => void
  disabled?: boolean
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  [key: string]: any
}

export function PermissionButton({
  children,
  permission,
  role,
  onClick,
  disabled = false,
  className = "",
  variant = "default",
  size = "default",
  ...props
}: PermissionButtonProps) {
  const hasPermission = permission ? useCan(permission) : true
  const hasRole = role ? useRole(role) : true

  const canAccess = hasPermission && hasRole

  if (!canAccess) {
    return null
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  )
}

interface PermissionBadgeProps {
  children: ReactNode
  permission?: string
  role?: string | string[]
  className?: string
}

export function PermissionBadge({
  children,
  permission,
  role,
  className = ""
}: PermissionBadgeProps) {
  const hasPermission = permission ? useCan(permission) : true
  const hasRole = role ? useRole(role) : true

  const canAccess = hasPermission && hasRole

  if (!canAccess) {
    return null
  }

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={className}
    >
      {children}
    </motion.span>
  )
}

