import { Link } from "@inertiajs/react"
import { motion } from "framer-motion"
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Heart,
  LayoutDashboard,
  Mail,
  Smartphone,
  Users,
} from "lucide-react"
import { LANDING_TOOL_GROUPS } from "./landing-data"
import {
  LandingContainer,
  LandingEyebrow,
  LandingGradientText,
  LandingSection,
} from "./landing-section"
import { landingTheme } from "./landing-theme"

function PlatformPreview() {
  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, active: true },
    { label: "Donations", icon: Heart, active: false },
    { label: "Members", icon: Users, active: false },
    { label: "Events", icon: Calendar, active: false },
    { label: "Email", icon: Mail, active: false },
  ]

  return (
    <div className="relative mx-auto w-full max-w-lg pb-12 sm:pb-8 md:pb-0">
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:shadow-purple-950/20 dark:ring-white/5">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
          </div>
          <div className="mx-auto flex h-7 min-w-0 flex-1 max-w-[220px] items-center justify-center rounded-md bg-white px-3 text-[10px] text-slate-400 dark:bg-slate-800">
            app.believeinunity.org
          </div>
        </div>

        <div className="flex min-h-[280px]">
          {/* Sidebar */}
          <aside className="hidden w-[38%] border-r border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/80 sm:block">
            <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Workspace
            </p>
            <ul className="space-y-1">
              {navItems.map(({ label, icon: Icon, active }) => (
                <li
                  key={label}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-medium ${
                    active
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {label}
                </li>
              ))}
            </ul>
          </aside>

          {/* Main panel */}
          <div className="flex-1 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Overview
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Organization dashboard
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Live
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Raised", value: "$24.8k", change: "+12%" },
                { label: "Members", value: "1,284", change: "+8%" },
                { label: "Events", value: "48", change: "+3" },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <p className="text-[9px] text-slate-500">{metric.label}</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{metric.value}</p>
                  <p className="text-[9px] font-medium text-purple-600 dark:text-purple-400">
                    {metric.change}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-3 flex h-20 items-end gap-1 rounded-lg border border-purple-100 bg-gradient-to-t from-purple-50 to-blue-50/50 p-2 dark:border-slate-800 dark:from-purple-950/40 dark:to-slate-900">
              {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-gradient-to-t from-purple-600 to-blue-500 opacity-90"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="absolute -bottom-2 left-0 flex max-w-[calc(100%-1rem)] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:-bottom-5 sm:-left-6 sm:max-w-none sm:px-4 sm:py-3"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <Smartphone className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-900 dark:text-white">Mobile-ready</p>
          <p className="text-[10px] text-slate-500">Manage on any device</p>
        </div>
      </motion.div>

      {/* Analytics badge */}
      <div className="absolute right-0 top-4 hidden rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-slate-900 md:flex md:-right-6 md:top-1/3 lg:-right-8">
        <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        <span className="ml-2 text-[10px] font-semibold text-slate-700 dark:text-slate-200">
          Real-time insights
        </span>
      </div>
    </div>
  )
}

export function LandingTools() {
  return (
    <LandingSection
      id="tools"
      className={`border-b ${landingTheme.sectionMuted}`}
    >
      <div className={landingTheme.glowBlueCorner} aria-hidden />
      <div className={landingTheme.glowPurple} aria-hidden />

      <LandingContainer className="relative">
        <div className="grid gap-10 md:gap-12 lg:grid-cols-12 lg:gap-14 lg:items-start">
          {/* Tool categories */}
          <div className="min-w-0 lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-2xl"
            >
              <LandingEyebrow>Platform capabilities</LandingEyebrow>
              <h2 className={`mt-5 text-2xl font-bold tracking-tight min-[400px]:text-3xl sm:text-4xl ${landingTheme.heading}`}>
                Powerful tools. <LandingGradientText>One unified platform.</LandingGradientText>
              </h2>
              <p className={`mt-4 text-base leading-relaxed sm:text-lg ${landingTheme.bodyText}`}>
                Every module shares the same data, branding, and permissions—so your team
                fundraises, communicates, and reports without exporting CSVs or switching tabs.
              </p>
            </motion.div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {LANDING_TOOL_GROUPS.map((group, index) => (
                <motion.article
                  key={group.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-32px" }}
                  transition={{ delay: index * 0.04, duration: 0.4 }}
                  className={`group p-5 ${landingTheme.card} ${landingTheme.cardHover}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center ${landingTheme.iconRing} ring-2`}>
                      <group.icon className={`h-5 w-5 ${landingTheme.iconColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{group.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                        {group.summary}
                      </p>
                    </div>
                  </div>
                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {group.items.map((item) => (
                      <li key={item}>
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 transition group-hover:bg-purple-50 group-hover:text-purple-800 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-purple-950/60 dark:group-hover:text-purple-200">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.article>
              ))}
            </div>

            <Link
              href={route("register")}
              className={`mt-8 inline-flex items-center gap-2 text-sm ${landingTheme.link}`}
            >
              Get started with full platform access
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Dashboard preview — sticky on desktop */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="min-w-0 lg:col-span-5 lg:sticky lg:top-24 xl:top-28"
          >
            <p className="mb-6 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 lg:text-left">
              Your command center
            </p>
            <PlatformPreview />
            <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400 lg:text-left">
              One login. Every tool. Built for teams that run on mission, not meetings about
              which app to open next.
            </p>
          </motion.div>
        </div>
      </LandingContainer>
    </LandingSection>
  )
}
