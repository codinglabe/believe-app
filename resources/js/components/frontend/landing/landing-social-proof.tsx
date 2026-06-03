import { motion } from "framer-motion"
import { Quote, Star } from "lucide-react"
import { LANDING_PARTNERS, LANDING_TESTIMONIALS } from "./landing-data"
import {
  LandingContainer,
  LandingEyebrow,
  LandingGradientText,
  LandingSection,
} from "./landing-section"
import { landingTheme } from "./landing-theme"

function PartnerMark({
  partner,
}: {
  partner: (typeof LANDING_PARTNERS)[number]
}) {
  return (
    <div className={`group flex w-full items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-4 ${landingTheme.card} ${landingTheme.cardHover}`}>
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${partner.accent} text-sm font-bold tracking-tight text-white shadow-sm`}
      >
        {partner.initials}
      </div>
      <div className="min-w-0 text-left">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
          {partner.name}
        </p>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {partner.descriptor}
        </p>
      </div>
    </div>
  )
}

function TestimonialAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-sm font-bold text-white ring-2 ring-white dark:ring-slate-900">
      {initials}
    </span>
  )
}

export function LandingSocialProof() {
  return (
    <LandingSection
      id="trusted-by"
      className={`border-b ${landingTheme.sectionMuted}`}
    >
      <div className={landingTheme.glowPurple} aria-hidden />

      <LandingContainer className="relative">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl text-center"
        >
          <LandingEyebrow>Trusted partners</LandingEyebrow>
          <h2 className={`mt-5 text-2xl font-bold tracking-tight min-[400px]:text-3xl sm:text-4xl ${landingTheme.heading}`}>
            Organizations making a <LandingGradientText>difference every day</LandingGradientText>
          </h2>
          <p className={`mt-4 text-base leading-relaxed sm:text-lg ${landingTheme.bodyText}`}>
            Churches, nonprofits, and community groups use Believe In Unity to unite their
            teams and amplify impact.
          </p>
        </motion.div>

        {/* Partner organizations */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.08 }}
          className="mt-12"
        >
          <p className="mb-5 text-center text-xs font-semibold uppercase tracking-widest text-slate-400">
            Proud to support
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LANDING_PARTNERS.map((partner, index) => (
              <motion.div
                key={partner.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <PartnerMark partner={partner} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Testimonials */}
        <div className="mt-16 lg:mt-20">
          <div className="mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                What leaders are saying
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Real feedback from executive directors, pastors, and program leads.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-1 text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
              <span className="ml-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                5.0 average rating
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {LANDING_TESTIMONIALS.map((t, index) => (
              <motion.article
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-32px" }}
                transition={{ delay: index * 0.07, duration: 0.45 }}
                className={`group relative flex flex-col overflow-hidden p-6 shadow-sm ${landingTheme.card} ${landingTheme.cardHover}`}
              >
                <Quote
                  className="absolute right-5 top-5 h-8 w-8 text-purple-100 dark:text-purple-900/80"
                  aria-hidden
                />
                <div className="mb-4 flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="relative flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                  <TestimonialAvatar name={t.name} />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white">{t.name}</p>
                    <p className="truncate text-xs text-slate-500">{t.role}</p>
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
