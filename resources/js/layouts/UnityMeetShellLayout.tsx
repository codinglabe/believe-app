"use client"

import type { ReactNode } from "react"
import { Link, usePage } from "@inertiajs/react"
import { cn } from "@/lib/utils"
import Navbar from "@/components/frontend/layout/navbar"
import Footer from "@/components/frontend/layout/footer"
import {
  LayoutDashboard,
  Calendar,
  Radio,
  Video,
  Play,
} from "lucide-react"

type PagePropsLike = {
  auth?: { roles?: string[]; user?: { name?: string; email?: string } }
  url?: string
}

function NavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string
  icon: ReactNode
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      <span className={cn(active ? "text-primary-foreground" : "text-muted-foreground")}>{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  )
}

export default function UnityMeetShellLayout({ children }: { children: ReactNode }) {
  const page = usePage<PagePropsLike>()
  const pathname = (page.url ?? "").split("?")[0].split("#")[0]
  const url = page.url ?? ""
  const roles = page.props.auth?.roles ?? []
  const roleSet = new Set(roles.map((r) => r.toLowerCase()))
  const showFrontendChrome = roleSet.size === 0 || roleSet.has("user")

  const shell = (
    <div className="relative flex min-h-screen w-full">
        <aside
          className={cn(
            "hidden w-64 shrink-0 border-r border-border bg-card/40 md:flex md:flex-col md:sticky md:self-start",
            showFrontendChrome ? "md:top-16 md:h-[calc(100vh-4rem)]" : "md:top-0 md:h-screen"
          )}
        >
          <div className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Video className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">Unity Meet</p>
              <p className="text-xs text-muted-foreground truncate">Meetings & recordings</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            <NavItem
              href="/livestreams/supporter"
              icon={<LayoutDashboard className="h-4 w-4" />}
              label="Dashboard"
              active={pathname === "/livestreams/supporter" && !url.includes("view=meetings")}
            />
            <NavItem
              href="/livestreams/supporter?view=meetings"
              icon={<Calendar className="h-4 w-4" />}
              label="My meetings"
              active={pathname === "/livestreams/supporter" && url.includes("view=meetings")}
            />
            <NavItem
              href="/livestreams/supporter/recordings"
              icon={<Play className="h-4 w-4" />}
              label="Recordings"
              active={pathname === "/livestreams/supporter/recordings"}
            />
            <NavItem
              href="/livestreams/supporter/live"
              icon={<Radio className="h-4 w-4" />}
              label="Live"
              active={pathname === "/livestreams/supporter/live"}
            />
          </nav>

          {/* No auth user block in sidebar footer (per UX mock) */}
        </aside>

        <main className="min-h-screen flex-1 min-w-0">
          {children}
        </main>
      </div>
  )

  if (!showFrontendChrome) {
    return <div className="min-h-screen bg-background">{shell}</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>{shell}</main>
      <Footer />
    </div>
  )
}

