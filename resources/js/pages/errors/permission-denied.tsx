"use client"

import { motion } from "framer-motion"
import { ArrowLeft, Home, Lock, Settings, User } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { router, usePage } from "@inertiajs/react"

interface PageProps {
  permission?: string
  userRole?: string
  userRoles?: string[]
  userPermissions?: string[]
  requiredPermission?: string
  requiredRoles?: string[]
  backUrl?: string
  errorMessage?: string
  auth?: {
    user?: {
      id: number
      role: string
      name?: string
      email?: string
    } | null
    roles?: string[]
    permissions?: string[]
  }
  [key: string]: any
}

export default function PermissionDenied() {
  const pageProps = usePage<PageProps>().props
  const { permission, userRole, userRoles = [], userPermissions = [], requiredPermission, requiredRoles, backUrl, errorMessage } = pageProps
  const auth = pageProps.auth || (pageProps as any).auth

  // Determine which buttons to show based on user role
  const getAvailableButtons = () => {
    const buttons = []
    const currentRole = userRole || auth?.user?.role

    // Get role-specific home/back URL
    const getRoleBackUrl = () => {
      if (currentRole === 'admin') {
        return '/dashboard'
      } else if (currentRole === 'organization' || currentRole === 'organization_pending') {
        return '/dashboard'
      } else if (currentRole === 'merchant') {
        return '/merchant/dashboard'
      } else if (currentRole === 'livestock') {
        return '/seller/dashboard'
      } else if (currentRole === 'user') {
        return '/profile'
      }
      return '/'
    }

    // Go Back button - always use role-specific URL to ensure it works
    const roleBackUrl = getRoleBackUrl()
    let finalBackUrl = roleBackUrl
    
    if (backUrl) {
      const isSafeBackUrl = backUrl && 
        !backUrl.includes('/errors/') && 
        !backUrl.includes('permission-denied') &&
        backUrl !== window.location.pathname
      
      if (isSafeBackUrl) {
        if (currentRole === 'user') {
          if (backUrl.includes('/profile') || backUrl === '/') {
            finalBackUrl = backUrl
          } else {
            finalBackUrl = roleBackUrl
          }
        } else if (currentRole === 'merchant') {
          if (backUrl.includes('/merchant/') || backUrl === '/') {
            finalBackUrl = backUrl
          } else {
            finalBackUrl = roleBackUrl
          }
        } else {
          finalBackUrl = backUrl
        }
      }
    }
    
    buttons.push({
      label: 'Go Back',
      icon: ArrowLeft,
      variant: 'outline' as const,
      onClick: () => router.visit(finalBackUrl),
      className: 'flex items-center gap-2 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 transition-all duration-200 px-6 py-3'
    })

    // Show role-specific buttons for authenticated users
    if (auth?.user) {
      if (currentRole === 'admin') {
        buttons.push({
          label: 'Admin Dashboard',
          icon: Settings,
          variant: 'default' as const,
          onClick: () => router.visit('/dashboard'),
          className: 'flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3'
        })
      } else if (currentRole === 'organization' || currentRole === 'organization_pending') {
        buttons.push({
          label: 'Organization Dashboard',
          icon: Home,
          variant: 'default' as const,
          onClick: () => router.visit('/dashboard'),
          className: 'flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3'
        })
      } else if (currentRole === 'merchant') {
        buttons.push({
          label: 'Merchant Dashboard',
          icon: Home,
          variant: 'default' as const,
          onClick: () => router.visit('/merchant/dashboard'),
          className: 'flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3'
        })
      } else if (currentRole === 'livestock') {
        buttons.push({
          label: 'Livestock Dashboard',
          icon: Home,
          variant: 'default' as const,
          onClick: () => router.visit('/seller/dashboard'),
          className: 'flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3'
        })
      } else if (currentRole === 'user') {
        buttons.push({
          label: 'My Profile',
          icon: User,
          variant: 'default' as const,
          onClick: () => router.visit('/profile'),
          className: 'flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3'
        })
      } else {
        buttons.push({
          label: 'Dashboard',
          icon: Home,
          variant: 'default' as const,
          onClick: () => router.visit('/dashboard'),
          className: 'flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3'
        })
      }
    } else {
      buttons.push({
        label: 'Sign In',
        icon: Lock,
        variant: 'default' as const,
        onClick: () => router.visit('/login'),
        className: 'flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3'
      })
      buttons.push({
        label: 'Create Account',
        icon: User,
        variant: 'outline' as const,
        onClick: () => router.visit('/register'),
        className: 'flex items-center gap-2 border-2 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900/20 transition-all duration-200 px-6 py-3'
      })
    }

    return buttons
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-4xl flex flex-col items-center"
      >
        {/* Image Section */}
        <motion.div
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex items-center justify-center p-8 md:p-12 w-full"
        >
          <img 
            src="/images/permissin-denied.png" 
            alt="Access Denied" 
            className="w-full max-w-2xl h-auto object-contain"
          />
        </motion.div>

        {/* Content Section */}
        <div className="w-full text-center">
          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8"
          >
            {getAvailableButtons().map((button, index) => {
              const Icon = button.icon
              return (
                <Button
                  key={index}
                  variant={button.variant}
                  onClick={button.onClick}
                  className={button.className}
                  size="lg"
                >
                  <Icon className="w-5 h-5" />
                  {button.label}
                </Button>
              )
            })}
          </motion.div>

          {/* Help Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="pt-6 border-t border-gray-200 dark:border-gray-700"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">
              If you believe this is an error, please contact your administrator for assistance.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
