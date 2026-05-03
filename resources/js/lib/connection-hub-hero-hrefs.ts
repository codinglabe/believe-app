/**
 * Connection Hub hero secondary actions (Teach / My Learning, Create / My Events).
 * Organization accounts use admin courses & events; supporters use public create + enrollments.
 */
export type ConnectionHubAuthUser = {
  id: number
  role?: string
  slug?: string | null
  organization?: { public_view_slug?: string | number | null } | null
  care_alliance?: { slug?: string | null } | null
}

export type ConnectionHubAuth = {
  user?: ConnectionHubAuthUser
  roles?: string[]
}

function isOrganizationUser(user: ConnectionHubAuthUser): boolean {
  return user.role === "organization" || user.role === "organization_pending"
}

/** Logged-in “teach / create” destination; `null` when guest (caller uses login redirect). */
export function connectionHubTeachButtonHref(auth: ConnectionHubAuth | undefined): string | null {
  const user = auth?.user
  if (!user) {
    return null
  }

  if (isOrganizationUser(user)) {
    return route("admin.courses.create")
  }

  return route("profile.course.create")
}

/** Logged-in “my learning / my events” destination; `null` when guest. */
export function connectionHubMyButtonHref(auth: ConnectionHubAuth | undefined): string | null {
  const user = auth?.user
  if (!user) {
    return null
  }

  if (isOrganizationUser(user)) {
    return route("admin.courses.index")
  }

  return route("enrollments.my")
}
