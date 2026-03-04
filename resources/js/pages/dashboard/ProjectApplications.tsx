"use client"

import AppLayout from "@/layouts/app-layout"
import { usePage, Link } from "@inertiajs/react"
import { FileText, User, Building2, Mail, Calendar } from "lucide-react"
import type { BreadcrumbItem } from "@/types"

interface Lead {
  id: number
  name: string
  company: string
  email: string
  project_summary: string
  created_at: string
}

interface PageProps {
  projectApplicationsLeads: {
    data: Lead[]
    current_page: number
    last_page: number
    links: { url: string | null; label: string; active: boolean }[]
  }
  projectApplicationsTotal: number
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" })
  } catch {
    return iso
  }
}

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Project Applications", href: "/dashboard/project-applications" },
]

export default function DashboardProjectApplications() {
  const { projectApplicationsLeads, projectApplicationsTotal } = usePage<PageProps>().props
  const list = projectApplicationsLeads?.data ?? []

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Applications</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Applications you submitted via the fundraise form (Name, Company, Email, Project summary).
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total: <strong className="text-gray-900 dark:text-white">{projectApplicationsTotal}</strong> application{projectApplicationsTotal !== 1 ? "s" : ""}
          </p>
        </div>

        {list.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center">
            <FileText className="w-14 h-14 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No project applications yet.</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Applications appear here when you submit the form on{" "}
              <Link href="/fundraise" className="text-violet-600 dark:text-violet-400 hover:underline">/fundraise</Link>.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {list.map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <User className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
                        <span className="font-semibold text-gray-900 dark:text-white">{lead.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{lead.company}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
                        <a
                          href={`mailto:${lead.email}`}
                          className="text-violet-600 dark:text-violet-400 hover:underline truncate"
                        >
                          {lead.email}
                        </a>
                      </div>
                      <div className="flex items-start gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                          {lead.project_summary}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 shrink-0">
                      <Calendar className="w-4 h-4" />
                      {formatDate(lead.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {projectApplicationsLeads.last_page > 1 && projectApplicationsLeads.links?.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
                {projectApplicationsLeads.links.map((link, i) =>
                  link.url ? (
                    <Link
                      key={i}
                      href={link.url}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        link.active
                          ? "bg-violet-600 text-white border-violet-600"
                          : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      {link.label.replace("&laquo; Previous", "Previous").replace("Next &raquo;", "Next")}
                    </Link>
                  ) : (
                    <span key={i} className="px-3 py-2 text-gray-400 text-sm">
                      {link.label.replace("&laquo; Previous", "Previous").replace("Next &raquo;", "Next")}
                    </span>
                  )
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
