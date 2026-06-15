"use client"

import { Head, Link } from "@inertiajs/react"
import SettingsLayout from "@/layouts/settings/layout"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import {
  AlertCircle,
  Bot,
  Brain,
  CheckCircle2,
  Circle,
  ClipboardList,
  Cloud,
  Landmark,
  Mail,
  Megaphone,
  MessageSquare,
  Radio,
  Settings,
  Sparkles,
  Video,
  Wallet,
  Youtube,
  Facebook,
  ShieldCheck,
  Layers,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

type ItemStatus = "completed" | "in_progress" | "not_started"

type ChecklistItem = {
  id: string
  section: string
  label: string
  description: string
  route: string
  route_label: string
  status: ItemStatus
}

type ChecklistSection = {
  id: string
  label: string
  completed: number
  total: number
  percent: number
  items: ChecklistItem[]
}

type Props = {
  checklist: {
    percent: number
    completed: number
    total: number
    sections: ChecklistSection[]
  }
  organizationName: string
}

const ITEM_ICONS: Record<string, LucideIcon> = {
  integrations: Settings,
  email_invites: Mail,
  social_media: Facebook,
  youtube: Youtube,
  stripe_payouts: Landmark,
  dropbox: Cloud,
  organization_verification: ShieldCheck,
  ai_chat: Bot,
  pay_as_you_go: Wallet,
  overlay_studio: Layers,
  livestream: Video,
  unity_live: Radio,
  unity_meet: MessageSquare,
  ai_video_studio: Sparkles,
  engagement: Mail,
  auto_drip_campaign: Megaphone,
}

const SECTION_ICONS: Record<string, LucideIcon> = {
  system: Settings,
  tools: Brain,
}

function StatusBadge({ status }: { status: ItemStatus }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4" />
        Completed
      </span>
    )
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
        <AlertCircle className="h-4 w-4" />
        In progress
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
      <Circle className="h-4 w-4" />
      Not started
    </span>
  )
}

function ChecklistRow({ item }: { item: ChecklistItem }) {
  const Icon = ITEM_ICONS[item.id] ?? Circle

  return (
    <div className="flex flex-col gap-4 border-b border-gray-100 px-4 py-4 last:border-b-0 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white">{item.label}</h3>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        <StatusBadge status={item.status} />
        <Button
          size="sm"
          variant={item.status === "completed" ? "outline" : "default"}
          className={cn(
            item.status !== "completed" && "bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900"
          )}
          asChild
        >
          <Link href={route(item.route)}>{item.route_label}</Link>
        </Button>
      </div>
    </div>
  )
}

function SectionCard({ section }: { section: ChecklistSection }) {
  const SectionIcon = SECTION_ICONS[section.id] ?? ClipboardList

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-2">
          <SectionIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{section.label}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {section.completed} of {section.total} completed
        </p>
      </div>
      <div className="px-4 pb-4 pt-1 sm:px-5">
        <Progress value={section.percent} className="h-2" />
      </div>
      <div>
        {section.items.map((item) => (
          <ChecklistRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}

export default function OrganizationSetupChecklistPage({ checklist, organizationName }: Props) {
  return (
    <SettingsLayout
      activeTab="setup-checklist"
      pageTitle="Organization setup checklist"
      pageSubtitle={`Track setup for ${organizationName}. Complete each step to unlock the full platform.`}
    >
      <Head title="Organization setup checklist" />

      <div className="space-y-6">
        <div className="rounded-xl border border-purple-200/80 bg-gradient-to-br from-purple-50/80 via-white to-white p-5 dark:border-purple-900/40 dark:from-purple-950/30 dark:via-gray-950 dark:to-gray-950">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Overall progress</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {checklist.completed} of {checklist.total} steps complete
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold tabular-nums text-purple-700 dark:text-purple-300">{checklist.percent}%</p>
            </div>
          </div>
          <Progress value={checklist.percent} className="mt-4 h-2.5" />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href={route("pay-as-you-go.index")}>
              <Wallet className="mr-2 h-4 w-4" />
              Pay-As-You-Go Services
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={route("governance.onboarding.index")}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Governance onboarding
            </Link>
          </Button>
        </div>

        {checklist.sections.map((section) => (
          <SectionCard key={section.id} section={section} />
        ))}
      </div>
    </SettingsLayout>
  )
}
