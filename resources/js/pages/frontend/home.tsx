"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { LandingFinalCta } from "@/components/frontend/landing/landing-final-cta"
import { LandingHero } from "@/components/frontend/landing/landing-hero"
import { LandingSocialProof } from "@/components/frontend/landing/landing-social-proof"
import { LandingSteps } from "@/components/frontend/landing/landing-steps"
import { LandingTools } from "@/components/frontend/landing/landing-tools"
import { LandingWhy } from "@/components/frontend/landing/landing-why"
import { usePage } from "@inertiajs/react"

const DEFAULT_HEADLINE = "One Platform. One Mission."
const DEFAULT_SUBTITLE =
  "The all-in-one operating system for nonprofits, churches, schools, and community organizations."

interface PageProps {
  seo?: { title: string; description?: string; share_image?: string }
  homeHero?: { headline: string; subtitle: string }
  }

export default function HomePage() {
  const { seo, homeHero } = usePage<PageProps>().props

  const headline = homeHero?.headline?.includes("Affordable")
    ? "One Platform. One Mission."
    : homeHero?.headline ?? DEFAULT_HEADLINE

  const subtitle =
    homeHero?.subtitle && !homeHero.subtitle.startsWith("Donations •")
      ? homeHero.subtitle
      : DEFAULT_SUBTITLE

    return (
    <FrontendLayout>
      <PageHead
        title={seo?.title ?? "Believe In Unity — One Platform for Nonprofit Impact"}
        description={
          seo?.description ??
          "All-in-one operating system for nonprofits: donations, CRM, events, email, video meetings, marketplace, and more."
        }
        image={seo?.share_image}
      />
      <div className="min-h-screen overflow-x-hidden">
        <LandingHero headline={headline} subtitle={subtitle} />
        <LandingWhy />
        <LandingTools />
        <LandingSteps />
        <LandingSocialProof />
        <LandingFinalCta />
            </div>
    </FrontendLayout>
  )
}
