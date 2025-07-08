"use client"

import { useRef, type FormEventHandler } from "react"
import { useForm } from "@inertiajs/react"
import { Transition } from "@headlessui/react"
import SettingsLayout from "@/layouts/settings/layout"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Alert, AlertDescription } from "@/components/frontend/ui/alert"
import { Lock, Eye, EyeOff, Shield, CheckCircle } from "lucide-react"
import InputError from "@/components/input-error"
import { useState } from "react"

export default function UpdatePasswordForm() {
  const passwordInput = useRef<HTMLInputElement>(null)
  const currentPasswordInput = useRef<HTMLInputElement>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
    current_password: "",
    password: "",
    password_confirmation: "",
  })

  const updatePassword: FormEventHandler = (e) => {
    e.preventDefault()

    put(route("password.update"), {
      preserveScroll: true,
      onSuccess: () => reset(),
      onError: (errors) => {
        if (errors.password) {
          reset("password", "password_confirmation")
          passwordInput.current?.focus()
        }

        if (errors.current_password) {
          reset("current_password")
          currentPasswordInput.current?.focus()
        }
      },
    })
  }

  return (
    <SettingsLayout activeTab="password">
      <div className="space-y-6">
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

        <form onSubmit={updatePassword} className="space-y-6">
          {/* Password Security */}
          <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-red-500" />
                Change Password
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Ensure your account is using a long, random password to stay secure.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Password */}
              <div>
                <Label htmlFor="current_password" className="text-gray-900 dark:text-white font-medium">
                  Current Password *
                </Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="current_password"
                    ref={currentPasswordInput}
                    value={data.current_password}
                    onChange={(e) => setData("current_password", e.target.value)}
                    type={showCurrentPassword ? "text" : "password"}
                    className="pl-10 pr-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your current password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <InputError message={errors.current_password} className="mt-1" />
              </div>

              {/* New Password */}
              <div>
                <Label htmlFor="password" className="text-gray-900 dark:text-white font-medium">
                  New Password *
                </Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    ref={passwordInput}
                    value={data.password}
                    onChange={(e) => setData("password", e.target.value)}
                    type={showNewPassword ? "text" : "password"}
                    className="pl-10 pr-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <InputError message={errors.password} className="mt-1" />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Password must be at least 8 characters long and contain a mix of letters, numbers, and symbols.
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <Label htmlFor="password_confirmation" className="text-gray-900 dark:text-white font-medium">
                  Confirm New Password *
                </Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password_confirmation"
                    value={data.password_confirmation}
                    onChange={(e) => setData("password_confirmation", e.target.value)}
                    type={showConfirmPassword ? "text" : "password"}
                    className="pl-10 pr-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Confirm your new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <InputError message={errors.password_confirmation} className="mt-1" />
              </div>
            </CardContent>
          </Card>

          {/* Security Tips */}
          {/* <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Password Security Tips</h3>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Use at least 8 characters with a mix of letters, numbers, and symbols</li>
                    <li>• Avoid using personal information like names or birthdays</li>
                    <li>• Don't reuse passwords from other accounts</li>
                    <li>• Consider using a password manager for better security</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card> */}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={processing} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2">
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Update Password
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </SettingsLayout>
  )
}
