export interface PlanPricingCustomField {
  key: string
  label: string
  value: string
  type: string
  icon?: string
  description?: string
}

export interface PlanPricingShape {
  price: number
  frequency: string
  custom_fields?: PlanPricingCustomField[]
  features?: { name: string; is_unlimited?: boolean }[]
}

const DEFAULT_INCLUDED_COLUMNS: string[][] = [
  [
    "Donations",
    "FundMe (Peer-to-Peer)",
    "Campaigns (Email, Social, Push)",
    "Sweepstakes",
    "Marketplace & Sell Products",
    "Merchant Deals Service Hub",
    "Volunteer Management",
    "Groups & Community",
  ],
  [
    "Supporter Management (CRM)",
    "Care Alliances",
    "Companion Hub",
    "Learning / Courses",
    "Events (Unlimited)",
    "Earning / Jobs",
    "News & Articles",
    "Unity Videos",
  ],
  [
    "Unity Live & Meet",
    "AI Assistant",
    "Kiosk Mode",
    "Push Notifications",
    "Analytics & Reporting",
    "Chat & Messaging",
    "And Much More",
  ],
]

export function planCustomFieldByKey(
  plan: PlanPricingShape | undefined,
  key: string,
): string | undefined {
  const want = key.toLowerCase()
  const f = plan?.custom_fields?.find((x) => String(x.key).toLowerCase() === want)
  const v = f?.value != null ? String(f.value).trim() : ""
  return v || undefined
}

export function formatPlanPrice(value: number): string {
  const n = Math.round(Number(value) * 100) / 100
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function planFrequencyLabel(frequency: string): string {
  if (frequency === "monthly") return "month"
  return frequency
}

export function resolveStandardPrice(plan: PlanPricingShape | undefined): number | undefined {
  const raw = planCustomFieldByKey(plan, "pricing_standard_price")
  if (!raw) return undefined
  const n = Number(String(raw).replace(/[^0-9.]/g, ""))
  return Number.isNaN(n) ? undefined : Math.round(n * 100) / 100
}

function parseIncludedLabel(item: unknown): string {
  if (typeof item === "string" && item.trim()) return item.trim()
  if (item && typeof item === "object") {
    return String((item as Record<string, unknown>).label ?? "").trim()
  }
  return ""
}

function splitFlatIncludedIntoColumns(items: string[]): string[][] {
  const sizes = [8, 8, 7]
  const columns: string[][] = [[], [], []]
  let at = 0
  for (let col = 0; col < sizes.length; col++) {
    columns[col] = items.slice(at, at + sizes[col])
    at += sizes[col]
  }
  if (at < items.length) {
    columns[2] = [...columns[2], ...items.slice(at)]
  }
  return columns.filter((column) => column.length > 0)
}

/** Three-column “Everything included” layout (artwork order). */
export function everythingIncludedColumnsFromPlan(plan: PlanPricingShape | undefined): string[][] {
  const raw = planCustomFieldByKey(plan, "pricing_everything_included_json")
  if (!raw) {
    const fromFeatures = plan?.features?.filter((f) => f.is_unlimited).map((f) => f.name) ?? []
    if (fromFeatures.length > 0) {
      return splitFlatIncludedIntoColumns(fromFeatures)
    }
    return DEFAULT_INCLUDED_COLUMNS
  }

  try {
    const parsed = JSON.parse(raw) as unknown

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const columnsRaw = (parsed as Record<string, unknown>).columns
      if (Array.isArray(columnsRaw) && columnsRaw.length > 0) {
        const columns: string[][] = []
        for (const column of columnsRaw) {
          if (!Array.isArray(column)) continue
          const labels = column.map(parseIncludedLabel).filter(Boolean)
          if (labels.length > 0) columns.push(labels)
        }
        if (columns.length > 0) return columns
      }
    }

    if (Array.isArray(parsed)) {
      const flat = parsed.map(parseIncludedLabel).filter(Boolean)
      if (flat.length > 0) return splitFlatIncludedIntoColumns(flat)
    }
  } catch {
    /* fall through */
  }

  return DEFAULT_INCLUDED_COLUMNS
}

