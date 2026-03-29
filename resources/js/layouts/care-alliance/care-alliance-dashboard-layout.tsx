"use client"

import { Link, usePage } from "@inertiajs/react"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import { route } from "ziggy-js"
import {
  HeartHandshake,
  Home,
  LogOut,
  Menu,
  Megaphone,
  Settings2,
  Users,
  X,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { PageHead } from "@/components/frontend/PageHead"
import { Button } from "@/components/frontend/ui/button"
import { CsrfTokenSync } from "@/components/CsrfTokenSync"
import toast, { Toaster } from "react-hot-toast"
import { cn } from "@/lib/utils"

export type CareAllianceDashboardSection = "members" | "campaigns" | "settings"

const NAV: { id: CareAllianceDashboardSection; label: string; description: string; icon: typeof Users }[] = [
  { id: "members", label: "Members", description: "Invites & orgs", icon: Users },
  { id: "campaigns", label: "Campaigns", description: "Splits & donate links", icon: Megaphone },
  { id: "settings", label: "Alliance Settings", description: "Profile & categories", icon: Settings2 },
]

function workspaceHref(id: CareAllianceDashboardSection): string {
  switch (id) {
    case "members":
      return route("care-alliance.workspace.members", { tab: "invite" })
    case "campaigns":
      return route("care-alliance.workspace.campaigns")
    case "settings":
      return route("profile.edit")
    default:
      return route("care-alliance.workspace.members", { tab: "invite" })
  }
}

export interface CareAllianceDashboardLayoutProps {
  allianceName: string
  section: CareAllianceDashboardSection
  children: ReactNode
}

export default function CareAllianceDashboardLayout({
  allianceName,
  section,
  children,
}: CareAllianceDashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const page = usePage<{ success?: string; error?: string }>()

  useEffect(() => {
    const success = page.props?.success
    const error = page.props?.error
    if (typeof success === "string" && success.trim() !== "") toast.success(success)
    if (typeof error === "string" && error.trim() !== "") toast.error(error)
  }, [page.props?.success, page.props?.error])

  const activeNav = NAV.find((n) => n.id === section)
  const title = activeNav?.label ?? "Dashboard"
  const subtitle = activeNav?.description ?? ""

  const initials = useMemo(() => {
    const parts = allianceName.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return "CA"
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
  }, [allianceName])

  const NavLink = ({
    item,
    onPick,
  }: {
    item: (typeof NAV)[number]
    onPick?: () => void
  }) => {
    const Icon = item.icon
    const active = section === item.id
    return (
      <Link
        href={workspaceHref(item.id)}
        onClick={() => onPick?.()}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all",
          active
            ? "bg-gradient-to-r from-violet-500/25 to-purple-600/15 text-white shadow-[inset_0_0_0_1px_rgba(167,139,250,0.45)]"
            : "text-white/70 hover:bg-white/10 hover:text-white",
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
            active
              ? "border-violet-400/50 bg-violet-500/20 text-violet-100"
              : "border-white/15 bg-white/10 text-white/60 group-hover:border-white/25 group-hover:text-white/90",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium leading-tight">{item.label}</span>
          <span className="block truncate text-xs text-white/50 group-hover:text-white/65">{item.description}</span>
        </span>
      </Link>
    )
  }

  const sidebarInner = (afterNav?: () => void) => (
    <>
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-white/15 px-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 text-xs font-bold text-white shadow-md shadow-purple-900/40 dark:from-violet-600 dark:to-purple-800">
          {initials}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold text-white">{allianceName}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-violet-200/95">
            <HeartHandshake className="h-3 w-3 shrink-0" />
            Care Alliance
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">Workspace</p>
        {NAV.map((item) => (
          <NavLink key={item.id} item={item} onPick={afterNav} />
        ))}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-white/15 p-3">
        <Link
          href="/"
          onClick={afterNav}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Home className="h-4 w-4 shrink-0" />
          Believe home
        </Link>
        <Link
          href={route("logout.main")}
          method="post"
          as="button"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-rose-200"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Log out
        </Link>
      </div>
    </>
  )

  return (
    <>
      <PageHead title={`${allianceName} — Care Alliance`} />
      <CsrfTokenSync />
      <Toaster position="top-right" />

      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-violet-950 via-slate-950 to-indigo-950 text-slate-100">
        <div className="pointer-events-none absolute inset-0 bg-black/55" />
        <div className="pointer-events-none absolute inset-0 bg-purple-950/45" />
        <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.06]" />

        <div className="relative min-h-screen lg:h-screen lg:min-h-0 lg:overflow-hidden">
          {/* Desktop sidebar — fixed; not in flex flow so main pl-[280px] is the only offset */}
          <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[280px] flex-col overflow-hidden border-r border-white/15 bg-gray-900/55 shadow-[4px_0_32px_-8px_rgba(0,0,0,0.35)] backdrop-blur-xl dark:bg-gray-950/65 lg:flex">
            <div className="flex h-full min-h-0 flex-col">{sidebarInner()}</div>
          </aside>

          {/* Mobile drawer */}
          <AnimatePresence>
            {mobileOpen && (
              <>
                <motion.button
                  type="button"
                  aria-label="Close menu"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                  onClick={() => setMobileOpen(false)}
                />
                <motion.aside
                  initial={{ x: -300 }}
                  animate={{ x: 0 }}
                  exit={{ x: -300 }}
                  transition={{ type: "spring", damping: 28, stiffness: 320 }}
                  className="fixed inset-y-0 left-0 z-50 flex w-[min(300px,92vw)] flex-col border-r border-white/15 bg-gray-900/95 shadow-2xl backdrop-blur-xl dark:bg-gray-950/95 lg:hidden"
                >
                  <div className="flex h-14 shrink-0 items-center justify-end border-b border-white/10 px-2">
                    <Button type="button" variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="text-white/80">
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  {sidebarInner(() => setMobileOpen(false))}
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* Main column — offset for fixed sidebar on lg+ */}
          <div className="relative z-10 flex min-h-screen min-w-0 flex-col lg:min-h-0 lg:h-full lg:pl-[280px]">
            <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-white/15 bg-gray-900/55 px-4 shadow-sm backdrop-blur-xl dark:bg-gray-950/65 lg:hidden">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold tracking-tight text-white">{title}</p>
                <p className="truncate text-xs text-white/60">{allianceName}</p>
              </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="sticky top-0 z-20 hidden h-14 shrink-0 items-center border-b border-white/15 bg-gray-900/55 px-4 shadow-sm backdrop-blur-xl dark:bg-gray-950/65 sm:px-6 lg:flex">
                <div className="flex w-full items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-wider text-white/55 sm:inline">
                      Care Alliance
                    </span>
                    <span className="hidden text-white/25 sm:inline" aria-hidden>
                      ·
                    </span>
                    <h1 className="min-w-0 truncate text-base font-semibold tracking-tight text-white">{title}</h1>
                  </div>
                  {subtitle ? (
                    <p className="hidden max-w-md truncate text-xs text-white/55 md:block" title={subtitle}>
                      {subtitle}
                    </p>
                  ) : null}
                </div>
              </div>

              <main className="relative min-h-0 w-full flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 lg:px-6 lg:py-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={section}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="w-full min-w-0"
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </main>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
