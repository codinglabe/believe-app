"use client"

import type React from "react"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { useState } from "react"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Save, X, Eye, EyeOff, Lock, CheckCircle } from "lucide-react"
import { useForm } from "@inertiajs/react"
import { toast } from "sonner"
import { Transition } from "@headlessui/react"
import { Alert, AlertDescription } from "@/components/frontend/ui/alert"

export default function ChangePassword() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const { data, setData, put, processing, errors, reset, recentlySuccessful } = useForm({
    current_password: "",
    password: "",
    password_confirmation: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

      put(route("password.update"), {
          preserveScroll: true,
          preserveState: true,
      onSuccess: () => {
        toast.success("Password changed successfully!")
        reset()
      },
      onError: () => {
        toast.error("Failed to change password. Please check your current password.")
      },
    })
  }

  const handleCancel = () => {
    reset()
    window.history.back()
  }

  return (
    <ProfileLayout title="Change Password" description="Update your account password for security">
      <div className="max-w-full">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-4">
            <CardTitle className="text-gray-900 dark:text-white text-lg flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Password Security
            </CardTitle>
          </CardHeader>
          <CardContent>
        {/* Success Message */}
        <Transition
          show={recentlySuccessful}
          enter="transition ease-in-out"
          enterFrom="opacity-0"
          leave="transition ease-in-out"
          leaveTo="opacity-0"
        >
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              Password updated successfully!
            </AlertDescription>
          </Alert>
        </Transition>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Current Password */}
              <div>
                <Label htmlFor="current_password" className="text-gray-900 dark:text-white">
                  Current Password *
                </Label>
                <div className="relative">
                  <Input
                    id="current_password"
                    type={showCurrentPassword ? "text" : "password"}
                    value={data.current_password}
                    onChange={(e) => setData("current_password", e.target.value)}
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                {errors.current_password && <p className="text-red-600 text-sm mt-1">{errors.current_password}</p>}
              </div>

              {/* New Password */}
              <div>
                <Label htmlFor="password" className="text-gray-900 dark:text-white">
                  New Password *
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showNewPassword ? "text" : "password"}
                    value={data.password}
                    onChange={(e) => setData("password", e.target.value)}
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password}</p>}
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Password must be at least 8 characters long
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <Label htmlFor="password_confirmation" className="text-gray-900 dark:text-white">
                  Confirm New Password *
                </Label>
                <div className="relative">
                  <Input
                    id="password_confirmation"
                    type={showConfirmPassword ? "text" : "password"}
                    value={data.password_confirmation}
                    onChange={(e) => setData("password_confirmation", e.target.value)}
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                {errors.password_confirmation && (
                  <p className="text-red-600 text-sm mt-1">{errors.password_confirmation}</p>
                )}
              </div>

              {/* Security Tips */}
              {/* <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Password Security Tips:</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Use at least 8 characters</li>
                  <li>• Include uppercase and lowercase letters</li>
                  <li>• Add numbers and special characters</li>
                  <li>• Avoid common words or personal information</li>
                </ul>
              </div> */}

              {/* Action Buttons */}
              <div className="flex gap-4 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={processing}
                  className="bg-transparent"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="h-4 w-4 mr-2" />
                  {processing ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ProfileLayout>
  )
}
