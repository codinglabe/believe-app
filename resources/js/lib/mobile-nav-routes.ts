type MobileNavAuth = {
  user?: {
    role?: string
    slug?: string | number
  }
  roles?: string[]
}

export type MobileNavRouteContext = {
  isLoggedIn: boolean
  profileHref: string
  chatHref: string
  unityMeetHref: string
  slot2Href: string
  slot2Title: string
  slot2Icon: string
  slot2ActivePrefix: string
  isSupporter: boolean
  hasCareAllianceRole: boolean
  isOrgUser: boolean
  isAdmin: boolean
}

export function hasCareAllianceRole(auth?: MobileNavAuth): boolean {
  return (auth?.roles ?? []).some((role) => String(role).toLowerCase() === "care_alliance")
}

export function mobileNavRouteContext(auth?: MobileNavAuth): MobileNavRouteContext {
  const isLoggedIn = Boolean(auth?.user)
  const role = auth?.user?.role
  const careAlliance = hasCareAllianceRole(auth)
  const isAdmin = role === "admin"
  const isOrgUser = role === "organization" || role === "organization_pending"
  const isSupporter = role === "user"

  const profileHref = !isLoggedIn
    ? route("login")
    : isAdmin || isOrgUser
      ? route("dashboard")
      : careAlliance
        ? route("care-alliance.dashboard")
        : route("user.profile.index")

  const canAccessUnityMeet =
    isLoggedIn && (isSupporter || isOrgUser || careAlliance)

  const unityMeetHref = !isLoggedIn
    ? route("login")
    : canAccessUnityMeet
      ? route("livestreams.supporter.index")
      : isAdmin
        ? route("dashboard")
        : route("login")

  const chatHref = isLoggedIn ? route("chat.index") : route("login")

  const useDashboardSlot = isLoggedIn && (isAdmin || isOrgUser || careAlliance)

  const dashboardHref = careAlliance ? route("care-alliance.dashboard") : route("dashboard")
  const dashboardActivePrefix = careAlliance ? "/care-alliance/dashboard" : "/dashboard"

  return {
    isLoggedIn,
    profileHref,
    chatHref,
    unityMeetHref,
    slot2Href: useDashboardSlot ? dashboardHref : route("organizations"),
    slot2Title: useDashboardSlot ? "Dashboard" : "Organizations",
    slot2Icon: useDashboardSlot ? "Activity" : "Building2",
    slot2ActivePrefix: useDashboardSlot ? dashboardActivePrefix : "/organizations",
    isSupporter,
    hasCareAllianceRole: careAlliance,
    isOrgUser,
    isAdmin,
  }
}
