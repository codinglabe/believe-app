"use client"

import SettingsLayout from "@/layouts/settings/layout"
import {
  OrganizationDonateWidgetEmbed,
  type DonateWidgetEmbedProps,
} from "@/components/organization-donate-widget-embed"

export default function DonateWidgetSettings({
  donateWidget,
}: {
  donateWidget: DonateWidgetEmbedProps
}) {
  return (
    <SettingsLayout
      activeTab="donate-widget"
      pageTitle="Donation Widget"
      pageSubtitle="Preview and copy the BelieveCash embed code for your organization's website."
    >
      <OrganizationDonateWidgetEmbed {...donateWidget} />
    </SettingsLayout>
  )
}
