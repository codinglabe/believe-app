"use client"

import KioskDashboardLayout from "@/layouts/kiosk/KioskDashboardLayout"
import { PageHead } from "@/components/frontend/PageHead"
import { router } from "@inertiajs/react"
import { motion } from "framer-motion"
import {
  Link2,
  ExternalLink,
  Bell,
  CheckCircle,
  HelpCircle,
  Calendar,
  Video,
  MapPin,
  Upload,
  Search,
  FileText,
  BookOpen,
  Heart,
  Gift,
  Car,
  AlertCircle,
  Scale,
  ChevronRight,
  Sparkles,
  Clock,
  UserCheck,
} from "lucide-react"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  link: Link2,
  external: ExternalLink,
  bell: Bell,
  check: CheckCircle,
  help: HelpCircle,
  calendar: Calendar,
  video: Video,
  map: MapPin,
  upload: Upload,
  search: Search,
  file: FileText,
  book: BookOpen,
  users: Heart,
  heart: Heart,
  utensils: Gift,
  gift: Gift,
  bus: Car,
  car: Car,
  "alert-circle": AlertCircle,
  scale: Scale,
  "graduation-cap": BookOpen,
  briefcase: FileText,
}

interface ActionItem {
  key: string
  label: string
  description: string
  icon: string
  url?: string | null
}

interface DashboardProps {
  category: { slug: string; title: string; keywords: string }
  actions: ActionItem[]
  context: {
    provider_linked: boolean
    last_accessed_at: string | null
    next_suggested_action: string | null
    status: string | null
  }
  allCategories: { slug: string; title: string }[]
}

export default function KioskDashboard({
  category,
  actions,
  context,
  allCategories,
}: DashboardProps) {
  const handleLaunch = (action: ActionItem) => {
    if (!action.url) return
    router.post(route("kiosk.dashboard.log-action"), {
      category_slug: category.slug,
      action_key: `launched_${action.key}`,
    }, { preserveScroll: true })
    if (action.url.startsWith("http")) {
      window.open(action.url, "_blank", "noopener,noreferrer")
    } else {
      window.location.href = action.url
    }
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return "First visit"
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }

  return (
    <KioskDashboardLayout allCategories={allCategories} currentSlug={category.slug}>
      <PageHead title={`${category.title} - Kiosk`} description={category.keywords} />
      <div className="flex-1 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page title */}
          <h1 className="text-2xl font-bold text-foreground mb-1">{category.title}</h1>
          {/* Tagline */}
          <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
            The fastest way to get things done. Launch services, track actions, get help — all in one place.
          </p>

          {/* Light context card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-10"
          >
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Your context
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Last accessed</p>
                    <p className="text-sm font-medium text-foreground">{formatDate(context.last_accessed_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <UserCheck className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Provider linked</p>
                    <p className="text-sm font-medium text-foreground">{context.provider_linked ? "Yes" : "Not yet"}</p>
                  </div>
                </div>
                {context.next_suggested_action && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800">
                    <ChevronRight className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Suggested</p>
                      <p className="text-sm font-medium text-foreground">{context.next_suggested_action}</p>
                    </div>
                  </div>
                )}
                {context.status && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Status</p>
                      <p className="text-sm font-medium text-foreground">{context.status}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Action cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {actions.map((action, index) => {
              const IconComponent = iconMap[action.icon] || HelpCircle
              const hasUrl = !!action.url?.trim()
              return (
                <motion.div
                  key={action.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.05 }}
                  className={`rounded-2xl border-2 bg-white dark:bg-slate-900 overflow-hidden transition-all duration-300 ${
                    hasUrl
                      ? "border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-lg cursor-pointer"
                      : "border-slate-200 dark:border-slate-700 hover:shadow-md"
                  }`}
                >
                  <div
                    className="p-6 flex flex-col h-full"
                    onClick={() => hasUrl && handleLaunch(action)}
                    onKeyDown={(e) => hasUrl && (e.key === "Enter" || e.key === " ") && handleLaunch(action)}
                    role={hasUrl ? "button" : undefined}
                    tabIndex={hasUrl ? 0 : undefined}
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                        <IconComponent className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      {hasUrl && (
                        <span className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                          Launch
                          <ExternalLink className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground text-lg mb-1">{action.label}</h3>
                    <p className="text-sm text-muted-foreground flex-1">{action.description}</p>
                    {hasUrl && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <span className="text-xs text-muted-foreground font-mono truncate block">
                          {action.url?.startsWith("http") ? "External link" : action.url}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Smart nudge placeholder */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/40 p-8 text-center"
          >
            <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
            <p className="text-sm font-medium text-foreground mb-1">Smart nudges</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Personalized reminders and suggestions will appear here based on your activity — no balance or sensitive data, just the next best action.
            </p>
          </motion.div>
        </div>
      </div>
    </KioskDashboardLayout>
  )
}
