 "use client"

import { type ReactNode } from "react"
import { usePage } from "@inertiajs/react"
import UnityMeetShellLayout from "@/layouts/UnityMeetShellLayout"
import AppLayout from "@/layouts/app-layout"

export default function UnityMeetLayout({
  children,
}: {
  children: ReactNode
}) {
  const page = usePage<{ auth?: { roles?: string[] } }>()
  const roles = page.props.auth?.roles ?? []
  const roleSet = new Set(roles.map((r) => (r ?? "").toLowerCase()))

  // Normal users use the Unity Meet shell (mock sidebar + frontend chrome).
  // Organization/care alliance/admin users see Unity Meet within the dashboard (AppLayout).
  const useDashboardLayout =
    roleSet.has("organization") ||
    roleSet.has("organization_pending") ||
    roleSet.has("care_alliance") ||
    roleSet.has("admin")

  if (useDashboardLayout) {
    return (
      <AppLayout>
        <div className="w-full">{children}</div>
      </AppLayout>
    )
  }

  return <UnityMeetShellLayout>{children}</UnityMeetShellLayout>
}
