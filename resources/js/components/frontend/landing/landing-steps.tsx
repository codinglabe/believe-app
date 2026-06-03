import { Link } from "@inertiajs/react"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { LANDING_STEPS } from "./landing-data"
import {
  GradientCtaButton,
  LandingContainer,
  LandingEyebrow,
  LandingGradientText,
  LandingSection,
} from "./landing-section"
import { landingTheme } from "./landing-theme"

export function LandingSteps() {
  return (
    <LandingSection
      id="how-it-works"
      className={`border-b ${landingTheme.sectionWhite}`}
    >
      <div className={landingTheme.glowPurpleBottom} aria-hidden />

      <LandingContainer className="relative">
        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl text-center"
        >
          <LandingEyebrow>Getting started</LandingEyebrow>
          <h2 className={`mt-5 text-2xl font-bold tracking-tight min-[400px]:text-3xl sm:text-4xl ${landingTheme.heading}`}>
            How Believe In Unity <LandingGradientText>works</LandingGradientText>
          </h2>
          <p className={`mt-4 text-base leading-relaxed sm:text-lg ${landingTheme.bodyText}`}>
            From signup to measurable impact in five clear steps—no complex setup, no
            disconnected onboarding calls.
          </p>
        </motion.div>

        {/* Tablet — horizontal scroll */}
        <div className="relative mt-10 hidden md:block lg:hidden">
          <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
            <ol className="flex w-max gap-4">
              {LANDING_STEPS.map((step, index) => (
                <motion.li
                  key={step.step}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="w-[200px] shrink-0 sm:w-[220px]"
                >
                  <div
                    className={`flex h-full flex-col px-4 pb-5 pt-4 text-center ${landingTheme.card} bg-slate-50/90 ${landingTheme.cardHover} dark:bg-slate-900/50`}
                  >
                    <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-xs font-bold text-white">
                      {step.step}
                    </span>
                    <div className="mx-auto mt-3 flex h-10 w-10 items-center justify-center rounded-full border border-purple-200/60 bg-white dark:border-purple-800/50 dark:bg-slate-950">
                      <step.icon className={`h-5 w-5 ${landingTheme.iconColor}`} />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{step.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {step.description}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        </div>

        {/* Desktop timeline */}
        <div className="relative mt-14 hidden lg:block">
          <div
            className="pointer-events-none absolute left-[10%] right-[10%] top-[52px] h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent dark:via-purple-600"
            aria-hidden
          />
          <ol className="grid grid-cols-5 gap-4 xl:gap-6">
            {LANDING_STEPS.map((step, index) => (
              <motion.li
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: index * 0.07, duration: 0.45 }}
                className="relative flex flex-col"
              >
                <div className="mx-auto flex flex-col items-center">
                  <div
                    className={`relative z-10 flex min-h-[180px] w-full flex-col items-center px-3 pb-5 pt-4 text-center xl:min-h-[200px] xl:px-4 ${landingTheme.card} bg-slate-50/90 ${landingTheme.cardHover} dark:bg-slate-900/50`}
                  >
                    <span className="absolute -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-xs font-bold text-white shadow-md ring-4 ring-white dark:ring-slate-950">
                      {step.step}
                    </span>
                    <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-full border border-purple-200/60 bg-white dark:border-purple-800/50 dark:bg-slate-950">
                      <step.icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>

        {/* Mobile / tablet — vertical timeline */}
        <div className="relative mt-10 md:hidden">
          <div
            className="pointer-events-none absolute bottom-4 left-[27px] top-4 w-px bg-gradient-to-b from-purple-400 via-blue-400 to-purple-400 dark:from-purple-700 dark:via-blue-700 dark:to-purple-700"
            aria-hidden
          />
          <ol className="space-y-0">
          {LANDING_STEPS.map((step, index) => (
            <motion.li
              key={step.step}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-24px" }}
              transition={{ delay: index * 0.06 }}
                className="relative flex gap-5 pb-10 last:pb-0"
            >
              <div className="relative z-10 flex shrink-0 flex-col items-center">
                <span className={`flex h-14 w-14 items-center justify-center border-2 ${landingTheme.iconRing}`}>
                  <step.icon className={`h-6 w-6 ${landingTheme.iconColor}`} />
                </span>
                <span className="mt-1 text-[10px] font-bold tabular-nums text-purple-600 dark:text-purple-400">
                  {String(step.step).padStart(2, "0")}
                </span>
              </div>
              <div className={`min-w-0 flex-1 p-5 ${landingTheme.card} bg-slate-50/80 dark:bg-slate-900/40`}>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {step.description}
                </p>
              </div>
            </motion.li>
          ))}
          </ol>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:mt-14 sm:flex-row sm:items-center sm:gap-4"
        >
          <Link href={route("register")} className="w-full sm:w-auto">
            <GradientCtaButton className="w-full sm:w-auto">Start your organization</GradientCtaButton>
          </Link>
          <Link
            href="#tools"
            className={`inline-flex items-center gap-2 text-sm ${landingTheme.link}`}
          >
            Explore platform tools
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </LandingContainer>
    </LandingSection>
  )
}
