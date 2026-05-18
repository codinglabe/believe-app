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

/** Listed on hub heroes; aligns with backend query `?type=` for locking the create form. */
export const CONNECTION_HUB_LISTING_LOCK_TYPES = ["companion", "learning", "events"] as const

export type ConnectionHubListingLockType = (typeof CONNECTION_HUB_LISTING_LOCK_TYPES)[number]

export function appendConnectionHubListingTypeQuery(
  pathOrUrl: string,
  listingType: ConnectionHubListingLockType,
): string {
  const [beforeHash, hashPart] = pathOrUrl.split("#")
  const hash = hashPart !== undefined ? `#${hashPart}` : ""
  const [pathOnly, queryString = ""] = beforeHash.split("?")
  const params = new URLSearchParams(queryString)
  params.set("type", listingType)
  const q = params.toString()
  return `${pathOnly}?${q}${hash}`
}

/** Logged-in “teach / create” destination; `null` when guest (caller uses login redirect). */
export function connectionHubTeachButtonHref(
  auth: ConnectionHubAuth | undefined,
  listingType?: ConnectionHubListingLockType,
): string | null {
  const user = auth?.user
  if (!user) {
    return null
  }

  let base: string
  if (isOrganizationUser(user)) {
    base = route("admin.courses.create")
  } else {
    base = route("profile.course.create")
  }

  if (!listingType) {
    return base
  }

  return appendConnectionHubListingTypeQuery(base, listingType)
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
