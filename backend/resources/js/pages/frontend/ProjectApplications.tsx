"use client";

import FrontendLayout from "@/layouts/frontend/frontend-layout";
import { PageHead } from "@/components/frontend/PageHead";
import { Link } from "@inertiajs/react";
import { FileText, Mail, Building2, User, Calendar } from "lucide-react";

interface Lead {
  id: number;
  name: string;
  company: string;
  email: string;
  project_summary: string;
  created_at: string;
}

interface Props {
  seo?: { title: string; description?: string };
  leads: {
    data: Lead[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: { url: string | null; label: string; active: boolean }[];
  };
  total: number;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

export default function ProjectApplicationsPage({ seo, leads, total }: Props) {
  const list = leads.data || [];

  return (
    <FrontendLayout>
      <PageHead
        title={seo?.title ?? "Project Applications"}
        description={seo?.description ?? "View project applications requested through the fundraise funnel."}
      />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Project Applications Requested
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Founders who submitted the short form and continued to Wefunder. Showing all applications from our database.
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
              Total: <strong className="text-gray-700 dark:text-gray-300">{total}</strong> application{total !== 1 ? "s" : ""}
            </p>
          </div>

          {list.length === 0 ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center">
              <FileText className="w-14 h-14 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No project applications yet.</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Applications appear here when someone submits the form on{" "}
                <Link href="/fundraise" className="text-violet-600 dark:text-violet-400 hover:underline">/fundraise</Link>.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {list.map((lead) => (
                  <div
                    key={lead.id}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6 shadow-sm"
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

              {leads.last_page > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
                  {leads.links?.map((link, i) =>
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
                      <span
                        key={i}
                        className="px-3 py-2 text-gray-400 text-sm"
                      >
                        {link.label.replace("&laquo; Previous", "Previous").replace("Next &raquo;", "Next")}
                      </span>
                    )
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </FrontendLayout>
  );
}
