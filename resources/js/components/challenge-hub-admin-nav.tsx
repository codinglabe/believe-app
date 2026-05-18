"use client"

import { Link } from "@inertiajs/react"

declare global {
  function route(name: string, params?: Record<string, unknown> | (string | number)[]): string
}

export type ChallengeHubNavKey = "categories" | "tracks" | "challenges" | "questions" | "subcategories"

const navClass = (active: boolean) =>
  active
    ? "font-semibold text-foreground underline decoration-2 underline-offset-4"
    : "text-muted-foreground hover:text-foreground hover:underline"

export function ChallengeHubAdminNav({ active }: { active: ChallengeHubNavKey }) {
  return (
    <nav className="mb-6 flex w-full flex-wrap items-center justify-end gap-x-8 gap-y-2 border-b border-border pb-4 text-sm">
      <Link href={route("admin.challenge-hub.categories.index")} className={navClass(active === "categories")}>
        Categories
      </Link>
      <Link href={route("admin.challenge-hub.tracks.index")} className={navClass(active === "tracks")}>
        Tracks
      </Link>
      <Link href={route("admin.challenge-hub.challenges.index")} className={navClass(active === "challenges")}>
        Challenges
      </Link>
      <Link href={route("admin.challenge-hub.questions.index")} className={navClass(active === "questions")}>
        Questions
      </Link>
      <Link href={route("admin.challenge-hub.subcategories.index")} className={navClass(active === "subcategories")}>
        Subcategories
      </Link>
    </nav>
  )
}
