"use client"

import { motion } from "framer-motion"
import { Shield, ArrowLeft, Home, AlertTriangle, Lock } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Link, router } from "@inertiajs/react"
import { usePage } from "@inertiajs/react"

interface PageProps {
  permission?: string
  userRole?: string
  requiredPermission?: string
  requiredRoles?: string[]
  backUrl?: string
  errorMessage?: string
  [key: string]: any
}

export default function PermissionDenied() {
  const { permission, userRole, requiredPermission, requiredRoles, backUrl, errorMessage } = usePage<PageProps>().props

  const getPermissionMessage = () => {
    if (errorMessage) {
      return errorMessage
    }
    if (requiredRoles && requiredRoles.length > 0) {
      return `You need one of these roles: ${requiredRoles.join(', ')}`
    }
    if (requiredPermission) {
      return `You need the "${requiredPermission}" permission`
    }
    return "You don't have permission to access this resource"
  }

  const getRoleDisplayName = (role: string) => {
    const roleNames: Record<string, string> = {
      'admin': 'Administrator',
      'organization': 'Organization',
      'user': 'User'
    }
    return roleNames[role] || role
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-red-900/20 dark:via-orange-900/20 dark:to-yellow-900/20 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="bg-white dark:bg-gray-900 border-red-200 dark:border-red-800 shadow-2xl">
          <CardHeader className="text-center pb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-6"
            >
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <Shield className="w-12 h-12 text-white" />
                </div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center"
                >
                  <Lock className="w-4 h-4 text-yellow-800" />
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Access Denied
              </CardTitle>
              <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
                {getPermissionMessage()}
              </CardDescription>
            </motion.div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Current User Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Current Role: {getRoleDisplayName(userRole || 'Unknown')}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your current role doesn't have the required permissions
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Permission Details */}
            {(requiredPermission || requiredRoles) && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800"
              >
                <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">
                  Required Access:
                </h4>
                {requiredPermission && (
                  <p className="text-red-700 dark:text-red-400">
                    <span className="font-mono bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded">
                      {requiredPermission}
                    </span>
                  </p>
                )}
                {requiredRoles && requiredRoles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {requiredRoles.map((role) => (
                      <span
                        key={role}
                        className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {getRoleDisplayName(role)}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="flex flex-col sm:flex-row gap-3 pt-4"
            >
              {backUrl && (
                <Button
                  variant="outline"
                  onClick={() => router.visit(backUrl)}
                  className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Go Back
                </Button>
              )}
              
              <Button
                onClick={() => router.visit('/dashboard')}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Home className="w-4 h-4" />
                Go to Dashboard
              </Button>
            </motion.div>

            {/* Help Text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="text-center pt-4 border-t border-gray-200 dark:border-gray-700"
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">
                If you believe this is an error, please contact your administrator.
              </p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
