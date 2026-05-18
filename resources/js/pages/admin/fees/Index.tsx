"use client"

import React, { useState, FormEvent } from "react"
import { Head, router, usePage } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { DollarSign, Save, AlertCircle, CheckCircle2, FileCheck, ClipboardList } from "lucide-react"
import type { BreadcrumbItem } from "@/types"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Application Fees", href: "#" },
]

interface PageProps {
  fees: {
    form_1023_application_fee: number
    compliance_application_fee: number
  }
  flash?: {
    success?: string
    error?: string
  }
}

export default function AdminFeesIndex({ fees }: PageProps) {
  const { flash } = usePage().props as any
  const [formData, setFormData] = useState({
    form_1023_application_fee: fees.form_1023_application_fee.toString(),
    compliance_application_fee: fees.compliance_application_fee.toString(),
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

    const form1023Fee = parseFloat(formData.form_1023_application_fee)
    const complianceFee = parseFloat(formData.compliance_application_fee)

    if (!formData.form_1023_application_fee || isNaN(form1023Fee) || form1023Fee < 0) {
      newErrors.form_1023_application_fee = "Please enter a valid fee amount (minimum $0)"
    }
    if (form1023Fee > 10000) {
      newErrors.form_1023_application_fee = "Fee cannot exceed $10,000"
    }

    if (!formData.compliance_application_fee || isNaN(complianceFee) || complianceFee < 0) {
      newErrors.compliance_application_fee = "Please enter a valid fee amount (minimum $0)"
    }
    if (complianceFee > 10000) {
      newErrors.compliance_application_fee = "Fee cannot exceed $10,000"
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
      route("admin.fees.update"),
      {
        form_1023_application_fee: parseFloat(formData.form_1023_application_fee),
        compliance_application_fee: parseFloat(formData.compliance_application_fee),
      },
      {
        onSuccess: () => {
          showSuccessToast("Application fees updated successfully")
          setIsSubmitting(false)
        },
        onError: (errors) => {
          setErrors(errors as Record<string, string>)
          showErrorToast("Failed to update fees. Please check the errors.")
          setIsSubmitting(false)
        },
        onFinish: () => {
          setIsSubmitting(false)
        },
      }
    )
  }

  const formatCurrency = (value: string): string => {
    const num = parseFloat(value)
    if (isNaN(num)) return "$0.00"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Application Fees Management" />
      <div className="m-3 md:m-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Application Fees Management</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Manage application fees for Form 1023 and Compliance applications. These fees will be applied to all new application submissions.
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

        {/* Fees Management Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Application Fees
            </CardTitle>
            <CardDescription>
              Set the application fees that will be charged for each type of application submission.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Form 1023 Application Fee */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-4">
                  <FileCheck className="h-5 w-5 text-blue-600" />
                  <Label htmlFor="form_1023_application_fee" className="text-base font-semibold">
                    Form 1023 Application Fee
                  </Label>
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="form_1023_application_fee"
                      type="text"
                      value={formData.form_1023_application_fee}
                      onChange={(e) => handleChange("form_1023_application_fee", e.target.value)}
                      className={cn(
                        "pl-8 h-12 text-lg",
                        errors.form_1023_application_fee && "border-red-500 focus-visible:ring-red-500"
                      )}
                      placeholder="0.00"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.form_1023_application_fee && (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.form_1023_application_fee}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Current fee: <span className="font-semibold">{formatCurrency(formData.form_1023_application_fee)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This fee applies to all Form 1023 tax-exempt status applications.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Compliance Application Fee */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-4">
                  <ClipboardList className="h-5 w-5 text-green-600" />
                  <Label htmlFor="compliance_application_fee" className="text-base font-semibold">
                    Compliance Application Fee
                  </Label>
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="compliance_application_fee"
                      type="text"
                      value={formData.compliance_application_fee}
                      onChange={(e) => handleChange("compliance_application_fee", e.target.value)}
                      className={cn(
                        "pl-8 h-12 text-lg",
                        errors.compliance_application_fee && "border-red-500 focus-visible:ring-red-500"
                      )}
                      placeholder="0.00"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.compliance_application_fee && (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.compliance_application_fee}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Current fee: <span className="font-semibold">{formatCurrency(formData.compliance_application_fee)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This fee applies to all compliance review applications.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[140px]"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <AlertCircle className="h-5 w-5" />
              Important Information
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p>
              • Fee changes will apply to all <strong>new</strong> application submissions after saving.
            </p>
            <p>
              • Existing applications in progress will continue to use their original fee amount.
            </p>
            <p>
              • Fees must be between $0.00 and $10,000.00.
            </p>
            <p>
              • Changes take effect immediately after saving.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

