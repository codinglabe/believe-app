import { type ReactNode } from 'react'
import { usePage } from '@inertiajs/react'
import type { BreadcrumbItem, PageProps } from '@/types'
import AppLayout from '@/layouts/app-layout'
import FrontendLayout from '@/layouts/frontend/frontend-layout'

const ORG_UNITY_MEET_ROLES = new Set(['organization', 'organization_pending', 'care_alliance'])

function useOrgDashboardShellForUnityMeet(roles: string[] | undefined): boolean {
  if (!roles?.length) {
    return false
  }
  return roles.some((r) => ORG_UNITY_MEET_ROLES.has(r.toLowerCase()))
}

const defaultOrgBreadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Unity Meet Communications', href: '/livestreams/supporter' },
]

/**
 * Supporter Unity Meet routes: use org dashboard shell (sidebar) for organization / pending / care alliance;
 * plain frontend layout for supporter (user) accounts.
 */
export default function UnityMeetLayout({
  children,
  breadcrumbs,
}: {
  children: ReactNode
  breadcrumbs?: BreadcrumbItem[]
}) {
  const { auth } = usePage<PageProps>().props
  const orgShell = useOrgDashboardShellForUnityMeet(auth?.roles)

  if (orgShell) {
    return (
      <AppLayout breadcrumbs={breadcrumbs ?? defaultOrgBreadcrumbs}>
        {children}
      </AppLayout>
    )
  }

  return <FrontendLayout>{children}</FrontendLayout>
}
