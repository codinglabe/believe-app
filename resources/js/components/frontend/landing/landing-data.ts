import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  Bell,
  Bot,
  Calendar,
  GraduationCap,
  Heart,
  LayoutGrid,
  Mail,
  MessageSquare,
  ShoppingBag,
  Sparkles,
  Store,
  Target,
  TrendingUp,
  Users,
  Video,
  LogIn,
  ShieldCheck,
  UserPlus,
  Rocket,
  LineChart,
} from "lucide-react"

/** YouTube ID for the hero “Watch demo” modal (https://youtu.be/ILMg56oTkp8) */
export const LANDING_HERO_VIDEO_YOUTUBE_ID = "ILMg56oTkp8"

export const LANDING_HERO_BENEFITS = [
  { label: "Everything You Need", icon: LayoutGrid },
  { label: "All In One Place", icon: Sparkles },
  { label: "Built for Impact", icon: Target },
  { label: "Designed for Communities", icon: Users },
] as const

export const LANDING_HUB_FEATURES: { label: string; icon: LucideIcon }[] = [
  { label: "AI Tools", icon: Bot },
  { label: "Donations", icon: Heart },
  { label: "Fundraising", icon: TrendingUp },
  { label: "CRM", icon: Users },
  { label: "Email Marketing", icon: Mail },
  { label: "SMS / Push", icon: Bell },
  { label: "Events", icon: Calendar },
  { label: "Volunteers", icon: Users },
  { label: "Courses", icon: GraduationCap },
  { label: "Marketplace", icon: Store },
  { label: "Video Meetings", icon: Video },
]

export const LANDING_WHY_STATS = [
  { value: "1", label: "Unified platform" },
  { value: "12+", label: "Core modules included" },
  { value: "24/7", label: "Mission-ready access" },
] as const

export const LANDING_WHY_CHOOSE = [
  {
    title: "One Login",
    description:
      "Secure, role-based access for staff, volunteers, donors, and members—without separate passwords for every tool.",
    icon: LayoutGrid,
  },
  {
    title: "One Platform",
    description:
      "Fundraising, CRM, communications, events, learning, and commerce connected in a single workspace.",
    icon: Sparkles,
  },
  {
    title: "Unlimited Growth",
    description:
      "Add programs, locations, and campaigns as you scale—without re-platforming or stitching vendors together.",
    icon: TrendingUp,
  },
  {
    title: "Built for Nonprofits",
    description:
      "Pricing, permissions, and workflows shaped for churches, schools, and community organizations—not generic SaaS.",
    icon: Heart,
  },
  {
    title: "Community First",
    description:
      "Keep supporters engaged with consistent branding, messaging, and experiences across every touchpoint.",
    icon: Users,
  },
  {
    title: "No More Chaos",
    description:
      "Retire fragmented spreadsheets and point solutions. Run operations from one source of truth.",
    icon: Target,
  },
] as const

export const LANDING_TOOL_GROUPS = [
  {
    title: "Fundraise & Grow",
    summary: "Launch campaigns, accept gifts, and grow recurring support from one dashboard.",
    items: ["Donations", "Peer-to-Peer", "Campaigns", "Sweepstakes"],
    icon: Heart,
  },
  {
    title: "Communicate",
    summary: "Reach your audience with coordinated email, SMS, push, and in-app messaging.",
    items: ["Email", "SMS", "Push Notifications", "In-App Chat"],
    icon: MessageSquare,
  },
  {
    title: "Build Community",
    summary: "Organize groups, volunteers, events, and learning paths that keep people engaged.",
    items: ["Groups", "Volunteers", "Events", "Courses"],
    icon: Users,
  },
  {
    title: "Generate Revenue",
    summary: "Unlock sustainable income through marketplace, gift cards, and partner programs.",
    items: ["Marketplace", "Gift Cards", "Merchant Deals", "Service Hub"],
    icon: ShoppingBag,
  },
  {
    title: "Host & Connect",
    summary: "Run Unity Meet sessions, livestreams, and AI-assisted video without extra vendors.",
    items: ["Video Meetings", "Live Streaming", "AI Video Creator"],
    icon: Video,
  },
  {
    title: "Smart Intelligence",
    summary: "Measure impact and get guided recommendations from built-in analytics and AI tools.",
    items: ["Analytics", "AI Navigator", "AI Assistant", "Smart Insights"],
    icon: BarChart3,
  },
] as const

export const LANDING_STEPS = [
  {
    step: 1,
    title: "Join",
    description: "Create your organization profile and choose the plan that fits your mission.",
    icon: LogIn,
  },
  {
    step: 2,
    title: "Verify",
    description: "Complete verification so donors and partners trust your presence on the platform.",
    icon: ShieldCheck,
  },
  {
    step: 3,
    title: "Invite",
    description: "Add staff, volunteers, and supporters with role-based access from day one.",
    icon: UserPlus,
  },
  {
    step: 4,
    title: "Engage",
    description: "Launch fundraising, events, email, and Unity Meet—all from one workspace.",
    icon: Rocket,
  },
  {
    step: 5,
    title: "Grow Impact",
    description: "Track outcomes, refine campaigns, and scale programs with built-in analytics.",
    icon: LineChart,
  },
] as const

export const LANDING_TESTIMONIALS = [
  {
    name: "Sarah M.",
    role: "Executive Director",
    quote:
      "Believe In Unity replaced five different tools. Our team finally works from one dashboard.",
    rating: 5,
  },
  {
    name: "Pastor James T.",
    role: "Faith Forward Church",
    quote:
      "Unity Meet and built-in giving made outreach simple. Our congregation stays connected.",
    rating: 5,
  },
  {
    name: "Maria L.",
    role: "Youth Connect Initiative",
    quote:
      "From volunteers to courses to donations — everything lives in one platform we trust.",
    rating: 5,
  },
] as const

export const LANDING_PARTNERS = [
  {
    name: "Faith Forward",
    descriptor: "Church",
    initials: "FF",
    accent: "from-purple-600 to-violet-600",
  },
  {
    name: "Youth Connect",
    descriptor: "Initiative",
    initials: "YC",
    accent: "from-violet-600 to-blue-600",
  },
  {
    name: "Helping Hands",
    descriptor: "Network",
    initials: "HH",
    accent: "from-purple-600 to-blue-600",
  },
  {
    name: "Community Rise",
    descriptor: "Nonprofit",
    initials: "CR",
    accent: "from-purple-700 to-blue-700",
  },
] as const
