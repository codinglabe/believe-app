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
  event_id?: number
  is_correct: boolean
  /** Display letter (legacy); prefer {@link correct_answer_text} in UI. */
  correct_option: string
  /** Full text of the correct choice (not A/B/C/D). */
  correct_answer_text?: string | null
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
  /** easy | medium | hard | practice */
  quiz_mode?: string
  practice_mode?: boolean
  reward_points_balance?: number
  quiz_session_streak?: number
  /** Same hub card as /play/{challenge} — sent on every quiz POST so subcategory + generation stay aligned. */
  play_challenge_slug?: string | null
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
    quiz_mode: quizMode = "medium",
    practice_mode: practiceMode = false,
    play_challenge_slug: playChallengeSlug = null,
  } = props

  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(question_time_limit_seconds)
  const timeoutSubmittedRef = useRef(false)
  const [loadingNextQuestion, setLoadingNextQuestion] = useState(false)
  const [loadingNextPhase, setLoadingNextPhase] = useState<"quick" | "long">("quick")
  const [finishingQuiz, setFinishingQuiz] = useState(false)

  const limitSec = Math.max(1, question_time_limit_seconds ?? 10)

  useEffect(() => {
    if (!loadingNextQuestion) {
      setLoadingNextPhase("quick")
      return
    }
    const t = window.setTimeout(() => setLoadingNextPhase("long"), 2600)
    return () => window.clearTimeout(t)
  }, [loadingNextQuestion])

  const challengePayload = {
    quiz_mode: quizMode,
    ...(playChallengeSlug ? { challenge: playChallengeSlug } : {}),
  }

  const requestNext = () => {
    setSelected(null)
    router.post(
      route("challenge-hub.next", track.slug),
      challengePayload,
      {
        preserveScroll: true,
        preserveState: false,
        onStart: () => setLoadingNextQuestion(true),
        onFinish: () => setLoadingNextQuestion(false),
      }
    )
  }

  const requestFinish = () => {
    router.post(route("challenge-hub.finish", track.slug), challengePayload, {
      preserveScroll: true,
      preserveState: false,
      onStart: () => setFinishingQuiz(true),
      onFinish: () => setFinishingQuiz(false),
    })
  }

  const submitTimedOut = useCallback(() => {
    if (!activeQuestion) return
    if (timeoutSubmittedRef.current) return
    timeoutSubmittedRef.current = true
    setSubmitting(true)
    router.post(
      route("challenge-hub.answer", track.slug),
      { event_id: activeQuestion.event_id, timed_out: true, ...challengePayload },
      {
        preserveScroll: true,
        preserveState: false,
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
        ...challengePayload,
      },
      {
        preserveScroll: true,
        preserveState: false,
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

  const challengesHref = route("challenge-hub.challenges", track.slug)

  const playShell = !showQuizResults

  const isStartScreen = !activeQuestion && !showFeedback && !exhausted
  const isFeedbackOnly = !!(showFeedback && lastResult)

  /** From challenges modal (?begin=1): skip intro “Start” and fetch first question immediately. */
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("begin") !== "1") return

    const u = new URL(window.location.href)
    u.searchParams.delete("begin")
    const qs = u.searchParams.toString()
    window.history.replaceState(null, "", `${u.pathname}${qs ? `?${qs}` : ""}${u.hash}`)

    if (!isStartScreen) return

    requestNext()
  }, [isStartScreen])

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
                className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 px-6 backdrop-blur-md dark:bg-[#03030a]/78"
              >
                <motion.div
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={springTransition}
                  className="flex max-w-sm flex-col items-center gap-5 rounded-3xl border border-purple-200/90 bg-white px-8 py-10 text-center shadow-xl shadow-slate-300/40 dark:border-purple-500/35 dark:bg-[#070714]/90 dark:shadow-none"
                >
                  <div className="relative flex h-16 w-16 items-center justify-center">
                    <span className="absolute inset-0 animate-ping rounded-full bg-purple-500/25" aria-hidden />
                    <span className="absolute inset-2 rounded-full bg-gradient-to-br from-purple-600/40 to-blue-900/30 blur-sm" aria-hidden />
                    <Loader2 className="relative h-9 w-9 animate-spin text-purple-600 dark:text-purple-300" strokeWidth={2} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {loadingNextPhase === "long"
                        ? "Crafting new questions for you"
                        : "Preparing your question"}
                    </p>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-white/65">
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
                  ? "flex min-h-[100dvh] flex-col justify-start px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-12"
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
                      "relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-purple-500/45 shadow-[0_0_36px_rgba(147,51,234,0.35)] dark:shadow-none",
                      !track.cover_image_url && "bg-gradient-to-br from-purple-600/35 to-blue-950/50"
                    )}
                  >
                    {track.cover_image_url ? (
                      <>
                        <img src={track.cover_image_url} alt={track.name} className="h-full w-full object-cover" />
                        <div
                          className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-purple-600/18 to-blue-950/40 ring-1 ring-inset ring-black/10 dark:ring-white/10"
                          aria-hidden
                        />
                      </>
                    ) : (
                      <HeroIcon className="h-10 w-10 text-purple-600 dark:text-purple-300" strokeWidth={1.25} />
                    )}
                  </div>
                  <h1 className={cn(challengeHeroTitle, "text-3xl sm:text-4xl md:text-[2.65rem]")}>{hero.title}</h1>
                  <p className="line-clamp-6 text-[15px] leading-relaxed text-slate-700 dark:text-white/85 sm:text-base">{hero.subtitle}</p>
                  {!playHeroFromCard && track.hub_card_description ? (
                    <p className="max-w-xl text-sm leading-relaxed text-slate-600 dark:text-white/75">{track.hub_card_description}</p>
                  ) : null}

                  <motion.div
                    key="start"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={springTransition}
                    className="mt-6 w-full max-w-lg rounded-3xl border border-purple-200/90 bg-white/95 p-10 text-center shadow-xl shadow-slate-300/35 backdrop-blur-md dark:border-purple-500/35 dark:bg-[#070714]/65 dark:shadow-none sm:mt-8 sm:p-12"
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
                  isFeedbackOnly && "flex min-h-0 w-full flex-1 flex-col items-center justify-start"
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
                      className="rounded-3xl border border-purple-200/90 bg-white/95 p-8 text-center backdrop-blur-md dark:border-purple-500/30 dark:bg-[#070714]/65"
                    >
                      <p className="mb-6 leading-relaxed text-slate-700 dark:text-white/75">{exhaustedMessage}</p>
                      <div className="flex flex-wrap justify-center gap-3">
                        <Button
                          variant="secondary"
                          disabled={loadingNextQuestion}
                          onClick={requestNext}
                          className="border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                        >
                          Try again
                        </Button>
                        <Button asChild variant="outline" className="border-purple-400/60 text-purple-700 hover:bg-purple-50 dark:border-purple-500/35 dark:text-purple-100 dark:hover:bg-purple-500/10">
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
                          className="text-[1.4rem] font-semibold leading-snug text-slate-900 dark:text-white sm:text-2xl sm:leading-relaxed"
                        >
                          {activeQuestion.question}
                        </motion.p>
                      </motion.div>

                      <div className="grid gap-3">
                        {activeQuestion.option_rows.map((row, i) => {
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
                                  ? "border-emerald-500/60 bg-gradient-to-br from-emerald-100 via-emerald-50 to-emerald-100/90 shadow-md shadow-emerald-200/50 dark:border-purple-500/70 dark:from-emerald-900/55 dark:via-emerald-950/75 dark:to-[#052e1f]/90 dark:shadow-none"
                                  : "border-purple-300/80 bg-white/95 backdrop-blur-[2px] hover:border-purple-400 dark:border-purple-500/35 dark:bg-[#0c0d18]/72 dark:hover:border-purple-500/55 dark:hover:bg-[#101125]/80"
                              )}
                            >
                              <span className="min-w-0 flex-1 text-left text-[15px] leading-snug text-slate-800 dark:text-white/95">
                                {row.text}
                              </span>
                              {selected === answerKey ? (
                                <Check className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
                              ) : (
                                <span className="h-6 w-6 shrink-0" aria-hidden />
                              )}
                            </motion.button>
                          )
                        })}
                      </div>

                      <Button
                        disabled={!selected || submitting || finishingQuiz}
                        onClick={submitAnswer}
                        className={cn("w-full", challengePrimaryCta)}
                      >
                        Submit answer
                      </Button>
                    </motion.div>
                  )}

                  {showFeedback && lastResult && (
                    <motion.div
                      key={`feedback-${lastResult.event_id ?? "unknown"}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={springTransition}
                      className="mx-auto w-full max-w-lg shrink-0 self-center -translate-y-1 sm:-translate-y-2"
                    >
                      <div
                        className={cn(
                          "rounded-3xl border-2 p-6 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.75)] backdrop-blur-xl dark:shadow-none",
                          lastResult.is_correct
                            ? "border-emerald-400/70 bg-emerald-50/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-purple-500/55 dark:bg-[#0a0812]/80 dark:shadow-none"
                            : "border-rose-300/80 bg-rose-50/95 dark:border-rose-500/40 dark:bg-[#140a10]/85"
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
                              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-emerald-800 dark:text-emerald-100">Correct!</span>
                              {!practiceMode ? (
                                <span className={cn("ml-auto text-xl font-bold tabular-nums", brandLogoGradientText)}>
                                  +{lastResult.points_awarded} Points
                                </span>
                              ) : (
                                <span className="ml-auto text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-white/45">
                                  Practice
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <XCircle className="h-8 w-8 text-rose-500 dark:text-rose-400" />
                              <span className="text-rose-800 dark:text-rose-100">
                                {lastResult.timed_out ? "Time's up" : "Not quite"}
                              </span>
                              {!practiceMode &&
                              typeof lastResult.points_awarded === "number" &&
                              lastResult.points_awarded < 0 ? (
                                <span className="ml-auto text-lg font-bold tabular-nums text-rose-700 dark:text-rose-200">
                                  {lastResult.points_awarded.toLocaleString(undefined, { maximumFractionDigits: 2 })} pts
                                </span>
                              ) : practiceMode ? (
                                <span className="ml-auto text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-white/45">
                                  Practice
                                </span>
                              ) : null}
                            </>
                          )}
                        </motion.div>
                        <p className="text-sm leading-relaxed text-slate-600 dark:text-white/70">
                          <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <span className="shrink-0 text-slate-500 dark:text-white/55">Correct answer:</span>
                            <span className="min-w-0 font-semibold text-purple-800 dark:text-purple-100">
                              {lastResult.correct_answer_text?.trim()
                                ? lastResult.correct_answer_text
                                : lastResult.correct_option}
                            </span>
                          </span>
                        </p>
                        {lastResult.explanation && (
                          <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-white/80">{lastResult.explanation}</p>
                        )}
                        {!practiceMode ? (
                          <p className="mt-4 inline-flex items-center gap-2 text-xs text-slate-500 dark:text-white/50">
                            <Coins className="h-4 w-4 text-purple-600 dark:text-purple-400/85" />
                            Balance: {lastResult.reward_points_balance}
                          </p>
                        ) : (
                          <p className="mt-4 text-xs text-slate-500 dark:text-white/45">Practice mode — your balance is unchanged.</p>
                        )}

                        <div className="mt-8 flex w-full flex-row flex-nowrap items-stretch gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="default"
                            disabled={loadingNextQuestion || finishingQuiz}
                            onClick={requestFinish}
                            className="h-12 min-w-0 flex-1 shrink rounded-2xl border-2 border-slate-300 bg-white/90 px-3 text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:border-white/20 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10"
                          >
                            {finishingQuiz ? (
                              <span className="inline-flex min-h-0 w-full items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                                <span className="truncate">Ending…</span>
                              </span>
                            ) : (
                              <span className="truncate">Stop — results</span>
                            )}
                          </Button>
                          <Button
                            type="button"
                            disabled={loadingNextQuestion || finishingQuiz}
                            onClick={requestNext}
                            className={cn(
                              challengePrimaryCta,
                              "h-12 min-w-0 flex-1 shrink px-3 py-0 text-base font-bold leading-none"
                            )}
                            aria-label="Continue to next question"
                          >
                            <span className="truncate">Continue</span>
                          </Button>
                        </div>
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
              <Button asChild variant="ghost" className="text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white">
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
