import { Link } from "@inertiajs/react"
import { motion } from "framer-motion"
import { Play } from "lucide-react"
import { LANDING_HERO_BENEFITS } from "./landing-data"
import { LandingHeroHub } from "./landing-hero-hub"
import { GradientCtaButton, LandingGradientText } from "./landing-section"
import { landingTheme } from "./landing-theme"

type LandingHeroProps = {
  headline?: string
  subtitle?: string
}

export function LandingHero({ headline, subtitle }: LandingHeroProps) {
  const title = headline ?? "One Platform. One Mission."
  const highlight = "Unlimited Impact."
  const sub =
    subtitle ??
    "The all-in-one operating system for nonprofits, churches, schools, and community organizations — donations, CRM, events, email, video meetings, marketplace, and more."

  return (
    <section
      className={`relative overflow-x-hidden pb-12 pt-6 sm:pb-16 sm:pt-8 lg:pb-20 ${landingTheme.bandLight} ${landingTheme.bandDark}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(147,51,234,0.18), transparent 45%), radial-gradient(circle at 80% 20%, rgba(59,130,246,0.14), transparent 40%)",
        }}
        aria-hidden
      />
      <div className={landingTheme.bandOverlayLight} aria-hidden />
      <div className={landingTheme.dotGrid} aria-hidden />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-8 px-4 sm:gap-10 sm:px-6 md:grid-cols-2 md:gap-12 lg:px-8">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className={`text-3xl font-bold leading-[1.1] tracking-tight min-[400px]:text-4xl sm:text-5xl lg:text-[3.25rem] ${landingTheme.heading}`}>
            {title}{" "}
            <LandingGradientText hero>{highlight}</LandingGradientText>
          </h1>
          <p className={`mt-5 max-w-xl text-base leading-relaxed sm:text-lg ${landingTheme.bodyText}`}>{sub}</p>

          <ul className="mt-6 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 min-[420px]:gap-3 sm:mt-8 sm:max-w-lg">
            {LANDING_HERO_BENEFITS.map(({ label, icon: Icon }) => (
              <li
                key={label}
                className="flex items-center gap-2 rounded-lg border border-purple-200/80 bg-white/90 px-3 py-2 text-xs text-slate-700 shadow-sm backdrop-blur-sm min-[420px]:text-sm dark:border-white/10 dark:bg-white/5 dark:text-purple-50/90"
              >
                <Icon className={`h-4 w-4 shrink-0 ${landingTheme.iconColor}`} />
                <span className="min-w-0">{label}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <Link href={route("register")} className="w-full sm:w-auto">
              <GradientCtaButton className="w-full sm:w-auto">Get Started</GradientCtaButton>
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-purple-600 bg-white px-5 py-3 text-sm font-semibold text-purple-700 shadow-sm transition hover:bg-purple-50 sm:w-auto sm:justify-start sm:px-6 sm:py-3.5 sm:text-base dark:border-white/25 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                <Play className="h-4 w-4 fill-white" />
              </span>
              Watch 2-Minute Demo
            </a>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex -space-x-2 shrink-0">
              {["SM", "JT", "ML", "AK"].map((initials) => (
                <span
                  key={initials}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-purple-600 to-blue-600 text-xs font-bold text-white dark:border-[#0a0514]"
                >
                  {initials}
                </span>
              ))}
            </div>
            <p className={`text-xs sm:text-sm ${landingTheme.bodyText}`}>
              Trusted by organizations making a difference every day
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="flex justify-center md:justify-end"
        >
          <LandingHeroHub />
        </motion.div>
      </div>
    </section>
  )
}
