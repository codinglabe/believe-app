import type { ReactNode } from "react"

export function StripeConnectPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-br from-purple-600/15 via-blue-600/10 to-transparent dark:from-purple-600/20 dark:via-blue-600/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-10 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl dark:bg-purple-500/15"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 top-40 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/15"
      />
      <div className="relative w-full px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
        {children}
      </div>
    </div>
  )
}
