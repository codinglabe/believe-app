import React from "react"
import { Link, router } from "@inertiajs/react"
import { motion } from "framer-motion"
import { PageHead } from "@/components/frontend/PageHead"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Button } from "@/components/frontend/ui/button"
import {
  Activity,
  ArrowRight,
  BookOpen,
  Building2,
  DollarSign,
  Flame,
  Globe2,
  Heart,
  Landmark,
  Lock,
  Sparkles,
  Star,
  Trophy,
  Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { cardItem, springTransition, staggerContainer } from "./level-up-motion"
import {
  brandLogoGradientText,
  ChallengeHubBackdrop,
  challengeCategoryRingActive,
  challengeFilterPillActive,
  challengeFilterPillInactive,
  challengeHeroTitle,
  challengePageShell,
  challengePointsBarFill,
  challengeSectionTitle,
  challengeTrackCardShell,
} from "./challenge-hub-brand"

declare global {
  function route(name: string, params?: Record<string, unknown> | (string | number)[]): string
}

interface Track {
  id: number
  slug: string
  name: string
  status: string
  subject_categories: string[]
  /** Number of challenge cards on View Challenges (merged question-bank groups + hub entries). */
  challenges_count: number
  /** Distinct users with ≥1 answered event on this track (all time). */
  players_count: number
  /** Admin-generated OpenAI cover (public storage URL) */
  cover_image_url?: string | null
  hub_card_description?: string | null
}

interface HubStats {
  chest_goal: number
  reward_points: number
  points_in_current_chest: number
  points_to_next_chest: number
  quizzes_completed: number
  badges_earned: number
  day_streak: number
}

interface ChallengeCategory {
  slug: string
  label: string
  /** Lucide icon key — must exist in CHALLENGE_HUB_ICON_MAP or Sparkles is used */
  icon: string
  filter_key: string
  is_new: boolean
  cover_image_url?: string | null
}

interface ChallengeFilterTab {
  id: string
  label: string
}

interface Props {
  tracks: Track[]
  hub: HubStats
  challenge_categories: ChallengeCategory[]
  /** Distinct filter options for “Choose Your Challenge” pills — built on the server (includes All). */
  challenge_filters: ChallengeFilterTab[]
  /** Current `?filter=` — tracks[] are already filtered server-side. */
  active_filter: string
  /** Which hub category icon is selected — unique `slug` (only one icon; uses `?category=`). */
  active_category_slug?: string | null
}

/** Whitelist icons from DB `challenge_hub_categories.icon` */
const CHALLENGE_HUB_ICON_MAP: Record<string, LucideIcon> = {
  heart: Heart,
  globe2: Globe2,
  landmark: Landmark,
  building2: Building2,
  dollar_sign: DollarSign,
  activity: Activity,
  trophy: Trophy,
}

function trackCardIcon(track: Track): LucideIcon {
  const h = `${track.slug} ${track.name}`.toLowerCase()
  if (h.includes("faith") || h.includes("spirit")) return Heart
  if (h.includes("history")) return Landmark
  if (h.includes("sport")) return Trophy
  if (h.includes("world")) return Globe2
  if (h.includes("money") || h.includes("civic")) return DollarSign
  if (h.includes("health")) return Activity
  return Sparkles
}

function TreasureChestGraphic({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center", className)} aria-hidden>
      {/* Halo stack — reads like the comp’s glowing focal */}
      <div className="absolute h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(147,51,234,0.38)_0%,rgba(37,99,235,0.12)_45%,transparent_70%)] blur-[2px]" />
      <div className="absolute h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.28)_0%,transparent_55%)] blur-3xl" />
      <div className="absolute h-48 w-48 rounded-full bg-purple-500/18 blur-2xl" />
      <svg
        viewBox="0 0 240 200"
        className="relative z-[1] h-44 w-full max-w-[280px] drop-shadow-[0_8px_32px_rgba(0,0,0,0.55),0_0_40px_rgba(250,204,21,0.35)] sm:h-52 md:h-56 md:max-w-[320px]"
      >
        <defs>
          <linearGradient id="hub-ch-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="35%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="hub-ch-lid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="hub-ch-shine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="40%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <ellipse cx="120" cy="172" rx="88" ry="16" fill="rgba(0,0,0,0.35)" />
        <ellipse cx="120" cy="168" rx="78" ry="12" fill="rgba(251,191,36,0.12)" />
        <path
          d="M48 102 L48 142 Q48 158 66 158 L174 158 Q192 158 192 142 L192 102 Q192 82 174 82 L66 82 Q48 82 48 102 Z"
          fill="url(#hub-ch-gold)"
          stroke="#eab308"
          strokeWidth="2.5"
        />
        <path
          d="M66 82 L66 58 Q66 28 120 22 Q174 28 174 58 L174 82 Z"
          fill="url(#hub-ch-lid)"
          stroke="#eab308"
          strokeWidth="2.5"
        />
        <path
          d="M120 22 Q174 28 174 58"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <ellipse cx="120" cy="52" rx="48" ry="14" fill="url(#hub-ch-shine)" opacity="0.5" />
        <rect x="108" y="94" width="24" height="56" rx="4" fill="#451a03" opacity="0.92" />
        <rect x="112" y="98" width="16" height="48" rx="2" fill="#292524" opacity="0.5" />
        <circle cx="120" cy="122" r="12" fill="#fef9c3" stroke="#a16207" strokeWidth="2" />
        <circle cx="120" cy="122" r="5" fill="#b45309" />
        <circle cx="86" cy="108" r="7" fill="#fde047" opacity="0.95" />
        <circle cx="154" cy="114" r="6" fill="#fde047" opacity="0.9" />
        <circle cx="138" cy="98" r="4" fill="#fef08a" opacity="0.85" />
      </svg>
    </div>
  )
}

function RingProgress({
  current,
  goal,
  className,
}: {
  current: number
  goal: number
  className?: string
}) {
  const r = 52
  const c = 2 * Math.PI * r
  const pct = goal > 0 ? Math.min(1, current / goal) : 0
  const offset = c * (1 - pct)

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg className="h-40 w-40 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(147,51,234,0.15)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="url(#hub-ring-brand)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700"
        />
        <defs>
          <linearGradient id="hub-ring-brand" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9333ea" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className={cn("text-lg font-semibold tabular-nums", brandLogoGradientText)}>
          {Math.round(current).toLocaleString()}
        </p>
        <p className="text-xs text-purple-200/75">/ {goal.toLocaleString()}</p>
      </div>
    </div>
  )
}

function HubCategoryQuickButton({
  category,
  activeCategorySlug,
  onSelectCategorySlug,
}: {
  category: ChallengeCategory
  activeCategorySlug: string | null
  onSelectCategorySlug: (slug: string) => void
}) {
  const active = activeCategorySlug === category.slug
  const IconComponent = CHALLENGE_HUB_ICON_MAP[category.icon] ?? Sparkles
  return (
    <button
      type="button"
      onClick={() => onSelectCategorySlug(category.slug)}
      className="group flex shrink-0 flex-col items-center gap-2 px-1"
    >
      <span
        className={cn(
          "relative flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-full border bg-black/40 transition",
          active
            ? challengeCategoryRingActive
            : "border-slate-400/45 text-white hover:border-slate-300/60"
        )}
      >
        {category.cover_image_url ? (
          <>
            <img
              src={category.cover_image_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-95"
            />
            <span className="absolute inset-0 bg-black/45" aria-hidden />
          </>
        ) : null}
        <IconComponent className="relative z-[1] h-[22px] w-[22px]" strokeWidth={1.15} />
      </span>
      <span
        className={cn(
          "relative inline-block text-center text-[11px] font-medium tracking-wide",
          active ? brandLogoGradientText : "text-white",
          category.is_new && "pr-6"
        )}
      >
        {category.label}
        {category.is_new ? (
          <span className="absolute -right-1 top-0 translate-x-full rounded bg-violet-600 px-1 py-0.5 text-[8px] font-bold uppercase leading-none tracking-wide text-white shadow-sm">
            New
          </span>
        ) : null}
      </span>
    </button>
  )
}

function visitChallengeHubFilter(filterKey: string): void {
  const params: Record<string, string> = {}
  if (filterKey !== "all") {
    params.filter = filterKey
  }
  router.get(route("challenge-hub.index"), params, {
    preserveScroll: true,
    preserveState: true,
    replace: true,
  })
}

/** Icon row: one selected category at a time — uses `?category=` (unique slug). */
function visitChallengeHubCategorySlug(slug: string): void {
  router.get(
    route("challenge-hub.index"),
    { category: slug },
    { preserveScroll: true, preserveState: true, replace: true }
  )
}

export default function LevelUpIndex({
  tracks,
  hub,
  challenge_categories,
  challenge_filters,
  active_filter,
  active_category_slug,
}: Props) {
  const chestGoal = hub.chest_goal || 2000
  const inChest = hub.points_in_current_chest
  const barPct = chestGoal > 0 ? Math.min(100, (inChest / chestGoal) * 100) : 0

  const categories = challenge_categories ?? []
  const filterTabs = challenge_filters?.length ? challenge_filters : [{ id: "all", label: "All" }]
  const filter = active_filter ?? "all"
  const selectedCategorySlug = active_category_slug ?? null

  return (
    <FrontendLayout>
      <PageHead title="Challenge Hub" description="Test your knowledge and earn reward points." />
      <div className={challengePageShell}>
        <ChallengeHubBackdrop />

        <div className="relative z-[1]">
          {/* Hero — left: copy + points / right: chest */}
          <section className="border-b border-white/[0.06] px-4 pb-12 pt-10 sm:px-8 sm:pb-14 sm:pt-12 lg:px-10 lg:pb-16">
            <div className="mx-auto max-w-6xl">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(240px,0.85fr)] lg:items-center lg:gap-12 xl:gap-16"
              >
                <div className="min-w-0 space-y-7">
                  <div>
                    <h1
                      className={cn(
                        challengeHeroTitle,
                        "text-[2.35rem] leading-[1.1] sm:text-5xl md:text-[3.25rem]"
                      )}
                    >
                      Challenge Hub
                    </h1>
                    <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-white/90 sm:text-base">
                      Test your knowledge and earn rewards by taking fun and educational quizzes across different topics.
                    </p>
                  </div>

                  <div className="max-w-md space-y-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-purple-400/90 sm:text-xs">
                      Points{" "}
                      <span
                        className={cn(
                          "text-base font-bold tracking-normal tabular-nums sm:text-lg",
                          brandLogoGradientText
                        )}
                      >
                        {Math.round(inChest).toLocaleString()}
                      </span>{" "}
                      <span className="font-normal text-white/50">/</span>{" "}
                      <span className="text-base font-semibold tabular-nums text-white/90 sm:text-lg">
                        {chestGoal.toLocaleString()}
                      </span>
                    </p>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#141210] shadow-[inset_0_1px_3px_rgba(0,0,0,0.85)]">
                      <div
                        className={cn("h-full transition-[width] duration-700 ease-out", challengePointsBarFill)}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    <p className="text-sm text-white/80">
                      Earn{" "}
                      <span className={cn("font-semibold tabular-nums", brandLogoGradientText)}>
                        {Math.round(hub.points_to_next_chest).toLocaleString()}
                      </span>{" "}
                      more points to open the next chest!
                    </p>
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.55, delay: 0.05 }}
                  className="flex justify-center lg:justify-end lg:pr-2"
                >
                  <TreasureChestGraphic />
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* Category quick filters — data from challenge_hub_categories */}
          {categories.length > 0 ? (
            <section
              aria-label="Challenge categories"
              className="border-b border-white/[0.06] px-4 py-4 sm:px-8 sm:py-5 lg:px-10"
            >
              <div className="mx-auto max-w-6xl">
                <div className="w-full pt-1 sm:pt-2">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.06 }}
                    className="mx-auto flex w-full max-w-5xl flex-wrap justify-center gap-x-4 gap-y-5 px-2 sm:gap-x-5 sm:gap-y-6 md:gap-x-6"
                  >
                    {categories.map((category) => (
                      <HubCategoryQuickButton
                        key={category.slug}
                        category={category}
                        activeCategorySlug={selectedCategorySlug}
                        onSelectCategorySlug={visitChallengeHubCategorySlug}
                      />
                    ))}
                  </motion.div>
                </div>
              </div>
            </section>
          ) : null}

          {/* Main + sidebar */}
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 lg:flex lg:gap-10 lg:px-10 lg:py-12">
            <div className="min-w-0 flex-1">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <h2 className={cn(challengeSectionTitle, "text-2xl sm:text-3xl")}>Choose Your Challenge</h2>
              </div>

              <div className="mb-8 flex flex-wrap gap-2">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => visitChallengeHubFilter(tab.id)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                      filter === tab.id ? challengeFilterPillActive : challengeFilterPillInactive
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <motion.div
                className="grid gap-4 sm:grid-cols-2"
                initial="initial"
                animate="animate"
                variants={staggerContainer}
              >
                {tracks.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-12 text-center backdrop-blur-md">
                    <p className="text-slate-400">No challenges in this category yet.</p>
                    <p className="mt-2 text-sm text-slate-500">Try another filter or check back soon.</p>
                  </div>
                ) : (
                  tracks.map((track, i) => {
                    const active = track.status === "active"
                    const Icon = trackCardIcon(track)
                    const cc = track.challenges_count
                    const pc = track.players_count ?? 0
                    const showNew = track.slug.toLowerCase().includes("sport")
                    return (
                      <motion.div
                        key={track.id}
                        variants={cardItem}
                        transition={{ ...springTransition, delay: i * 0.04 }}
                        whileHover={active ? { y: -3 } : undefined}
                        className={challengeTrackCardShell}
                      >
                        <div className="flex items-start gap-4">
                          {track.cover_image_url ? (
                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-purple-500/35 shadow-[0_0_20px_rgba(147,51,234,0.22)]">
                              <img
                                src={track.cover_image_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-purple-500/35 bg-gradient-to-br from-purple-600/30 to-blue-900/45 text-purple-100 shadow-[0_0_20px_rgba(147,51,234,0.25)]">
                              <Icon className="h-7 w-7" strokeWidth={1.4} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold text-slate-50">{track.name}</h3>
                              {showNew ? (
                                <span className="rounded bg-purple-600/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                                  New
                                </span>
                              ) : null}
                            </div>
                            {track.hub_card_description ? (
                              <p className="mt-1 text-sm leading-snug text-slate-300/95">{track.hub_card_description}</p>
                            ) : null}
                            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
                              <span className="inline-flex items-center gap-1.5">
                                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                                {cc > 0
                                  ? `${cc.toLocaleString()} Challenges`
                                  : "Challenges coming soon"}
                              </span>
                              {cc > 0 ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <Users className="h-3.5 w-3.5 shrink-0" />
                                  {pc === 1 ? "1 player" : `${pc.toLocaleString()} players`}
                                </span>
                              ) : null}
                            </p>
                          </div>
                        </div>
                        <div className="mt-5 flex justify-end">
                          {active ? (
                            <Button
                              asChild
                              variant="outline"
                              className="group rounded-full border-purple-500/50 bg-transparent px-5 text-purple-100 hover:bg-gradient-to-r hover:from-purple-600/15 hover:to-blue-600/15 hover:text-white"
                            >
                              <Link href={route("challenge-hub.challenges", track.slug)} className="inline-flex items-center gap-2">
                                View Challenges
                                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                              </Link>
                            </Button>
                          ) : (
                            <Button
                              disabled
                              variant="outline"
                              className="rounded-full border-white/10 bg-black/20 text-slate-500"
                            >
                              <Lock className="mr-2 h-4 w-4" />
                              Coming soon
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    )
                  })
                )}
              </motion.div>
            </div>

            {/* Sidebar */}
            <aside className="mt-12 w-full shrink-0 lg:mt-0 lg:max-w-[320px]">
              <div className="rounded-2xl border border-purple-500/15 bg-white/[0.05] p-6 backdrop-blur-md shadow-[0_16px_48px_-20px_rgba(0,0,0,0.85)]">
                <h3 className="text-lg font-semibold text-slate-100">Your Progress</h3>
                <div className="mt-6 flex justify-center">
                  <RingProgress current={inChest} goal={chestGoal} />
                </div>
                <ul className="mt-6 space-y-4 text-sm">
                  <li className="flex items-start gap-3">
                    <Star className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                    <span className="text-slate-300">
                      <span className={cn("font-semibold", brandLogoGradientText)}>
                        {Math.round(hub.points_to_next_chest).toLocaleString()}
                      </span>{" "}
                      points to next chest!
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                    <span className="text-slate-300">
                      <span className={cn("font-semibold", brandLogoGradientText)}>{hub.badges_earned}</span> Badges Earned
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Flame className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                    <span className="text-slate-300">
                      <span className={cn("font-semibold", brandLogoGradientText)}>{hub.day_streak}</span> Day Streak
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                    <span className="text-slate-300">
                      <span className={cn("font-semibold", brandLogoGradientText)}>
                        {hub.quizzes_completed.toLocaleString()}
                      </span>{" "}
                      Quizzes Completed
                    </span>
                  </li>
                </ul>
                <p className="mt-6 border-t border-white/10 pt-4 text-center text-xs text-slate-500">
                  Total reward points:{" "}
                  <span className={cn("font-medium", brandLogoGradientText)}>
                    {hub.reward_points.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}
