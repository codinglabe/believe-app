import React from "react"
import { Link, usePage } from "@inertiajs/react"
import { motion } from "framer-motion"
import { PageHead } from "@/components/frontend/PageHead"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Button } from "@/components/frontend/ui/button"
import {
  Activity,
  BookOpen,
  Building2,
  DollarSign,
  Globe2,
  Heart,
  Landmark,
  Trophy,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { cardItem, springTransition, staggerContainer } from "./level-up-motion"
import {
  brandLogoGradientText,
  ChallengeHubBackdrop,
  challengeHeroTitle,
  challengePageShell,
  challengePrimaryCtaSm,
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
  hub_card_description: string | null
  cover_image_url: string | null
  quiz_subcategory: string | null
}

interface ChallengeCategory {
  slug: string
  label: string
  icon: string
  filter_key: string
  is_new: boolean
}

interface QuizCard {
  key: string
  /** URL segment for `/play/{slug}` — readable; falls back to `key` if missing. */
  slug?: string
  title: string
  description: string
  question_count: number
  plays_today: number
  image_index: number
  image_url?: string | null
}

interface HeroPayload {
  title: string
  subtitle: string
  /** Same as `quiz_cards.length` — merged challenge cards for this track. */
  challenges_count?: number
}

interface Props {
  app_name: string
  track: Track
  hero: HeroPayload
  active_category_slug: string | null
  challenge_categories: ChallengeCategory[]
  quiz_cards: QuizCard[]
  quiz_card_fallback_images: string[]
  challenges_empty_heading: string
  challenges_empty_hint: string
}

const CHALLENGE_HUB_ICON_MAP: Record<string, LucideIcon> = {
  heart: Heart,
  globe2: Globe2,
  landmark: Landmark,
  building2: Building2,
  dollar_sign: DollarSign,
  activity: Activity,
  trophy: Trophy,
}

export default function LevelUpChallenges() {
  const {
    app_name,
    track,
    hero,
    active_category_slug,
    challenge_categories,
    quiz_cards,
    quiz_card_fallback_images,
    challenges_empty_heading,
    challenges_empty_hint,
  } = usePage<Props>().props

  const categories = challenge_categories ?? []
  const activeCat = categories.find((c) => c.slug === active_category_slug)
  const HeroIcon = CHALLENGE_HUB_ICON_MAP[activeCat?.icon ?? "heart"] ?? Heart

  const fallbacks = Array.isArray(quiz_card_fallback_images) ? quiz_card_fallback_images : []
  const challengesCount = hero.challenges_count ?? quiz_cards.length

  const resolveCardImage = (card: QuizCard): string | null => {
    if (card.image_url && card.image_url.length > 0) {
      return card.image_url
    }
    if (fallbacks.length > 0) {
      return fallbacks[Math.abs(card.image_index) % fallbacks.length] ?? null
    }
    return null
  }

  const pageTitle = `${hero.title} — ${app_name}`

  return (
    <FrontendLayout>
      <PageHead title={pageTitle} description={hero.subtitle} />
      <div className={cn(challengePageShell, "pb-12")}>
        {track.cover_image_url ? (
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.18]"
            style={{ backgroundImage: `url(${track.cover_image_url})` }}
            aria-hidden
          />
        ) : null}
        <ChallengeHubBackdrop />

        <div className="relative z-[1]">
          <section className="px-4 pb-8 pt-10 text-center sm:px-8 sm:pb-10 sm:pt-14">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="mx-auto flex max-w-2xl flex-col items-center gap-4"
            >
              <div
                className={cn(
                  "relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-purple-500/45 shadow-[0_0_36px_rgba(147,51,234,0.35)]",
                  !track.cover_image_url && "bg-gradient-to-br from-purple-600/35 to-blue-950/50"
                )}
              >
                {track.cover_image_url ? (
                  <>
                    <img
                      src={track.cover_image_url}
                      alt={track.name}
                      className="h-full w-full object-cover"
                    />
                    <div
                      className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-purple-600/18 to-blue-950/40 ring-1 ring-inset ring-white/10"
                      aria-hidden
                    />
                  </>
                ) : (
                  <HeroIcon className="h-10 w-10 text-purple-300" strokeWidth={1.25} />
                )}
              </div>
              <h1
                className={cn(challengeHeroTitle, "text-3xl sm:text-4xl md:text-[2.65rem]")}
              >
                {hero.title}
              </h1>
              {challengesCount > 0 ? (
                <p className="inline-flex items-center justify-center gap-2 text-base font-semibold tabular-nums text-purple-100/95 sm:text-lg">
                  <BookOpen className="h-5 w-5 shrink-0 text-purple-400/90" aria-hidden />
                  <span>
                    {challengesCount.toLocaleString()}{" "}
                    {challengesCount === 1 ? "Challenge" : "Challenges"}
                  </span>
                </p>
              ) : null}
              <p className="text-[15px] text-white/85 sm:text-base">{hero.subtitle}</p>
              {track.hub_card_description ? (
                <p className="max-w-xl text-sm leading-relaxed text-white/75">{track.hub_card_description}</p>
              ) : null}
            </motion.div>
          </section>

          <div className="mx-auto max-w-6xl px-4 sm:px-8">
            <motion.div
              className="grid gap-4 sm:grid-cols-2 sm:gap-5"
              initial="initial"
              animate="animate"
              variants={staggerContainer}
            >
              {quiz_cards.length === 0 ? (
                <div className="col-span-full rounded-xl border border-purple-500/20 bg-[rgba(20,25,55,0.5)] px-6 py-14 text-center shadow-[0_12px_40px_-12px_rgba(0,0,0,0.75)] backdrop-blur-md">
                  <p className="text-slate-400">{challenges_empty_heading}</p>
                  <p className="mt-2 text-sm text-slate-500">{challenges_empty_hint}</p>
                </div>
              ) : (
                quiz_cards.map((card, i) => {
                  const img = resolveCardImage(card)
                  return (
                    <motion.article
                      key={card.key}
                      variants={cardItem}
                      transition={{ ...springTransition, delay: i * 0.04 }}
                      className={cn(
                        "group flex flex-col gap-3 rounded-xl border border-purple-500/15 p-3 sm:flex-row sm:gap-4 sm:p-4",
                        "bg-[rgba(28,32,72,0.45)] backdrop-blur-md",
                        "shadow-[0_12px_40px_-12px_rgba(0,0,0,0.75)]",
                        "transition hover:shadow-[0_16px_48px_-10px_rgba(0,0,0,0.85)]"
                      )}
                    >
                      <div className="relative mx-auto shrink-0 sm:mx-0">
                        <div
                          className="pointer-events-none absolute left-1/2 top-1/2 h-[85%] w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-purple-500/18 blur-2xl"
                          aria-hidden
                        />
                        <div className="relative flex h-[120px] w-[120px] items-center justify-center overflow-hidden rounded-lg bg-black/25 shadow-[0_0_28px_rgba(147,51,234,0.22)] sm:h-[124px] sm:w-[124px]">
                          {img ? (
                            <img
                              src={img}
                              alt=""
                              className={cn(
                                "h-full w-full transition duration-500 group-hover:scale-[1.02]",
                                card.image_url ? "object-contain" : "object-cover"
                              )}
                            />
                          ) : (
                            <BookOpen className="h-14 w-14 text-purple-400/85" aria-hidden />
                          )}
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-purple-950/35" />
                        </div>
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                        <div className="min-w-0 space-y-1.5 sm:space-y-2">
                          <h2 className="text-base font-bold leading-snug text-white sm:text-lg">{card.title}</h2>
                          <p className="line-clamp-2 text-[13px] leading-relaxed text-slate-200/85 sm:text-sm">
                            {card.description}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                          <p className="flex flex-wrap items-center gap-1.5 text-sm text-white">
                            <span className={cn("font-bold tabular-nums", brandLogoGradientText)}>
                              {card.plays_today.toLocaleString()}
                            </span>
                            <span>players today</span>
                            <BookOpen className="h-4 w-4 shrink-0 text-purple-400/95" aria-hidden />
                          </p>
                          <Button
                            asChild
                            size="sm"
                            className={cn("shrink-0 shadow-inner hover:text-white", challengePrimaryCtaSm)}
                          >
                            <Link
                              href={route("challenge-hub.play", {
                                track: track.slug,
                                challenge: card.slug ?? card.key,
                              })}
                              className="inline-flex items-center"
                            >
                              Start Quiz
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </motion.article>
                  )
                })
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}
