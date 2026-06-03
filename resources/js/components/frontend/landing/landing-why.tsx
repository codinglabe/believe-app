import { Link } from "@inertiajs/react"
import { motion } from "framer-motion"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { LANDING_WHY_CHOOSE, LANDING_WHY_STATS } from "./landing-data"
import {
  LandingContainer,
  LandingEyebrow,
  LandingGradientText,
  LandingSection,
} from "./landing-section"
import { landingTheme } from "./landing-theme"

const TRUST_POINTS = [
  "No per-tool integration fees",
  "Transparent nonprofit pricing",
  "Dedicated onboarding support",
] as const

export function LandingWhy() {
  return (
    <LandingSection
      id="why-believe-in-unity"
      className={`border-y ${landingTheme.sectionWhite}`}
    >
      <div className={landingTheme.glowPurple} aria-hidden />

      <LandingContainer className="relative">
        <div className="grid gap-10 md:gap-12 lg:grid-cols-12 lg:gap-16 lg:items-start">
          {/* Left — editorial intro */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-4 lg:sticky lg:top-24 xl:top-28"
          >
            <LandingEyebrow className="mt-0">Why Believe In Unity</LandingEyebrow>

            <h2 className={`mt-5 text-2xl font-bold tracking-tight min-[400px]:text-3xl sm:text-4xl ${landingTheme.heading}`}>
              Why organizations <LandingGradientText>choose us</LandingGradientText>
            </h2>

            <p className={`mt-4 text-base leading-relaxed sm:text-lg ${landingTheme.bodyText}`}>
              Replace disconnected tools with one mission-driven operating system—designed
              for nonprofits, churches, schools, and community groups that need clarity,
              trust, and room to grow.
            </p>

            <ul className="mt-6 space-y-2.5">
              {TRUST_POINTS.map((point) => (
                <li key={point} className={`flex items-start gap-2.5 text-sm ${landingTheme.bodyText}`}>
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${landingTheme.iconColor}`} />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <Link
              href={route("pricing")}
              className={`mt-8 inline-flex items-center gap-2 text-sm ${landingTheme.link}`}
            >
              View plans & pricing
              <ArrowRight className="h-4 w-4" />
            </Link>

            <dl className="mt-8 grid grid-cols-3 gap-2 border-t border-slate-200 pt-6 sm:mt-10 sm:gap-4 sm:pt-8 dark:border-slate-800">
              {LANDING_WHY_STATS.map((stat) => (
                <div key={stat.label} className="text-center sm:text-left">
                  <dt className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl lg:text-3xl">
                    {stat.value}
                  </dt>
                  <dd className="mt-1 text-xs leading-snug text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </dd>
                </div>
              ))}
            </dl>
          </motion.div>

          {/* Right — benefit cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
            {LANDING_WHY_CHOOSE.map((item, index) => (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: index * 0.05, duration: 0.45 }}
                className={`group relative overflow-hidden ${landingTheme.card} bg-slate-50/80 p-6 ${landingTheme.cardHover} dark:bg-slate-900/40`}
              >
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-purple-600/10 to-blue-600/5 opacity-0 transition group-hover:opacity-100"
                  aria-hidden
                />

                <div className="relative flex items-start gap-4">
                  <div className="flex shrink-0 flex-col items-center gap-2">
                    <span className="text-[11px] font-semibold tabular-nums text-purple-500/80 dark:text-purple-400/80">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className={`flex h-11 w-11 items-center justify-center ${landingTheme.iconRing} transition group-hover:border-purple-300 group-hover:ring-purple-100 dark:group-hover:ring-purple-900/40`}>
                      <item.icon className={`h-5 w-5 ${landingTheme.iconColor}`} />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 pt-0.5">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {item.description}
                    </p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </LandingContainer>
    </LandingSection>
  )
}
