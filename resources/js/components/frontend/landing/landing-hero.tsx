import { useState } from "react"
import { Link } from "@inertiajs/react"
import { motion } from "framer-motion"
import { Play } from "lucide-react"
import { LANDING_HERO_BENEFITS } from "./landing-data"
import { LandingHeroHub } from "./landing-hero-hub"
import { LandingFilingButton } from "./landing-filing-button"
import { LandingHeroVideoModal } from "./landing-hero-video-modal"
import { GradientCtaButton, LandingGradientText } from "./landing-section"
import { landingTheme } from "./landing-theme"

type LandingHeroProps = {
  headline?: string
  subtitle?: string
}

export function LandingHero({ headline, subtitle }: LandingHeroProps) {
  const [videoOpen, setVideoOpen] = useState(false)
  const title = headline ?? "One Platform. One Mission."
  const highlight = "Unlimited Impact."
  const sub =
    subtitle ??
    "The all-in-one operating system for nonprofits, churches, schools, and community organizations — donations, CRM, events, email, video meetings, marketplace, and more."

  return (
    <section
      className={`relative overflow-x-hidden pb-10 pt-5 sm:pb-16 sm:pt-8 lg:pb-20 ${landingTheme.bandLight} ${landingTheme.bandDark}`}
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

      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 px-4 sm:gap-10 sm:px-6 md:grid-cols-2 md:gap-10 lg:gap-12 lg:px-8">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="min-w-0"
        >
          <h1 className={`text-[1.65rem] font-bold leading-[1.12] tracking-tight min-[360px]:text-3xl min-[400px]:text-4xl sm:text-5xl lg:text-[3.25rem] ${landingTheme.heading}`}>
            {title}{" "}
            <LandingGradientText hero className="inline">
              {highlight}
            </LandingGradientText>
          </h1>
          <p className={`mt-4 max-w-xl text-sm leading-relaxed min-[360px]:mt-5 min-[360px]:text-base sm:text-lg ${landingTheme.bodyText}`}>{sub}</p>

          <ul className="mt-5 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 min-[360px]:gap-2.5 sm:mt-8 sm:max-w-lg sm:gap-3">
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

          <div className="mt-5 grid w-full max-w-xl grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:mt-8 lg:max-w-none lg:grid-cols-3 lg:gap-3">
            <Link href={route("register")} className="min-w-0">
              <GradientCtaButton
                className={`w-full ${landingTheme.heroBtnHeight} ${landingTheme.heroBtnText} whitespace-nowrap px-4 py-0 sm:px-6`}
              >
                Get Started
              </GradientCtaButton>
            </Link>
            <button
              type="button"
              onClick={() => setVideoOpen(true)}
              className={`inline-flex w-full min-w-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full border-2 border-purple-600 bg-white px-3 text-purple-700 shadow-sm transition hover:bg-purple-50 sm:gap-2 sm:px-5 dark:border-white/25 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 ${landingTheme.heroBtnHeight} ${landingTheme.heroBtnText}`}
            >
              <span
                className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white ${landingTheme.heroBtnIcon}`}
              >
                <Play className="h-3.5 w-3.5 fill-white sm:h-4 sm:w-4" />
              </span>
              Watch Our Impact
            </button>
            <LandingFilingButton
              variant="hero"
              className="w-full min-[400px]:col-span-2 lg:col-span-1"
            />
          </div>

          <LandingHeroVideoModal open={videoOpen} onOpenChange={setVideoOpen} />

          <p className={`mt-4 text-xs sm:text-sm ${landingTheme.bodyText}`}>
            By using Believe In Unity you agree to our{" "}
            <a href="/terms-of-service" className="font-medium text-purple-600 underline underline-offset-2 hover:text-purple-700 dark:text-purple-300">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy-policy" className="font-medium text-purple-600 underline underline-offset-2 hover:text-purple-700 dark:text-purple-300">
              Privacy Policy
            </a>
            .
          </p>

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
          className="flex w-full min-w-0 justify-center md:justify-end"
        >
          <div className="w-full max-w-[420px]">
            <LandingHeroHub />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
