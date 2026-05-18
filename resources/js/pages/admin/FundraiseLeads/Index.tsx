"use client";

import React from "react";
import { Head, Link } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import type { BreadcrumbItem } from "@/types";

interface FundraiseLead {
  id: number;
  name: string;
  company: string;
  email: string;
  project_summary: string;
  created_at: string;
}

interface FundraiseLeadsIndexProps {
  leads: {
    data: FundraiseLead[];
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

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Fundraise Leads", href: "/admin/fundraise-leads" },
];

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

export default function AdminFundraiseLeadsIndex({ leads, total }: FundraiseLeadsIndexProps) {
  const list = leads.data || [];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Fundraise Leads" />
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Fundraise Leads</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1.5">
            Qualified founders from the <strong>/fundraise</strong> funnel. They filled Name, Company, Email, and Project summary, then continued to Wefunder. Use this to build your founder pipeline and own the relationship.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Total qualified leads: {total}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {list.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 py-8 text-center">
                No leads yet. Leads appear here when someone submits the form on{" "}
                <Link href="/fundraise" className="text-primary underline">/fundraise</Link> and continues to Wefunder.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Name</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Company</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Email</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Project summary</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((lead) => (
                      <tr key={lead.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-2 text-gray-900 dark:text-white">{lead.name}</td>
                        <td className="py-3 px-2 text-gray-700 dark:text-gray-300">{lead.company}</td>
                        <td className="py-3 px-2">
                          <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                            {lead.email}
                          </a>
                        </td>
                        <td className="py-3 px-2 text-gray-600 dark:text-gray-400 max-w-xs truncate" title={lead.project_summary}>
                          {lead.project_summary}
                        </td>
                        <td className="py-3 px-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {formatDate(lead.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {leads.last_page > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                {leads.links?.map((link, i) => (
                  link.url ? (
                    <Link
                      key={i}
                      href={link.url}
                      className={`px-3 py-1 rounded border text-sm ${
                        link.active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      {link.label.replace("&laquo; Previous", "Prev").replace("Next &raquo;", "Next")}
                    </Link>
                  ) : (
                    <span key={i} className="px-3 py-1 text-gray-400 text-sm">
                      {link.label.replace("&laquo; Previous", "Prev").replace("Next &raquo;", "Next")}
                    </span>
                  )
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
