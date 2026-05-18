"use client"

import type { ReactNode } from "react"
import { Head } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"

/**
 * Supporter-facing account areas (profile sidebar) vs organization/admin dashboard (AppLayout).
 * `context` should match `Organization::forAuthUser($user) ? 'organization' : 'supporter'` on the server.
 */
export default function AccountContextLayout({
  context,
  title,
  description,
  children,
}: {
  context: "organization" | "supporter"
  title: string
  description?: string
  children: ReactNode
}) {
  const content = (
    <>
      <Head title={title} />
      {children}
    </>
  )

  if (context === "supporter") {
    return (
      <ProfileLayout title={title} description={description}>
        {content}
      </ProfileLayout>
    )
  }

  return <AppLayout>{content}</AppLayout>
}
