export type BridgeVerificationState = {
  initialized: boolean
  kyb_status: string
  kyc_status: string
  requires_verification: boolean
  has_wallet: boolean
  is_verified: boolean
}

export const DEFAULT_BRIDGE_VERIFICATION: BridgeVerificationState = {
  initialized: false,
  kyb_status: "not_started",
  kyc_status: "not_started",
  requires_verification: true,
  has_wallet: false,
  is_verified: false,
}

function isApprovedStatus(status: string): boolean {
  return status === "approved" || status === "verified"
}

export type WalletBridgeStatusPayload = {
  initialized?: boolean
  kyb_status?: string
  kyc_status?: string
  tos_status?: string
  tos_accepted?: boolean
  requires_verification?: boolean
  bridge_account_verified?: boolean
  verification_type?: "kyc" | "kyb" | string
}

/** Bridge KYB/KYC approved means ToS was already accepted on Bridge. */
export function resolveWalletTosStatus(
  payload: WalletBridgeStatusPayload,
  current: string = "pending",
): "pending" | "accepted" | "approved" | "rejected" {
  if (payload.tos_accepted === true) {
    return "accepted"
  }

  if (payload.kyb_status === "approved" || payload.kyc_status === "approved") {
    return "accepted"
  }

  const tos = payload.tos_status
  if (tos === "accepted" || tos === "approved" || tos === "rejected") {
    return tos
  }

  return current as "pending" | "accepted" | "approved" | "rejected"
}

export function isWalletBridgeAccountVerified(payload: WalletBridgeStatusPayload): boolean {
  if (payload.bridge_account_verified === true) {
    return true
  }

  if (payload.requires_verification === false) {
    return true
  }

  const tosOk =
    payload.tos_accepted === true ||
    payload.tos_status === "accepted" ||
    payload.tos_status === "approved" ||
    payload.kyb_status === "approved" ||
    payload.kyc_status === "approved"

  if (payload.verification_type === "kyb") {
    return payload.kyb_status === "approved" && tosOk
  }

  if (payload.verification_type === "kyc") {
    return payload.kyc_status === "approved" && tosOk
  }

  return (
    (payload.kyb_status === "approved" || payload.kyc_status === "approved") && tosOk
  )
}

export function applyWalletBridgeStatusPayload(payload: WalletBridgeStatusPayload): {
  tosStatus: ReturnType<typeof resolveWalletTosStatus>
  kybStatus?: string
  kycStatus?: string
  requiresVerification: boolean
  bridgeInitialized: boolean
} {
  const tosStatus = resolveWalletTosStatus(payload)
  const verified = isWalletBridgeAccountVerified({
    ...payload,
    tos_status: tosStatus,
    tos_accepted: tosStatus === "accepted" || tosStatus === "approved" ? true : payload.tos_accepted,
  })

  return {
    tosStatus,
    kybStatus: payload.kyb_status,
    kycStatus: payload.kyc_status,
    requiresVerification: !verified,
    // Only treat as connected after explicit Connect (backend initialized flag), not from inferred verification alone.
    bridgeInitialized: payload.initialized === true,
  }
}

/** True when Bridge KYC/KYB is submitted and still awaiting a final outcome. */
export function isBridgeVerificationPending(
  status: string | null | undefined,
  submitted = false,
): boolean {
  if (submitted && status !== "approved" && status !== "rejected") {
    return true
  }

  if (!status || status === "not_started" || status === "approved" || status === "rejected") {
    return false
  }

  return true
}

export function isBridgeKycPending(
  status: string | null | undefined,
  kycSubmitted = false,
): boolean {
  return isBridgeVerificationPending(status, kycSubmitted)
}

export function isBridgeKybPending(
  status: string | null | undefined,
  kybSubmitted = false,
): boolean {
  return isBridgeVerificationPending(status, kybSubmitted)
}

export function formatBridgeVerificationStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    not_started: "Not started",
    incomplete: "Incomplete",
    under_review: "Under review",
    pending: "Pending review",
    awaiting_questionnaire: "Awaiting questionnaire",
    awaiting_ubo: "Awaiting UBO information",
    paused: "Paused",
    offboarded: "Offboarded",
    approved: "Approved",
    rejected: "Rejected",
  }

  return labels[status] ?? status.replace(/_/g, " ")
}

export function resolveKycStatusAfterBridgeSubmission(
  currentStatus: string,
  backendStatus: string | undefined,
  kycSubmitted: boolean,
): { status: string; submitted: boolean } {
  const nextStatus = backendStatus ?? currentStatus

  if (nextStatus === "approved") {
    return { status: "approved", submitted: false }
  }

  if (nextStatus === "rejected") {
    return { status: "rejected", submitted: true }
  }

  if (kycSubmitted || isBridgeKycPending(nextStatus)) {
    return {
      status: nextStatus === "not_started" ? "under_review" : nextStatus,
      submitted: true,
    }
  }

  return { status: nextStatus, submitted: kycSubmitted }
}

/** Match WalletPopup: org wallet is ready only after KYB + KYC + wallet exist. */
type AuthLike = {
  user?: { role?: string; current_plan_id?: number | null } | null
  roles?: string[]
} | null | undefined

export function isNonprofitDashboardUser(auth: AuthLike): boolean {
  const role = auth?.user?.role
  const roles = auth?.roles ?? []

  return (
    role === "organization" ||
    role === "organization_pending" ||
    role === "care_alliance" ||
    roles.includes("organization") ||
    roles.includes("organization_pending") ||
    roles.includes("care_alliance")
  )
}

export function isBridgeVerificationGateActive(
  auth: AuthLike,
  bridgeVerification: BridgeVerificationState | null | undefined,
): boolean {
  if (!auth?.user) {
    return false
  }

  const roles = auth.roles ?? []
  if (auth.user.role === "admin" || roles.includes("admin")) {
    return false
  }

  if (!isNonprofitDashboardUser(auth)) {
    return false
  }

  if (!auth.user.current_plan_id) {
    return false
  }

  if (!bridgeVerification) {
    return false
  }

  return !bridgeVerification.is_verified
}

export function parseBridgeVerificationStatus(data: unknown): BridgeVerificationState {
  if (data == null || typeof data !== "object") {
    return DEFAULT_BRIDGE_VERIFICATION
  }

  const row = data as Record<string, unknown>
  const initialized = Boolean(row.initialized)
  const kybStatus = typeof row.kyb_status === "string" ? row.kyb_status : "not_started"
  const kycStatus = typeof row.kyc_status === "string" ? row.kyc_status : "not_started"
  const hasWallet = Boolean(row.has_wallet)

  const kybApproved = isApprovedStatus(kybStatus)
  const kycApproved = isApprovedStatus(kycStatus)

  const isVerified = initialized && kybApproved && kycApproved && hasWallet
  const requiresVerification = !isVerified

  return {
    initialized,
    kyb_status: kybStatus,
    kyc_status: kycStatus,
    requires_verification: requiresVerification,
    has_wallet: hasWallet,
    is_verified: isVerified,
  }
}
