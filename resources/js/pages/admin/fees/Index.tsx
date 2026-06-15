"use client"

import React, { useMemo, useState, FormEvent } from "react"
import { Head, router, usePage } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  FileCheck,
  Info,
  Save,
} from "lucide-react"
import type { BreadcrumbItem } from "@/types"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Application Fees", href: "#" },
]

type FeeForm = {
  form_1023_application_fee: string
  form_1023_ez_application_fee: string
  form_1023_processing_filing_fee: string
  form_1023_ez_processing_filing_fee: string
  compliance_application_fee: string
}

interface PageProps {
  fees: {
    form_1023_application_fee: number
    form_1023_ez_application_fee: number
    form_1023_processing_filing_fee: number
    form_1023_ez_processing_filing_fee: number
    compliance_application_fee: number
  }
  flash?: {
    success?: string
    error?: string
  }
}

const feeFields: Array<{
  key: keyof FeeForm
  label: string
  helper: string
}> = [
  {
    key: "form_1023_application_fee",
    label: "Form 1023 application fee",
    helper: "IRS application fee charged when the organization selects Form 1023.",
  },
  {
    key: "form_1023_ez_application_fee",
    label: "Form 1023-EZ application fee",
    helper: "IRS application fee charged when the organization selects Form 1023-EZ.",
  },
  {
    key: "form_1023_processing_filing_fee",
    label: "Processing filing fee (Form 1023)",
    helper: "501c3ers processing fee paired with Form 1023 applications.",
  },
  {
    key: "form_1023_ez_processing_filing_fee",
    label: "Processing filing fee (Form 1023-EZ)",
    helper: "501c3ers processing fee paired with Form 1023-EZ applications.",
  },
  {
    key: "compliance_application_fee",
    label: "Compliance application fee",
    helper: "Fee for compliance review applications (separate from Form 1023 filing).",
  },
]

