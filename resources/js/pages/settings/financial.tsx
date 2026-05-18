"use client"

import { Link } from "@inertiajs/react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent } from "@/components/frontend/ui/card"
import CareAllianceFinancialSettingsSection, {
  type CareAllianceFinancialPayload,
} from "@/components/settings/CareAllianceFinancialSettingsSection"
import SettingsLayout from "@/layouts/settings/layout"
import { Landmark } from "lucide-react"

export default function FinancialSettingsPage({
  hasAlliance,
  careAllianceFinancial,
  allianceDisplayName,
}: {
  hasAlliance: boolean
  careAllianceFinancial: CareAllianceFinancialPayload | null
  allianceDisplayName: string
}) {
  return (
    <SettingsLayout
      activeTab="financial"
      settingsBranding="alliance"
      pageTitle="Financial Settings"
      pageSubtitle="Configure how general (non-campaign) donations are split between your alliance and member organizations."
    >
      <div className="space-y-6">
        {!hasAlliance && (
          <Card className="border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/40">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <Landmark className="h-10 w-10 shrink-0 text-amber-700 dark:text-amber-400" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Create your Care Alliance first
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Complete your alliance profile, then you can configure how general (non-campaign) donations are
                    split among members.
                  </p>
                </div>
              </div>
              <Button asChild className="shrink-0">
                <Link href={route("profile.edit")}>Go to Alliance Settings</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {hasAlliance && careAllianceFinancial && (
          <CareAllianceFinancialSettingsSection
            allianceDisplayName={allianceDisplayName?.trim() || "Your alliance"}
            financial={careAllianceFinancial}
          />
        )}
      </div>
    </SettingsLayout>
  )
}
