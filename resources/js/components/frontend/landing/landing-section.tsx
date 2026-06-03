import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { landingTheme } from "./landing-theme"

export function LandingSection({
  children,
  className,
  id,
}: {
  children: ReactNode
  className?: string
  id?: string
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative overflow-x-hidden py-12 text-slate-900 sm:py-16 lg:py-20 dark:text-white",
        className,
      )}
    >
      {children}
    </section>
  )
}

export function LandingContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>
}

export function LandingEyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn(landingTheme.eyebrow, className)}>{children}</span>
}

export function LandingGradientText({
  children,
  className,
  hero,
}: {
  children: ReactNode
  className?: string
  hero?: boolean
}) {
  return (
    <span className={cn(hero ? landingTheme.gradientTextHero : landingTheme.gradientText, className)}>
      {children}
    </span>
  )
}

export function LandingHeading({
  eyebrow,
  title,
  subtitle,
  center,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  center?: boolean
}) {
  return (
    <div className={cn("mb-10 sm:mb-14", center && "mx-auto max-w-3xl text-center")}>
      {eyebrow ? <LandingEyebrow className="mb-3">{eyebrow}</LandingEyebrow> : null}
      <h2 className={cn("text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-tight", landingTheme.heading)}>
        {title}
      </h2>
      {subtitle ? <p className={cn("mt-4 text-base leading-relaxed sm:text-lg", landingTheme.bodyText)}>{subtitle}</p> : null}
    </div>
  )
}

export function GradientCtaButton({
  children,
  href,
  onClick,
  variant = "primary",
  className,
}: {
  children: ReactNode
  href?: string
  onClick?: () => void
  variant?: "primary" | "outline"
  className?: string
}) {
  const classes = cn(
    variant === "primary" ? landingTheme.primaryBtn : landingTheme.outlineBtn,
    className,
  )

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {children}
    </button>
  )
}
