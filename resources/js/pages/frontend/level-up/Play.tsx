import React, { useCallback, useEffect, useRef, useState } from "react"
import { Link, router, usePage } from "@inertiajs/react"
import { AnimatePresence, motion } from "framer-motion"
import { PageHead } from "@/components/frontend/PageHead"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Button } from "@/components/frontend/ui/button"
import {
  Activity,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  Coins,
  DollarSign,
  Globe2,
  Heart,
  Landmark,
  Loader2,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { LevelUpScenery } from "./level-up-scenery"
import { fadeUp, springTransition, staggerContainer } from "./level-up-motion"
import { QuizResultsPanel, type QuizResultPayload } from "./QuizResultsPanel"
import { PlayQuizBackground, PlayTimerPill } from "./play-quiz-chrome"
import {
  brandLogoGradientText,
  challengeHeroTitle,
  challengePlayRootShell,
  challengePrimaryCta,
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
  hub_card_description?: string | null
  cover_image_url?: string | null
  quiz_subcategory?: string | null
}

interface HeroPayload {
  title: string
  subtitle: string
  challenges_count?: number
}

const OPTION_DISPLAY_LABELS = ["A", "B", "C", "D"] as const

interface OptionRow {
  answer_key: (typeof OPTION_DISPLAY_LABELS)[number]
  text: string
}

interface ActiveQuestion {
  event_id: number
  category: string
  subcategory: string | null
  question: string
  option_rows: OptionRow[]
  difficulty: string | null
  /** True when this question was loaded after the pool triggered an OpenAI generation batch. */
  generated_new_questions?: boolean
}

interface LastResult {
  is_correct: boolean
  correct_option: string
  explanation: string | null
  points_awarded: number
  reward_points_balance: number
  response_time_ms?: number
  timed_out?: boolean
}

interface PageProps {
  track: Track
  hero: HeroPayload
  hero_icon: string
  active_category_slug?: string | null
  /** Hero title/subtitle/image came from the quiz card chosen on View Challenges (?card=). */
  play_hero_from_card?: boolean
  answeredCount: number
  activeQuestion: ActiveQuestion | null
  playStatus: string | null
  playMessage: string | null
  lastResult: LastResult | null
  quiz_result: QuizResultPayload | null
  question_time_limit_seconds: number
  reward_points_balance?: number
  quiz_session_streak?: number
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

export default function LevelUpPlay() {
  const { props } = usePage<PageProps>()
  const {
    track,
    hero,
    hero_icon,
    play_hero_from_card: playHeroFromCard = false,
    activeQuestion,
    playStatus,
    playMessage,
    lastResult,
    quiz_result,
    question_time_limit_seconds,
  } = props

  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(question_time_limit_seconds)
  const timeoutSubmittedRef = useRef(false)
  const [loadingNextQuestion, setLoadingNextQuestion] = useState(false)
  const [loadingNextPhase, setLoadingNextPhase] = useState<"quick" | "long">("quick")

  const limitSec = Math.max(1, question_time_limit_seconds ?? 10)

  useEffect(() => {
    if (!loadingNextQuestion) {
      setLoadingNextPhase("quick")
      return
    }
    const t = window.setTimeout(() => setLoadingNextPhase("long"), 2600)
    return () => window.clearTimeout(t)
  }, [loadingNextQuestion])

  const requestNext = () => {
    setSelected(null)
    router.post(
      route("challenge-hub.next", track.slug),
      {},
      {
        preserveScroll: true,
        onStart: () => setLoadingNextQuestion(true),
        onFinish: () => setLoadingNextQuestion(false),
      }
    )
  }

  const submitTimedOut = useCallback(() => {
    if (!activeQuestion) return
    if (timeoutSubmittedRef.current) return
    timeoutSubmittedRef.current = true
    setSubmitting(true)
    router.post(
      route("challenge-hub.answer", track.slug),
      { event_id: activeQuestion.event_id, timed_out: true },
      {
        preserveScroll: true,
        onFinish: () => {
          setSubmitting(false)
          setSelected(null)
        },
      }
    )
  }, [activeQuestion, track.slug])

  const submitAnswer = () => {
    if (!activeQuestion || !selected) return
    timeoutSubmittedRef.current = true
    setSubmitting(true)
    router.post(
      route("challenge-hub.answer", track.slug),
      {
        event_id: activeQuestion.event_id,
        selected_option: selected,
        timed_out: false,
      },
      {
        preserveScroll: true,
        onFinish: () => {
          setSubmitting(false)
          setSelected(null)
        },
      }
    )
  }

  useEffect(() => {
    if (!activeQuestion || lastResult) {
      return
    }
    timeoutSubmittedRef.current = false
    setSecondsLeft(limitSec)
    const started = Date.now()
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - started
      const left = Math.max(0, limitSec - elapsed / 1000)
      setSecondsLeft(left)
      if (left <= 0) {
        window.clearInterval(tick)
      }
    }, 50)
    const fire = window.setTimeout(() => {
      submitTimedOut()
    }, limitSec * 1000)
    return () => {
      window.clearInterval(tick)
      window.clearTimeout(fire)
    }
  }, [activeQuestion?.event_id, limitSec, lastResult, submitTimedOut])

  const showFeedback = !!lastResult
  const exhausted = playStatus === "exhausted" || playStatus === "complete"
  const exhaustedMessage =
    playMessage ||
    (playStatus === "complete" ? "This track has no categories configured yet." : "No more questions available right now.")

  const showQuizResults = !!quiz_result

  const quizSubtitle = activeQuestion?.subcategory
    ? `${activeQuestion.subcategory} Quiz`
    : track.subject_categories?.[0]
      ? `${track.subject_categories[0]} Quiz`
      : "Daily Quiz"

  const challengesHref = route("challenge-hub.challenges", track.slug)

  const playShell = !showQuizResults

  const isStartScreen = !activeQuestion && !showFeedback && !exhausted
  const isFeedbackOnly = !!(showFeedback && lastResult)

  const HeroIcon = CHALLENGE_HUB_ICON_MAP[hero_icon] ?? Heart

  return (
    <FrontendLayout>
      <PageHead title={`${hero.title} — Believe`} description={hero.subtitle} />
      {playShell ? (
        <div className={challengePlayRootShell}>
          <PlayQuizBackground />
          <AnimatePresence>
            {loadingNextQuestion ? (
              <motion.div
                key="next-loading"
                role="status"
                aria-live="polite"
                aria-busy="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[60] flex items-center justify-center bg-[#03030a]/78 px-6 backdrop-blur-md"
              >
                <motion.div
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={springTransition}
                  className="flex max-w-sm flex-col items-center gap-5 rounded-3xl border border-purple-500/35 bg-[#070714]/90 px-8 py-10 text-center shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)]"
                >
                  <div className="relative flex h-16 w-16 items-center justify-center">
                    <span className="absolute inset-0 animate-ping rounded-full bg-purple-500/25" aria-hidden />
                    <span className="absolute inset-2 rounded-full bg-gradient-to-br from-purple-600/40 to-blue-900/30 blur-sm" aria-hidden />
                    <Loader2 className="relative h-9 w-9 animate-spin text-purple-300" strokeWidth={2} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-white">
                      {loadingNextPhase === "long"
                        ? "Crafting new questions for you"
                        : "Preparing your question"}
                    </p>
                    <p className="text-sm leading-relaxed text-white/65">
                      {loadingNextPhase === "long"
                        ? "Our question bank is being refreshed—this can take a few moments."
                        : "Hang tight while we load your next challenge."}
                    </p>
                  </div>
                  <div className="flex gap-1.5" aria-hidden>
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-2 w-2 rounded-full bg-purple-400/80"
                        animate={{ opacity: [0.35, 1, 0.35] }}
                        transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
                      />
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          {isStartScreen && track.cover_image_url ? (
            <div
              className="pointer-events-none absolute inset-0 z-[1] bg-cover bg-center opacity-[0.18]"
              style={{ backgroundImage: `url(${track.cover_image_url})` }}
              aria-hidden
            />
          ) : null}

          <main
            className={cn(
              "relative z-10 mx-auto w-full",
              isStartScreen
                ? "flex min-h-[100dvh] flex-col px-4 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
                : isFeedbackOnly
                  ? "flex min-h-[100dvh] flex-col justify-center px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
                  : "max-w-lg px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]"
            )}
          >
            {isStartScreen ? (
              <section className="w-full px-0 pb-2 pt-2 text-center sm:px-2 sm:pt-4">
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
                        <img src={track.cover_image_url} alt={track.name} className="h-full w-full object-cover" />
                        <div
                          className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-purple-600/18 to-blue-950/40 ring-1 ring-inset ring-white/10"
                          aria-hidden
                        />
                      </>
                    ) : (
                      <HeroIcon className="h-10 w-10 text-purple-300" strokeWidth={1.25} />
                    )}
                  </div>
                  <h1 className={cn(challengeHeroTitle, "text-3xl sm:text-4xl md:text-[2.65rem]")}>{hero.title}</h1>
                  <p className="line-clamp-6 text-[15px] leading-relaxed text-white/85 sm:text-base">{hero.subtitle}</p>
                  {!playHeroFromCard && track.hub_card_description ? (
                    <p className="max-w-xl text-sm leading-relaxed text-white/75">{track.hub_card_description}</p>
                  ) : null}

                  <motion.div
                    key="start"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={springTransition}
                    className="mt-6 w-full max-w-lg rounded-3xl border border-purple-500/35 bg-[#070714]/65 p-10 text-center shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-md sm:mt-8 sm:p-12"
                  >
                    <h2 className={cn("mb-8 font-serif text-3xl font-bold tracking-tight sm:text-4xl", brandLogoGradientText)}>
                      Challenge
                    </h2>
                    <Button
                      disabled={loadingNextQuestion}
                      onClick={requestNext}
                      className={cn("w-full", challengePrimaryCta)}
                    >
                      Start
                    </Button>
                  </motion.div>
                </motion.div>
              </section>
            ) : (
              <div
                className={cn(
                  "w-full",
                  isFeedbackOnly && "flex min-h-0 w-full flex-1 flex-col items-center justify-center"
                )}
              >
              <AnimatePresence mode="wait">
                {showQuizResults && quiz_result ? null : (
                  <>
                  {exhausted && (
                    <motion.div
                      key="exhausted"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={springTransition}
                      className="rounded-3xl border border-purple-500/30 bg-[#070714]/65 p-8 text-center backdrop-blur-md"
                    >
                      <p className="mb-6 leading-relaxed text-white/75">{exhaustedMessage}</p>
                      <div className="flex flex-wrap justify-center gap-3">
                        <Button
                          variant="secondary"
                          disabled={loadingNextQuestion}
                          onClick={requestNext}
                          className="border border-white/15 bg-white/10 text-white hover:bg-white/15"
                        >
                          Try again
                        </Button>
                        <Button asChild variant="outline" className="border-purple-500/35 text-purple-100 hover:bg-purple-500/10">
                          <Link href={challengesHref}>Back to challenges</Link>
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {activeQuestion && !showFeedback && (
                    <motion.div
                      key={`q-${activeQuestion.event_id}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-5"
                    >
                      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.32em] text-purple-400">
                        {quizSubtitle}
                      </p>
                      {activeQuestion.generated_new_questions ? (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ ...springTransition, delay: 0.06 }}
                          className="flex items-center justify-center gap-2 text-center text-xs text-emerald-200/90"
                        >
                          <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-400/90" strokeWidth={2} />
                          Fresh questions were just added for you.
                        </motion.p>
                      ) : null}

                      <PlayTimerPill secondsLeft={secondsLeft} limitSec={limitSec} />

                      <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        className="text-center"
                      >
                        <motion.p
                          variants={fadeUp}
                          transition={springTransition}
                          className="text-[1.4rem] font-semibold leading-snug text-white drop-shadow-sm sm:text-2xl sm:leading-relaxed"
                        >
                          {activeQuestion.question}
                        </motion.p>
                        {activeQuestion.difficulty && (
                          <motion.p
                            variants={fadeUp}
                            transition={{ ...springTransition, delay: 0.05 }}
                            className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/45"
                          >
                            {activeQuestion.difficulty}
                          </motion.p>
                        )}
                      </motion.div>

                      <div className="grid gap-3">
                        {activeQuestion.option_rows.map((row, i) => {
                          const displayLabel = OPTION_DISPLAY_LABELS[i]
                          const answerKey = row.answer_key
                          return (
                            <motion.button
                              key={`${activeQuestion.event_id}-${answerKey}`}
                              type="button"
                              initial={{ opacity: 0, x: -12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ ...springTransition, delay: 0.05 * i }}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => setSelected(answerKey)}
                              className={cn(
                                "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-[1.1rem] text-left transition-all",
                                selected === answerKey
                                  ? "border-purple-500/70 bg-gradient-to-br from-emerald-900/55 via-emerald-950/75 to-[#052e1f]/90 shadow-[0_0_28px_rgba(34,197,94,0.28),0_0_0_1px_rgba(147,51,234,0.35)]"
                                  : "border-purple-500/35 bg-[#0c0d18]/72 backdrop-blur-[2px] hover:border-purple-500/55 hover:bg-[#101125]/80"
                              )}
                            >
                              <span className="flex min-w-0 items-start gap-3">
                                <span className="mt-0.5 font-semibold text-purple-400/90">{displayLabel}.</span>
                                <span className="text-[15px] leading-snug text-white/95">{row.text}</span>
                              </span>
                              {selected === answerKey ? (
                                <Check className="h-6 w-6 shrink-0 text-emerald-400" strokeWidth={2.5} />
                              ) : (
                                <span className="h-6 w-6 shrink-0" aria-hidden />
                              )}
                            </motion.button>
                          )
                        })}
                      </div>

                      <Button disabled={!selected || submitting} onClick={submitAnswer} className={cn("w-full", challengePrimaryCta)}>
                        Submit answer
                      </Button>
                    </motion.div>
                  )}

                  {showFeedback && lastResult && (
                    <motion.div
                      key="feedback"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={springTransition}
                      className="mx-auto w-full max-w-lg shrink-0 self-center"
                    >
                      <div
                        className={cn(
                          "rounded-3xl border-2 p-6 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.75)] backdrop-blur-xl",
                          lastResult.is_correct
                            ? "border-purple-500/55 bg-[#0a0812]/80 shadow-[inset_0_0_48px_rgba(34,197,94,0.1),0_0_40px_-12px_rgba(147,51,234,0.18)]"
                            : "border-rose-500/40 bg-[#140a10]/85"
                        )}
                      >
                        <motion.div
                          initial={{ scale: 0.96, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 24 }}
                          className="mb-4 flex flex-wrap items-center gap-2 text-lg font-semibold"
                        >
                          {lastResult.is_correct ? (
                            <>
                              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                              <span className="text-emerald-100">Correct!</span>
                              <span className={cn("ml-auto text-xl font-bold tabular-nums", brandLogoGradientText)}>
                                +{lastResult.points_awarded} Points
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-8 w-8 text-rose-400" />
                              <span className="text-rose-100">
                                {lastResult.timed_out ? "Time's up" : "Not quite"}
                              </span>
                              {typeof lastResult.points_awarded === "number" && lastResult.points_awarded < 0 ? (
                                <span className="ml-auto text-lg font-bold tabular-nums text-rose-200">
                                  {lastResult.points_awarded.toLocaleString(undefined, { maximumFractionDigits: 2 })} pts
                                </span>
                              ) : null}
                            </>
                          )}
                        </motion.div>
                        <p className="text-sm text-white/70">
                          Correct answer:{" "}
                          <span className="font-semibold text-purple-200">{lastResult.correct_option}</span>
                        </p>
                        {lastResult.explanation && (
                          <p className="mt-4 text-sm leading-relaxed text-white/80">{lastResult.explanation}</p>
                        )}
                        <p className="mt-4 inline-flex items-center gap-2 text-xs text-white/50">
                          <Coins className="h-4 w-4 text-purple-400/85" />
                          Balance: {lastResult.reward_points_balance}
                        </p>

                        <Button
                          type="button"
                          disabled={loadingNextQuestion}
                          onClick={requestNext}
                          className={cn("mt-8 w-full", challengePrimaryCta)}
                          aria-label="Continue to next question"
                        >
                          Continue
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </AnimatePresence>
              </div>
            )}
          </main>
        </div>
      ) : (
        <LevelUpScenery minHeight="min-h-[88vh]" className="py-8">
          <div className="mx-auto w-full max-w-4xl px-2">
            <motion.div
              className="mb-6 flex justify-start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={springTransition}
            >
              <Button asChild variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white">
                <Link href={challengesHref}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to challenges
                </Link>
              </Button>
            </motion.div>
            {quiz_result ? (
              <QuizResultsPanel
                result={quiz_result}
                trackName={track.name}
                onContinue={() => router.get(challengesHref)}
              />
            ) : null}
          </div>
        </LevelUpScenery>
      )}
    </FrontendLayout>
  )
}
