"use client"

import React, { useState, FormEvent } from "react"
import { Head, router, usePage } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/admin/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Gift, Save, AlertCircle, CheckCircle2, Users, DollarSign } from "lucide-react"
import type { BreadcrumbItem } from "@/types"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "BRP Participation Rewards", href: "#" },
]

interface ParticipationModule {
  module: string
  label: string
  rule: string
  enabled: boolean
  free_award: number
  prime_award: number
  money_moves: boolean
  category: "money_movement" | "participation"
}

interface PageProps {
  participationModules: ParticipationModule[]
  volunteerHourlyLegacyRate: number
  flash?: {
    success?: string
    error?: string
  }
}

export default function AdminRewardPointsIndex({
  participationModules,
  volunteerHourlyLegacyRate,
}: PageProps) {
  const { flash } = usePage().props as any
  const [modules, setModules] = useState<ParticipationModule[]>(participationModules)
  const [legacyHourlyRate, setLegacyHourlyRate] = useState(
    volunteerHourlyLegacyRate.toString()
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateModule = (
    index: number,
    field: keyof ParticipationModule,
    value: string | boolean
  ) => {
    setModules((prev) => {
      const next = [...prev]
      const updated = { ...next[index], [field]: value }
      if (field === "money_moves") {
        updated.category = value ? "money_movement" : "participation"
      }
      next[index] = updated
      return next
    })
  }

  const handleAwardChange = (index: number, tier: "free_award" | "prime_award", value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, "")
    const parts = numericValue.split(".")
    const formattedValue =
      parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : numericValue
    updateModule(index, tier, formattedValue)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    modules.forEach((mod) => {
      const free = parseFloat(String(mod.free_award))
      const prime = parseFloat(String(mod.prime_award))

      if (isNaN(free) || free < 0) {
        newErrors[`${mod.module}.free_award`] = "Enter a valid Free member BRP amount"
      }
      if (isNaN(prime) || prime < 0) {
        newErrors[`${mod.module}.prime_award`] = "Enter a valid Prime member BRP amount"
      }
    })

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

    const modulesPayload: Record<
      string,
      { enabled: boolean; free_award: number; prime_award: number; money_moves: boolean }
    > = {}
    modules.forEach((mod) => {
      modulesPayload[mod.module] = {
        enabled: mod.enabled,
        free_award: parseFloat(String(mod.free_award)) || 0,
        prime_award: parseFloat(String(mod.prime_award)) || 0,
        money_moves: mod.money_moves,
      }
    })

    router.put(
      route("admin.reward-points.update"),
      {
        modules: modulesPayload,
        volunteer_hourly_legacy_rate: parseFloat(legacyHourlyRate) || 0,
      },
      {
        onSuccess: () => {
          showSuccessToast("BRP participation settings updated successfully")
          setIsSubmitting(false)
        },
        onError: (errs) => {
          setErrors(errs as Record<string, string>)
          showErrorToast("Failed to update settings. Please check the errors.")
          setIsSubmitting(false)
        },
        onFinish: () => setIsSubmitting(false),
      }
    )
  }

  const moneyModules = modules.filter((m) => m.money_moves)
  const participationModulesOnly = modules.filter((m) => !m.money_moves)

  const renderModuleRows = (rows: ParticipationModule[]) =>
    rows.map((mod) => {
      const index = modules.findIndex((m) => m.module === mod.module)
      return (
        <tr key={mod.module} className="border-b last:border-0">
          <td className="p-3 align-top font-medium">{mod.label}</td>
          <td className="p-3 align-top text-muted-foreground">{mod.rule}</td>
          <td className="p-3 align-top">
            <Switch
              checked={mod.money_moves}
              onCheckedChange={(checked) => updateModule(index, "money_moves", checked)}
              disabled={isSubmitting}
            />
          </td>
          <td className="p-3 align-top">
            <Switch
              checked={mod.enabled}
              onCheckedChange={(checked) => updateModule(index, "enabled", checked)}
              disabled={isSubmitting}
            />
          </td>
          <td className="p-3 align-top">
            <Input
              type="text"
              value={String(mod.free_award)}
              onChange={(e) => handleAwardChange(index, "free_award", e.target.value)}
              disabled={isSubmitting || !mod.enabled}
              className={cn("h-9", errors[`${mod.module}.free_award`] && "border-red-500")}
            />
          </td>
          <td className="p-3 align-top">
            <Input
              type="text"
              value={String(mod.prime_award)}
              onChange={(e) => handleAwardChange(index, "prime_award", e.target.value)}
              disabled={isSubmitting || !mod.enabled}
              className={cn("h-9", errors[`${mod.module}.prime_award`] && "border-red-500")}
            />
          </td>
        </tr>
      )
    })

  const tableHeader = (
    <thead>
      <tr className="border-b bg-muted/40 text-left">
        <th className="p-3 font-semibold min-w-[180px]">Module</th>
        <th className="p-3 font-semibold min-w-[200px]">Rule</th>
        <th className="p-3 font-semibold w-[110px]">Money Moves?</th>
        <th className="p-3 font-semibold w-[90px]">Enabled</th>
        <th className="p-3 font-semibold w-[100px]">Free BRP</th>
        <th className="p-3 font-semibold w-[100px]">Prime BRP</th>
      </tr>
    </thead>
  )

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="BRP Participation Rewards" />
      <div className="m-3 md:m-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            BRP Participation Rewards
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
            Configure flat Believe Reward Points (BRP) per qualifying activity. Use{" "}
            <strong>Money Moves?</strong> to separate financial settlement from community
            participation — making reporting and auditing easier.
          </p>
        </div>

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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Participation Reward Matrix
            </CardTitle>
            <CardDescription>
              Set Free and Prime BRP amounts for each module. Toggle Money Moves? to classify
              activities for ledger reporting.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold">Money Movement</h3>
                  <Badge variant="outline" className="text-xs">
                    {moneyModules.length} modules
                  </Badge>
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    {tableHeader}
                    <tbody>{renderModuleRows(moneyModules)}</tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-semibold">Participation</h3>
                  <Badge variant="outline" className="text-xs">
                    {participationModulesOnly.length} modules
                  </Badge>
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    {tableHeader}
                    <tbody>{renderModuleRows(participationModulesOnly)}</tbody>
                  </table>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Two clear categories
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                  <li>
                    <strong>Money Movement</strong> — donations, BP purchases, marketplace, gift
                    cards, paid courses & events
                  </li>
                  <li>
                    <strong>Participation</strong> — volunteering, referrals, follows, learning,
                    Unity Live/Meet, profile completion, daily login
                  </li>
                  <li>One flat reward per qualifying action — not based on dollar amount</li>
                </ul>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="legacy_hourly">Legacy volunteer hourly BRP (deprecated)</Label>
                <Input
                  id="legacy_hourly"
                  type="text"
                  value={legacyHourlyRate}
                  onChange={(e) => setLegacyHourlyRate(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="max-w-xs h-10"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
                  {isSubmitting ? (
                    <>Saving...</>
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
