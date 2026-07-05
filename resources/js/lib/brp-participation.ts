export type BrpParticipationModuleKey =
  | "donation"
  | "bp_purchase"
  | "gift_card_purchase"
  | "marketplace_purchase"
  | "course_purchase"
  | "event_registration_paid"
  | "event_attendance_free"
  | "volunteer"
  | "organization_referral"
  | "merchant_referral"
  | "supporter_referral"
  | "organization_follow"
  | "profile_completion"
  | "daily_login"
  | "ai_learning"
  | "unity_live"
  | "unity_meet"

export interface BrpParticipationModuleSettings {
  module: BrpParticipationModuleKey
  label: string
  rule: string
  enabled: boolean
  free_award: number
  prime_award: number
  money_moves: boolean
  category: "money_movement" | "participation"
  award: number
}

export interface BrpParticipationSettings {
  modules: Partial<Record<BrpParticipationModuleKey, BrpParticipationModuleSettings>>
  min_bp_purchase: number
}

export function formatBrpPoints(points: number): string {
  return Number(points)
    .toFixed(2)
    .replace(/\.?0+$/, "")
}

/** Resolve which participation module applies to a Connection Hub enrollment. */
export function courseEnrollmentBrpModule(course: {
  type?: string | null
  pricing_type?: string | null
}): BrpParticipationModuleKey | null {
  if (course.pricing_type !== "paid") {
    return null
  }

  if (course.type === "events") {
    return "event_registration_paid"
  }

  return "course_purchase"
}

export function brpEarnMessage(award: number, label?: string): string {
  const points = formatBrpPoints(award)
  if (label) {
    return `Earn +${points} BRP (Believe Reward Points) for ${label.toLowerCase()}.`
  }

  return `Earn +${points} BRP (Believe Reward Points) when you complete this activity.`
}
