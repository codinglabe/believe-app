"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { Link } from "@inertiajs/react"
import { motion } from "framer-motion"
import {
  Banknote,
  HeartPulse,
  Landmark,
  Briefcase,
  Wallet,
  Handshake,
  Home,
  GraduationCap,
  Medal,
  UtensilsCrossed,
  Bus,
  Scale,
  Monitor,
  MapPin,
  type LucideIcon,
} from "lucide-react"

interface KioskCategoryFromServer {
  slug: string
  title: string
  keywords: string
  redirect_url?: string
}

interface SupporterLocationPayload {
  city: string
  state: string
  zipcode: string | null
  label: string
}

interface KioskPageProps {
  seo?: { title?: string; description?: string }
  hero?: { title: string; subtitle: string }
  categories?: KioskCategoryFromServer[]
  /** City/state from supporter profile (`users.city` / `users.state`) when role is `user` */
  supporterLocation?: SupporterLocationPayload | null
  /** Logged-in supporter missing city or state on profile */
  supporterNeedsLocation?: boolean
}

/** Category only — city/state filtering uses session + profile on the server (no geo in the URL). */
function kioskServicesUrl(categorySlug?: string): string {
  if (!categorySlug) return route("kiosk.services")
  return `${route("kiosk.services")}?category=${encodeURIComponent(categorySlug)}`
}

// Fixed icon and colors per slug (not editable from admin)
const slugToStyle: Record<
  string,
  { icon: LucideIcon; iconColor: string; iconBg: string }
> = {
  "pay-bills": {
    icon: Banknote,
    iconColor: "text-amber-700 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
  },
  healthcare: {
    icon: HeartPulse,
    iconColor: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-100 dark:bg-rose-900/40",
  },
  government: {
    icon: Landmark,
    iconColor: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-100 dark:bg-violet-900/40",
  },
  "find-a-job": {
    icon: Briefcase,
    iconColor: "text-teal-600 dark:text-teal-400",
    iconBg: "bg-teal-100 dark:bg-teal-900/40",
  },
  financial: {
    icon: Wallet,
    iconColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
  },
  "community-help": {
    icon: Handshake,
    iconColor: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-100 dark:bg-violet-900/40",
  },
  "housing-assistance": {
    icon: Home,
    iconColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
  },
  education: {
    icon: GraduationCap,
    iconColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
  },
  "veteran-services": {
    icon: Medal,
    iconColor: "text-red-600 dark:text-red-400",
    iconBg: "bg-red-100 dark:bg-red-900/40",
  },
  "food-and-family": {
    icon: UtensilsCrossed,
    iconColor: "text-red-600 dark:text-red-400",
    iconBg: "bg-red-100 dark:bg-red-900/40",
  },
  transportation: {
    icon: Bus,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
  },
  "disaster-and-legal": {
    icon: Scale,
    iconColor: "text-orange-600 dark:text-orange-400",
    iconBg: "bg-orange-100 dark:bg-orange-900/40",
  },
}

const defaultHero = {
  title: "How can we help today?",
  subtitle: "Find assistance with bills, healthcare, government services, jobs, housing, and more",
}

export default function Kiosk({
  seo,
  hero = defaultHero,
  categories = [],
  supporterLocation = null,
  supporterNeedsLocation = false,
}: KioskPageProps) {
  const displayCategories = categories
    .filter((c) => slugToStyle[c.slug])
    .map((c) => ({
      ...c,
      ...slugToStyle[c.slug],
    }))

  return (
    <FrontendLayout>
      <PageHead title={seo?.title ?? "Kiosk"} description={seo?.description} />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-purple-600 to-blue-600 py-12 sm:py-16 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-4xl mx-auto"
            >
              <div className="inline-flex items-center justify-center mb-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                  <Monitor className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
                {hero.title}
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
                {hero.subtitle}
              </p>
            </motion.div>
          </div>
        </section>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {(supporterLocation || supporterNeedsLocation) && (
            <div
              className={`mb-8 rounded-2xl border p-4 sm:p-5 ${
                supporterLocation
                  ? "border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 dark:border-purple-800/60 dark:from-purple-950/40 dark:to-blue-950/40"
                  : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3 min-w-0">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      supporterLocation
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                    }`}
                  >
                    <MapPin className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {supporterLocation ? "Your location (from profile)" : "Add your location in profile"}
                    </p>
                    {supporterLocation ? (
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                        Local kiosk services can use{" "}
                        <span className="font-medium text-gray-900 dark:text-white">{supporterLocation.label}</span>
                        {supporterLocation.zipcode ? (
                          <span className="text-muted-foreground"> · ZIP {supporterLocation.zipcode}</span>
                        ) : null}
                        . Category links below open the services list already filtered by this city and state.
                      </p>
                    ) : (
                      <p className="text-sm text-amber-900/90 dark:text-amber-100/90 mt-0.5">
                        Add city and state on your profile to open services pre-filtered to your area.{" "}
                        <span className="font-medium">All category cards below still work</span>
                        {" "}
                        - they open the full catalog until you add a location.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {(supporterLocation || supporterNeedsLocation) && (
                    <Link
                      href={kioskServicesUrl()}
                      className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 transition-opacity"
                    >
                      {supporterLocation ? "Browse services in your area" : "Browse all services"}
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                  >
                    Open profile
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {displayCategories.map((item, index) => {
              const Icon = item.icon
              const servicesHref = kioskServicesUrl(item.slug)
              const cardContent = (
                <>
                  <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${item.iconBg}`}
                  >
                    <Icon className={`h-7 w-7 ${item.iconColor}`} aria-hidden />
                  </div>
                  <h2 className="font-semibold text-gray-900 dark:text-white text-base mb-1">
                    {item.title}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {item.keywords}
                  </p>
                </>
              )
              const motionCard = (
                <motion.div
                  key={item.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center text-center h-full w-full cursor-pointer hover:shadow-xl transition-shadow duration-300"
                >
                  {cardContent}
                </motion.div>
              )
              return (
                <Link key={item.slug} href={servicesHref} className="block h-full min-h-[180px]">
                  {motionCard}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}
