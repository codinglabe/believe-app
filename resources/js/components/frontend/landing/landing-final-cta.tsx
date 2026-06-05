import { Link } from "@inertiajs/react"
import { motion } from "framer-motion"
import { ArrowRight, ChevronRight } from "lucide-react"
import { LandingFilingButton } from "./landing-filing-button"
import { LandingCtaBackground } from "./landing-cta-background"
import { LandingCtaVisual } from "./landing-cta-visual"
import { LandingContainer, LandingGradientText } from "./landing-section"
import { landingTheme } from "./landing-theme"

export function LandingFinalCta() {
  return (
    <section
      id="get-started"
      className={`relative overflow-x-hidden py-10 sm:py-12 lg:py-14 ${landingTheme.ctaBand}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 60%, rgba(147,51,234,0.2), transparent 50%), radial-gradient(circle at 85% 40%, rgba(59,130,246,0.15), transparent 45%)",
        }}
        aria-hidden
      />
      <div className={landingTheme.bandOverlayLight} aria-hidden />
      <div className={landingTheme.dotGrid} aria-hidden />
      <LandingCtaBackground />

      <LandingContainer className="relative z-10">
        <div className="grid items-center gap-6 md:grid-cols-2 md:gap-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="order-2 flex items-center justify-center md:order-1 md:justify-start"
          >
            <LandingCtaVisual className="h-auto w-full max-w-[160px] min-[400px]:max-w-[180px] sm:max-w-[220px] md:max-w-[240px] lg:max-w-[260px]" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="order-1 flex flex-col justify-center text-center md:order-2 md:text-left"
          >
            <h2 className={`text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl ${landingTheme.heading}`}>
              Ready to Unite, Simplify and{" "}
              <LandingGradientText className="block sm:inline">Amplify Your Impact?</LandingGradientText>
            </h2>

            <p className={`mx-auto mt-3 max-w-xl text-sm leading-relaxed sm:text-base md:mx-0 ${landingTheme.bodyText}`}>
              Join thousands of organizations already making a bigger difference with Believe
              In Unity.
            </p>

            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center md:justify-start">
              <Link
                href={route("register")}
                className={`w-full sm:w-auto ${landingTheme.primaryBtn} px-6 py-3 text-sm sm:px-8 sm:py-3.5 sm:text-base`}
              >
                Get Started Today
                <ArrowRight className="h-5 w-5" />
              </Link>
              <LandingFilingButton variant="outline" />
              <Link
                href={route("pricing")}
                className={`w-full sm:w-auto ${landingTheme.outlineBtn} px-6 py-3 text-sm sm:px-8 sm:py-3.5 sm:text-base`}
              >
                Explore Features
                <ChevronRight className="h-5 w-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </LandingContainer>
    </section>
  )
}
