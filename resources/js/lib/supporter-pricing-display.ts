import {
  Award,
  Calendar,
  Gift,
  Globe,
  Heart,
  Sparkles,
  Store,
  Tag,
  Trophy,
  Users,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react"

export const PRIME_SUPPORTER_PRICE = 4.99
export const PRIME_SUPPORTER_FREQUENCY = "month"

export type SupporterPlanCell =
  | { kind: "check" }
  | { kind: "dash" }
  | { kind: "text"; value: string; highlight?: boolean }

export interface SupporterPricingRow {
  label: string
  Icon: LucideIcon
  free: SupporterPlanCell
  prime: SupporterPlanCell
}

export const SUPPORTER_VALUE_PROPS = [
  { label: "Support Causes You Care About", Icon: Heart },
  { label: "Earn More Rewards", Icon: Gift },
  { label: "Unlock Exclusive Benefits", Icon: Tag },
  { label: "Be Part of a Stronger Community", Icon: Users },
] as const

export const SUPPORTER_PRICING_ROWS: SupporterPricingRow[] = [
  { label: "Follow Organizations", Icon: Users, free: { kind: "check" }, prime: { kind: "check" } },
  { label: "Donate to Causes", Icon: Heart, free: { kind: "check" }, prime: { kind: "check" } },
  { label: "Join Groups & Community", Icon: Globe, free: { kind: "check" }, prime: { kind: "check" } },
  { label: "Watch Unity Live", Icon: Video, free: { kind: "check" }, prime: { kind: "check" } },
  {
    label: "Unity Meet Access",
    Icon: Video,
    free: { kind: "text", value: "Basic Access" },
    prime: { kind: "text", value: "Full Access", highlight: true },
  },
  {
    label: "Schedule Unity Meet Sessions",
    Icon: Calendar,
    free: { kind: "dash" },
    prime: { kind: "text", value: "Free Scheduling", highlight: true },
  },
  {
    label: "Earn BRP Rewards",
    Icon: Gift,
    free: { kind: "text", value: "Basic Rewards" },
    prime: { kind: "text", value: "2X Rewards", highlight: true },
  },
  {
    label: "Marketplace Access",
    Icon: Store,
    free: { kind: "text", value: "Standard Access" },
    prime: { kind: "text", value: "Premium Deals", highlight: true },
  },
  {
    label: "Sweepstakes Access",
    Icon: Trophy,
    free: { kind: "text", value: "Standard Entries" },
    prime: { kind: "text", value: "Bonus Entries", highlight: true },
  },
  { label: "Unity Wallet", Icon: Wallet, free: { kind: "check" }, prime: { kind: "check" } },
  {
    label: "Supporter Badge",
    Icon: Award,
    free: { kind: "text", value: "Basic Badge" },
    prime: { kind: "text", value: "Prime Badge", highlight: true },
  },
  { label: "Member-Only Discounts", Icon: Tag, free: { kind: "dash" }, prime: { kind: "check" } },
  { label: "Exclusive Livestreams", Icon: Video, free: { kind: "dash" }, prime: { kind: "check" } },
  { label: "Premium Events Access", Icon: Calendar, free: { kind: "dash" }, prime: { kind: "check" } },
  { label: "Early Access to New Features", Icon: Sparkles, free: { kind: "dash" }, prime: { kind: "check" } },
  { label: "Special Promotions", Icon: Gift, free: { kind: "dash" }, prime: { kind: "check" } },
  { label: "Priority Giveaways", Icon: Trophy, free: { kind: "dash" }, prime: { kind: "check" } },
]

export const SUPPORTER_CTA_POINTS = [
  { label: "Your Support Creates Change", Icon: Heart },
  { label: "Stronger Together. Better Together.", Icon: Users },
  { label: "One Platform. One Purpose.", Icon: Globe },
] as const

export interface SupporterSubscriptionState {
  tier: string
  name: string
  price: number
}

export interface SupporterPlanBadgeDisplay {
  label: string
  Icon: LucideIcon
  className: string
}

export function getSupporterPlanBadge(
  subscription?: SupporterSubscriptionState | null,
): SupporterPlanBadgeDisplay {
  const tier = subscription?.tier ?? null
  const planName = subscription?.name

  if (tier === "prime_supporter") {
    return {
      label: planName || "Prime Supporter",
      Icon: Sparkles,
      className:
        "bg-gradient-to-r from-purple-600 to-blue-600 text-white border-white/30 shadow-md shadow-purple-900/20",
    }
  }

  if (tier === "free_supporter") {
    return {
      label: planName || "Free Supporter",
      Icon: Heart,
      className: "bg-white/20 text-white border-white/30 backdrop-blur-sm",
    }
  }

  return {
    label: "Supporter",
    Icon: Award,
    className: "bg-white/15 text-white/90 border-white/20 backdrop-blur-sm",
  }
}

export function supporterPricingHref(): string {
  return `${route("pricing")}?tab=supporters`
}

export function organizationPricingHref(): string {
  return `${route("pricing")}?tab=organizations`
}
