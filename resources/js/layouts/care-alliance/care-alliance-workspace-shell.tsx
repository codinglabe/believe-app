"use client"

import type { ReactNode } from "react"
import AppLayout from "@/layouts/app-layout"
import type { BreadcrumbItem } from "@/types"

export type CareAllianceWorkspaceSection = "members" | "campaigns"

const DEFAULT_WORKSPACE_HREF = "/care-alliance/workspace/members"

const SECTION_META: Record<CareAllianceWorkspaceSection, { title: string; href: string }> = {
  members: { title: "Members", href: "/care-alliance/workspace/members" },
  campaigns: { title: "Campaigns", href: "/care-alliance/workspace/campaigns" },
}

export default function CareAllianceWorkspaceShell({
  allianceName,
  section,
  children,
}: {
  allianceName: string
  section: CareAllianceWorkspaceSection
  children: ReactNode
}) {
  const meta = SECTION_META[section]

  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Care Alliance", href: DEFAULT_WORKSPACE_HREF },
    { title: meta.title, href: meta.href },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="flex w-full min-w-0 flex-col gap-6 px-3 py-4 md:px-6 md:py-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{allianceName}</h1>
          <p className="text-muted-foreground text-sm">Care Alliance</p>
        </div>
        <div className="flex min-w-0 flex-col gap-6">{children}</div>
      </div>
    </AppLayout>
  )
}