export function planHighlightLines(plan: PlanPricingShape | undefined): {
  emailsLine: string
  aiLine: string
  supportLine: string
} {
  const fallbacks = {
    emailsLine: "5,000 emails included every month",
    aiLine: "50,000 AI tokens every month",
    supportLine: "Priority email support",
  }
  if (!plan?.custom_fields?.length) return fallbacks

  const fields = plan.custom_fields

  const emailField = fields.find(
    (f) =>
      f.type === "number" &&
      (String(f.key).toLowerCase() === "emails_included" || /email/i.test(String(f.label ?? ""))),
  )
  let emailsLine = fallbacks.emailsLine
  if (emailField?.value !== undefined && String(emailField.value).trim() !== "") {
    const n = Number(String(emailField.value).replace(/,/g, ""))
    if (!Number.isNaN(n) && n >= 0) {
      emailsLine = `${n.toLocaleString()} emails included every month`
    }
  }

  const aiTokenNumber = fields.find((f) => {
    if (f.type !== "number") return false
    const k = String(f.key).toLowerCase()
    return k === "ai_tokens_included" || k === "ai_tokens"
  })

  let aiLine = fallbacks.aiLine
  if (aiTokenNumber?.value !== undefined && String(aiTokenNumber.value).trim() !== "") {
    const n = Number(String(aiTokenNumber.value).replace(/,/g, ""))
    if (!Number.isNaN(n) && n > 0) {
      aiLine = `${n.toLocaleString()} AI tokens every month`
    }
  }

  const supportField = fields.find(
    (f) =>
      String(f.key).toLowerCase() === "support_level" ||
      String(f.key).toLowerCase() === "priority_support",
  )
  const supportLine = supportField?.value?.trim() ? supportField.value.trim() : fallbacks.supportLine

  return { emailsLine, aiLine, supportLine }
}

export interface UsageAddOn {
  name: string
  price: string
  description: string
}

export function usageAddOnsFromPlan(
  plan: PlanPricingShape | undefined,
  fallback: UsageAddOn[],
): UsageAddOn[] {
  const raw = planCustomFieldByKey(plan, "pricing_usage_addons_json")
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return fallback
    const out: UsageAddOn[] = []
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue
      const o = item as Record<string, unknown>
      const name = String(o.name ?? "").trim()
      const price = String(o.price ?? "").trim()
      const description = String(o.description ?? "").trim()
      if (name && price) out.push({ name, price, description })
    }
    return out.length > 0 ? out : fallback
  } catch {
    return fallback
  }
}

export function planGridClassName(planCount: number): string {
  if (planCount <= 1) return "grid grid-cols-1 max-w-xl mx-auto gap-6"
  if (planCount === 2) return "grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-6"
  return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
}

export const UNITY_MEMBERSHIP_DEFAULTS = {
  standardPrice: 34,
  verificationFee: 10,
  verificationLabel: "Organization Verification",
  frequency: "month",
  cancellation: "Cancel anytime. No contracts. No hassle.",
} as const

export function resolveIntroPrice(plan: PlanPricingShape | undefined): number {
  if (plan?.price != null && Number(plan.price) > 0) {
    return Math.round(Number(plan.price) * 100) / 100
  }
  const custom = planCustomFieldByKey(plan, "pricing_intro_price")
  if (custom) {
    const n = Number(String(custom).replace(/[^0-9.]/g, ""))
    if (!Number.isNaN(n)) return Math.round(n * 100) / 100
  }
  return 19.9
}

export function planCurrencyCustomFields(plan: PlanPricingShape | undefined): PlanPricingCustomField[] {
  if (!plan?.custom_fields?.length) return []
  return plan.custom_fields.filter((f) => String(f.type ?? "").toLowerCase().trim() === "currency")
}

export function formatCurrencyCustomFieldDisplay(raw: string): string {
  const s = String(raw ?? "").trim()
  if (!s) return ""
  if (/^\s*\$/.test(s)) return s.trim()
  const n = Number(s.replace(/,/g, ""))
  if (!Number.isNaN(n)) {
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return s
}

export function pricingPageMarketingFromPlan(plan: PlanPricingShape | undefined) {
  return {
    competitorRange:
      planCustomFieldByKey(plan, "pricing_competitor_monthly_range") ??
      planCustomFieldByKey(plan, "pricing_competitor_range") ??
      "$600 – $2,000+",
    vsBadge:
      planCustomFieldByKey(plan, "pricing_vs_badge") ??
      planCustomFieldByKey(plan, "pricing_fragmented_badge") ??
      "$600–$2k+",
    fragmentedLabel: planCustomFieldByKey(plan, "pricing_vs_fragmented_label") ?? "fragmented stack",
    cardFooterTagline:
      planCustomFieldByKey(plan, "pricing_card_footer_tagline") ??
      "ONE PLAN. ONE PRICE. ONE MISSION.",
    unlimitedAccessSummary:
      planCustomFieldByKey(plan, "pricing_unlimited_access_summary") ??
      "Donations, FundMe (Peer-to-Peer), Campaigns (Email, Social, Push)",
    cancellationPolicy:
      planCustomFieldByKey(plan, "pricing_cancellation_policy") ?? UNITY_MEMBERSHIP_DEFAULTS.cancellation,
  }
}

export function trialBenefitCardCopy(plan: PlanPricingShape & { trial_days?: number }): string {
  const override = planCustomFieldByKey(plan, "pricing_trial_card_copy")
  if (override) return override
  const days = plan.trial_days ?? 0
  if (days > 0) return `${days}-day free trial`
  return UNITY_MEMBERSHIP_DEFAULTS.cancellation
}
