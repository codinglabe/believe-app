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
