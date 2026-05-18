"use client"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { Link } from "@inertiajs/react"
import { ArrowLeft, Building2, ExternalLink, Clock, FileText } from "lucide-react"

interface Lead {
  id: number
  name: string
  company: string
  email: string
  project_summary: string
  wefunder_project_url: string | null
  created_at: string
  is_own?: boolean
}

interface PageProps {
  lead: Lead
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" })
  } catch {
    return iso
  }
}

export default function ProjectApplicationShow({ lead }: PageProps) {
  const hasWefunderLink = !!lead.wefunder_project_url

  return (
    <ProfileLayout
      title="Project Application"
      description={`${lead.company} — ${hasWefunderLink ? "Open for investment" : "Application in review"}`}
    >
      <div className="space-y-6">
        <Link
          href={route("user.profile.project-applications")}
          className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Applications
        </Link>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Building2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{lead.company}</h2>
              {lead.is_own && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
                  Your application
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasWefunderLink ? (
                <Link
                  href={route("invest.redirect", { lead: lead.id })}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Invest
                </Link>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  Application in Review
                </span>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{lead.name}</span>
              <span>·</span>
              <span>{formatDate(lead.created_at)}</span>
            </div>

            <div className="flex items-start gap-2">
              <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project summary</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{lead.project_summary}</p>
              </div>
            </div>

            {!hasWefunderLink && (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic border-t border-gray-100 dark:border-gray-700 pt-4">
                This investment is being reviewed and is not yet open for funding. Investing is subject to regulatory requirements and due diligence.
              </p>
            )}
          </div>
        </div>
      </div>
    </ProfileLayout>
  )
}
