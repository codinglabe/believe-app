"use client"

import React, { useState, FormEvent } from "react"
import { Head, router, usePage } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Gift, Save, AlertCircle, CheckCircle2, Clock } from "lucide-react"
import type { BreadcrumbItem } from "@/types"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Reward Point Management", href: "#" },
]

interface PageProps {
  rewardSettings: {
    hourly_reward_points: number
  }
  flash?: {
    success?: string
    error?: string
  }
}

export default function AdminRewardPointsIndex({ rewardSettings }: PageProps) {
  const { flash } = usePage().props as any
  const [formData, setFormData] = useState({
    hourly_reward_points: rewardSettings.hourly_reward_points.toString(),
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (field: string, value: string) => {
    // Allow only numbers and one decimal point
    const numericValue = value.replace(/[^0-9.]/g, '')
    // Ensure only one decimal point
    const parts = numericValue.split('.')
    const formattedValue = parts.length > 2 
      ? parts[0] + '.' + parts.slice(1).join('') 
      : numericValue

    setFormData(prev => ({
      ...prev,
      [field]: formattedValue
    }))
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    const hourlyReward = parseFloat(formData.hourly_reward_points)

    if (!formData.hourly_reward_points || isNaN(hourlyReward) || hourlyReward < 0) {
      newErrors.hourly_reward_points = "Please enter a valid reward point amount (minimum 0)"
    }
    if (hourlyReward > 10000) {
      newErrors.hourly_reward_points = "Reward points cannot exceed 10,000 per hour"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      showErrorToast("Please fix the errors before submitting")
      return
    }

    setIsSubmitting(true)

    router.put(
      route("admin.reward-points.update"),
      {
        hourly_reward_points: parseFloat(formData.hourly_reward_points),
      },
      {
        onSuccess: () => {
          showSuccessToast("Reward point settings updated successfully")
          setIsSubmitting(false)
        },
        onError: (errors) => {
          setErrors(errors as Record<string, string>)
          showErrorToast("Failed to update reward point settings. Please check the errors.")
          setIsSubmitting(false)
        },
        onFinish: () => {
          setIsSubmitting(false)
        },
      }
    )
  }

  const formatPoints = (value: string): string => {
    const num = parseFloat(value)
    if (isNaN(num)) return "0"
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num)
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Reward Point Management" />
      <div className="m-3 md:m-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reward Point Management</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Configure hourly reward points for volunteer work. Volunteers will earn reward points based on the hours they work.
          </p>
        </div>

        {/* Success/Error Messages */}
        {flash?.success && (
          <Alert className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-800 dark:text-emerald-200">
              {flash.success}
            </AlertDescription>
          </Alert>
        )}

        {flash?.error && (
          <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              {flash.error}
            </AlertDescription>
          </Alert>
        )}

        {/* Reward Points Management Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Volunteer Reward Points
            </CardTitle>
            <CardDescription>
              Set the reward points that volunteers will earn per hour of work. This rate will be applied to all volunteer timesheet entries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Hourly Reward Points */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <Label htmlFor="hourly_reward_points" className="text-base font-semibold">
                    Reward Points Per Hour
                  </Label>
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      id="hourly_reward_points"
                      type="text"
                      value={formData.hourly_reward_points}
                      onChange={(e) => handleChange("hourly_reward_points", e.target.value)}
                      className={cn(
                        "h-12 text-lg",
                        errors.hourly_reward_points && "border-red-500 focus-visible:ring-red-500"
                      )}
                      placeholder="0"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.hourly_reward_points && (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.hourly_reward_points}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Current rate: <span className="font-semibold">{formatPoints(formData.hourly_reward_points)} points per hour</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Example: If set to 10 points/hour, a volunteer working 5 hours will earn 50 reward points.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Information Section */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  How It Works
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                  <li>Reward points are calculated automatically based on volunteer hours logged in timesheets</li>
                  <li>The hourly rate you set here applies to all volunteer work</li>
                  <li>Points are awarded when organizations log volunteer hours in the time sheet system</li>
                  <li>Volunteers can view their earned reward points in their profile</li>
                </ul>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