export default function AdminFeesIndex({ fees }: PageProps) {
  const { flash } = usePage().props as PageProps
  const [formData, setFormData] = useState<FeeForm>({
    form_1023_application_fee: fees.form_1023_application_fee.toString(),
    form_1023_ez_application_fee: fees.form_1023_ez_application_fee.toString(),
    form_1023_processing_filing_fee: fees.form_1023_processing_filing_fee.toString(),
    form_1023_ez_processing_filing_fee: fees.form_1023_ez_processing_filing_fee.toString(),
    compliance_application_fee: fees.compliance_application_fee.toString(),
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const totals = useMemo(() => {
    const standardApp = parseFloat(formData.form_1023_application_fee) || 0
    const standardProcessing = parseFloat(formData.form_1023_processing_filing_fee) || 0
    const ezApp = parseFloat(formData.form_1023_ez_application_fee) || 0
    const ezProcessing = parseFloat(formData.form_1023_ez_processing_filing_fee) || 0

    return {
      standard: standardApp + standardProcessing,
      ez: ezApp + ezProcessing,
    }
  }, [formData])

  const handleChange = (field: keyof FeeForm, value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, "")
    const parts = numericValue.split(".")
    const formattedValue =
      parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : numericValue

    setFormData((prev) => ({ ...prev, [field]: formattedValue }))

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const validateForm = (): boolean => {
    const nextErrors: Record<string, string> = {}

    feeFields.forEach(({ key }) => {
      const amount = parseFloat(formData[key])
      if (!formData[key] || Number.isNaN(amount) || amount < 0) {
        nextErrors[key] = "Please enter a valid fee amount (minimum $0)"
      } else if (amount > 10000) {
        nextErrors[key] = "Fee cannot exceed $10,000"
      }
    })

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
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
        form_1023_ez_application_fee: parseFloat(formData.form_1023_ez_application_fee),
        form_1023_processing_filing_fee: parseFloat(formData.form_1023_processing_filing_fee),
        form_1023_ez_processing_filing_fee: parseFloat(formData.form_1023_ez_processing_filing_fee),
        compliance_application_fee: parseFloat(formData.compliance_application_fee),
      },
      {
        onSuccess: () => showSuccessToast("Application fees updated successfully"),
        onError: (errs) => {
          setErrors(errs as Record<string, string>)
          showErrorToast("Failed to update fees. Please check the errors.")
        },
        onFinish: () => setIsSubmitting(false),
      }
    )
  }

  const formatCurrency = (value: string | number): string => {
    const num = typeof value === "number" ? value : parseFloat(value)
    if (Number.isNaN(num)) return "$0.00"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  }

  const renderFeeInput = (field: (typeof feeFields)[number]) => (
    <div key={field.key} className="space-y-2">
      <Label htmlFor={field.key} className="text-sm font-semibold">
        {field.label}
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
        <Input
          id={field.key}
          type="text"
          value={formData[field.key]}
          onChange={(e) => handleChange(field.key, e.target.value)}
          className={cn("pl-8 h-11", errors[field.key] && "border-red-500 focus-visible:ring-red-500")}
          placeholder="0.00"
          disabled={isSubmitting}
        />
      </div>
      {errors[field.key] ? (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {errors[field.key]}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{field.helper}</p>
      )}
    </div>
  )

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Application Fees Management" />
      <div className="m-3 md:m-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Application Fees Management</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
            Set application-wise pricing for Form 1023 and Form 1023-EZ. Each form has its own IRS application fee and
            501c3ers processing filing fee. Organizations pay the combined total at checkout.
          </p>
        </div>

        {flash?.success && (
          <Alert className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-800 dark:text-emerald-200">{flash.success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-blue-600" />
                1. Form 1023 fees
              </CardTitle>
              <CardDescription>
                For organizations that do not qualify for Form 1023-EZ.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              {renderFeeInput(feeFields[0])}
              {renderFeeInput(feeFields[2])}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-purple-600" />
                2. Form 1023-EZ fees
              </CardTitle>
              <CardDescription>
                For smaller organizations that qualify for the streamlined Form 1023-EZ.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              {renderFeeInput(feeFields[1])}
              {renderFeeInput(feeFields[3])}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-green-600" />
                3. Compliance application fee
              </CardTitle>
              <CardDescription>Separate from Form 1023 filing — used for compliance review applications.</CardDescription>
            </CardHeader>
            <CardContent className="max-w-md">{renderFeeInput(feeFields[4])}</CardContent>
          </Card>

          <Card className="border-blue-200/80 dark:border-blue-800/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Fee summary preview
              </CardTitle>
              <CardDescription>What organizations will see when they choose a form type.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="px-4 py-2 text-muted-foreground">Application fee (Form 1023)</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(formData.form_1023_application_fee)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2 text-muted-foreground">Processing filing fee (Form 1023)</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(formData.form_1023_processing_filing_fee)}</td>
                    </tr>
                    <tr className="border-b bg-muted/30">
                      <td className="px-4 py-3 font-semibold">Total fees (Form 1023)</td>
                      <td className="px-4 py-3 text-right text-lg font-bold text-blue-700 dark:text-blue-300">
                        {formatCurrency(totals.standard)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-muted-foreground">Application fee (Form 1023-EZ)</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(formData.form_1023_ez_application_fee)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-muted-foreground">Processing filing fee (Form 1023-EZ)</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(formData.form_1023_ez_processing_filing_fee)}</td>
                    </tr>
                    <tr className="bg-muted/30">
                      <td className="px-4 py-3 font-semibold">Total fees (Form 1023-EZ)</td>
                      <td className="px-4 py-3 text-right text-lg font-bold text-blue-700 dark:text-blue-300">
                        {formatCurrency(totals.ez)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 dark:text-blue-100">
                  Fee amounts shown reflect current admin settings. Review and update as needed before continuing.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} size="lg" className="min-w-[160px]">
              {isSubmitting ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save changes
                </>
              )}
            </Button>
          </div>
        </form>

        <Card className="bg-muted/40">
          <CardHeader>
            <CardTitle className="text-base">Important</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Fee changes apply to new Form 1023 submissions after saving.</p>
            <p>Applications already in progress keep the amount stored on the application record.</p>
            <p>Each fee must be between $0.00 and $10,000.00.</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
