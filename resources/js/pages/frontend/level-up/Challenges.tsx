import React, { useState } from "react"
import { router, usePage } from "@inertiajs/react"
import { motion } from "framer-motion"
import { PageHead } from "@/components/frontend/PageHead"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Button } from "@/components/frontend/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/frontend/ui/dialog"
import {
  Activity,
  BookOpen,
  Building2,
  DollarSign,
  Flame,
  Gauge,
  Globe2,
  Heart,
  Landmark,
  Sparkles,
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
  challengePrimaryCta,
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
  /** easy | medium | hard | practice — from session / ?quiz_mode= */
  quiz_mode?: string
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

const QUIZ_LEVEL_MODAL_OPTIONS = [
  {
    id: "easy" as const,
    label: "Easy",
    hint: "Gentle questions to build confidence.",
    Icon: Sparkles,
  },
  {
    id: "medium" as const,
    label: "Medium",
    hint: "Balanced challenge for most learners.",
    Icon: Gauge,
  },
  {
    id: "hard" as const,
    label: "Hard",
    hint: "Tougher questions — bring your A-game.",
    Icon: Flame,
  },
  {
    id: "practice" as const,
    label: "Practice",
    hint: "Mixed levels, no points — learn freely.",
    Icon: BookOpen,
  },
]

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
    quiz_mode: quizModeFromServer = "medium",
  } = usePage<Props>().props

  const [quizModalOpen, setQuizModalOpen] = useState(false)
  const [pendingCard, setPendingCard] = useState<QuizCard | null>(null)
  const [selectedMode, setSelectedMode] = useState(quizModeFromServer)

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

  const openStartModal = (card: QuizCard) => {
    setPendingCard(card)
    setSelectedMode(quizModeFromServer)
    setQuizModalOpen(true)
  }

  const playHrefForCard = (card: QuizCard, mode: string) =>
    `${route("challenge-hub.play", {
      track: track.slug,
      challenge: card.slug ?? card.key,
    })}?quiz_mode=${encodeURIComponent(mode)}`

  const goToPlay = () => {
    if (!pendingCard) return
    router.visit(playHrefForCard(pendingCard, selectedMode))
    setQuizModalOpen(false)
    setPendingCard(null)
  }

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
                  "relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-purple-500/45 shadow-[0_0_36px_rgba(147,51,234,0.35)] dark:shadow-none",
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
                      className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-purple-600/18 to-blue-950/40 ring-1 ring-inset ring-black/10 dark:ring-white/10"
                      aria-hidden
                    />
                  </>
                ) : (
                  <HeroIcon className="h-10 w-10 text-purple-600 dark:text-purple-300" strokeWidth={1.25} />
                )}
              </div>
              <h1
                className={cn(challengeHeroTitle, "text-3xl sm:text-4xl md:text-[2.65rem]")}
              >
                {hero.title}
              </h1>
              {challengesCount > 0 ? (
                <p className="inline-flex items-center justify-center gap-2 text-base font-semibold tabular-nums text-purple-800 dark:text-purple-100/95 sm:text-lg">
                  <BookOpen className="h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400/90" aria-hidden />
                  <span>
                    {challengesCount.toLocaleString()}{" "}
                    {challengesCount === 1 ? "Challenge" : "Challenges"}
                  </span>
                </p>
              ) : null}
              <p className="text-[15px] text-slate-700 dark:text-white/85 sm:text-base">{hero.subtitle}</p>
              {track.hub_card_description ? (
                <p className="max-w-xl text-sm leading-relaxed text-slate-600 dark:text-white/75">{track.hub_card_description}</p>
              ) : null}
            </motion.div>
          </section>

          <div className="mx-auto max-w-6xl px-4 sm:px-8">
            <Dialog
              open={quizModalOpen}
              onOpenChange={(open) => {
                setQuizModalOpen(open)
                if (!open) {
                  setPendingCard(null)
                }
              }}
            >
              <DialogContent
                className={cn(
                  "max-h-[min(92dvh,640px)] max-w-[min(100vw-1.5rem,440px)] overflow-y-auto border border-purple-300/90 bg-white/98 p-0 text-slate-900 shadow-xl shadow-slate-300/40 backdrop-blur-xl dark:border-purple-500/40 dark:bg-[#070714]/95 dark:text-white dark:shadow-none sm:rounded-2xl",
                  "[&>button]:text-slate-500 [&>button]:hover:bg-slate-100 [&>button]:hover:text-slate-900 dark:[&>button]:text-white/70 dark:[&>button]:hover:bg-white/10 dark:[&>button]:hover:text-white"
                )}
              >
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(147,51,234,0.25),transparent_55%)]" />
                <div className="relative px-5 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-7">
                  <DialogHeader className="space-y-2 text-center sm:text-center">
                    <DialogTitle
                      className={cn(
                        "font-serif text-2xl font-bold tracking-tight sm:text-[1.65rem]",
                        brandLogoGradientText
                      )}
                    >
                      Choose question level
                    </DialogTitle>
                    <DialogDescription className="text-[13px] leading-relaxed text-slate-600 dark:text-white/65">
                      {pendingCard ? (
                        <>
                          Starting{" "}
                          <span className="font-semibold text-purple-700 dark:text-purple-200/95">“{pendingCard.title}”</span>
                          . Pick how challenging the questions should be.
                        </>
                      ) : (
                        "Pick how challenging the questions should be."
                      )}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3">
                    {QUIZ_LEVEL_MODAL_OPTIONS.map((level) => {
                      const active = selectedMode === level.id
                      const Icon = level.Icon
                      return (
                        <button
                          key={level.id}
                          type="button"
                          onClick={() => setSelectedMode(level.id)}
                          className={cn(
                            "flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition sm:p-3.5",
                            active
                              ? "border-purple-400/65 bg-gradient-to-br from-purple-100/95 to-blue-50/95 shadow-md shadow-purple-200/50 ring-1 ring-purple-300/50 dark:from-purple-600/35 dark:to-blue-950/40 dark:shadow-none dark:ring-purple-400/30"
                              : "border-slate-200 bg-slate-50/90 hover:border-purple-400/40 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-purple-500/35 dark:hover:bg-white/[0.06]"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-lg border",
                              active
                                ? "border-purple-400/50 bg-purple-100 text-purple-900 dark:border-purple-400/40 dark:bg-purple-500/20 dark:text-purple-100"
                                : "border-slate-200 bg-white text-purple-700 dark:border-white/10 dark:bg-black/20 dark:text-purple-300/90"
                            )}
                          >
                            <Icon className="h-4 w-4 sm:h-[1.1rem] sm:w-[1.1rem]" strokeWidth={2} aria-hidden />
                          </span>
                          <span>
                            <span className="block text-sm font-bold text-slate-900 dark:text-white">{level.label}</span>
                            <span className="mt-0.5 block text-[11px] leading-snug text-slate-500 dark:text-white/50">{level.hint}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 sm:w-auto dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                      onClick={() => {
                        setQuizModalOpen(false)
                        setPendingCard(null)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      className={cn("w-full sm:w-auto", challengePrimaryCta)}
                      onClick={goToPlay}
                      disabled={!pendingCard}
                    >
                      Start quiz
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <motion.div
              className="grid gap-4 sm:grid-cols-2 sm:gap-5"
              initial="initial"
              animate="animate"
              variants={staggerContainer}
            >
              {quiz_cards.length === 0 ? (
                <div className="col-span-full rounded-xl border border-purple-200/90 bg-slate-50/95 px-6 py-14 text-center shadow-lg shadow-slate-200/50 backdrop-blur-md dark:border-purple-500/20 dark:bg-[rgba(20,25,55,0.5)] dark:shadow-none">
                  <p className="text-slate-600 dark:text-slate-400">{challenges_empty_heading}</p>
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
                        "group flex flex-col gap-3 rounded-xl border border-purple-200/90 bg-white/95 p-3 shadow-lg shadow-slate-200/40 backdrop-blur-md sm:flex-row sm:gap-4 sm:p-4",
                        "dark:border-purple-500/15 dark:bg-[rgba(28,32,72,0.45)]",
                        "dark:shadow-none",
                        "transition hover:shadow-xl dark:hover:shadow-none"
                      )}
                    >
                      <div className="relative mx-auto shrink-0 sm:mx-0">
                        <div
                          className="pointer-events-none absolute left-1/2 top-1/2 h-[85%] w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-purple-500/18 blur-2xl"
                          aria-hidden
                        />
                        <div className="relative flex h-[120px] w-[120px] items-center justify-center overflow-hidden rounded-lg bg-slate-100 shadow-md shadow-purple-200/40 dark:bg-black/25 dark:shadow-none sm:h-[124px] sm:w-[124px]">
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
                          <h2 className="text-base font-bold leading-snug text-slate-900 dark:text-white sm:text-lg">{card.title}</h2>
                          <p className="line-clamp-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-200/85 sm:text-sm">
                            {card.description}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                          <p className="flex flex-wrap items-center gap-1.5 text-sm text-slate-700 dark:text-white">
                            <span className={cn("font-bold tabular-nums", brandLogoGradientText)}>
                              {card.plays_today.toLocaleString()}
                            </span>
                            <span>players today</span>
                            <BookOpen className="h-4 w-4 shrink-0 text-purple-400/95" aria-hidden />
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            className={cn("shrink-0 shadow-inner dark:hover:text-white", challengePrimaryCtaSm)}
                            onClick={() => openStartModal(card)}
                          >
                            Start Quiz
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
