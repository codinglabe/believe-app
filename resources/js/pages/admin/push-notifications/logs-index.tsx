"use client";

import { Head, Link, router } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bell,
  Download,
  Eye,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from "lucide-react";
import { format } from "date-fns";
import type { BreadcrumbItem } from "@/types";
import { useCallback, useState } from "react";

type LogRow = {
  id: number;
  created_at: string;
  organization: { id: number; name: string } | null;
  module_name: string;
  module_label: string;
  notification_title: string;
  audience_type: string;
  recipient_count: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  failed_count: number;
  status: string;
  creator: { id: number; name: string } | null;
};

type PaginationLink = { url: string | null; label: string; active: boolean };

type Paginated<T> = {
  data: T[];
  links?: PaginationLink[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

type PageProps = {
  logs: Paginated<LogRow>;
  stats: {
    total: number;
    sent: number;
    completed: number;
    failed: number;
    recipients: number;
  };
  filters: {
    organization_id: number | null;
    module: string;
    status: string;
    created_by: number | null;
    date_from: string | null;
    date_to: string | null;
    search: string | null;
    per_page: number;
  };
  moduleOptions: Record<string, string>;
  statusOptions: string[];
  organizations: { id: number; name: string }[];
  creators: { id: number; name: string }[];
  isPlatformAdmin: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Push Notification Logs", href: "/admin/push-notifications" },
];

const statusStyles: Record<string, string> = {
  draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  scheduled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  processing: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  sent: "bg-green-500/10 text-green-400 border-green-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
  cancelled: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

function buildQuery(filters: PageProps["filters"]) {
  const params: Record<string, string | number> = {};
  if (filters.organization_id) params.organization_id = filters.organization_id;
  if (filters.module && filters.module !== "all") params.module = filters.module;
  if (filters.status && filters.status !== "all") params.status = filters.status;
  if (filters.created_by) params.created_by = filters.created_by;
  if (filters.date_from) params.date_from = filters.date_from;
  if (filters.date_to) params.date_to = filters.date_to;
  if (filters.search) params.search = filters.search;
  if (filters.per_page) params.per_page = filters.per_page;
  return params;
}

export default function PushNotificationLogsIndex({
  logs,
  stats,
  filters,
  moduleOptions,
  statusOptions,
  organizations,
  creators,
  isPlatformAdmin,
}: PageProps) {
  const [search, setSearch] = useState(filters.search ?? "");
  const [localFilters, setLocalFilters] = useState(filters);

  const applyFilters = useCallback(
    (next: Partial<PageProps["filters"]>) => {
      const merged = { ...localFilters, ...next };
      setLocalFilters(merged);
      router.get("/admin/push-notifications", buildQuery(merged), {
        preserveScroll: true,
        preserveState: true,
      });
    },
    [localFilters],
  );

  const handleRepush = (logId: number) => {
    if (!confirm("Re-push this notification to pending/failed recipients?")) return;
    router.post(`/admin/push-notifications/${logId}/repush`, {}, { preserveScroll: true });
  };

  const exportUrl = (type: "csv" | "excel") =>
    `/admin/push-notifications/export/${type}?${new URLSearchParams(
      Object.entries(buildQuery(localFilters)).map(([k, v]) => [k, String(v)]),
    ).toString()}`;

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Push Notification Logs" />

      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Push Notification Logs</h1>
            <p className="text-muted-foreground text-sm">
              Centralized delivery tracking across all platform modules
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={exportUrl("csv")}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={exportUrl("excel")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Excel
              </a>
            </Button>
            {isPlatformAdmin && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/push-notifications/devices">FCM Devices</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Total Logs", value: stats.total, icon: Bell },
            { label: "Sent", value: stats.sent, icon: Bell },
            { label: "Completed", value: stats.completed, icon: Bell },
            { label: "Failed", value: stats.failed, icon: Bell },
            { label: "Recipients", value: stats.recipients, icon: Bell },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{value.toLocaleString()}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              {isPlatformAdmin && organizations.length > 0 && (
                <Select
                  value={localFilters.organization_id?.toString() ?? "all"}
                  onValueChange={(v) =>
                    applyFilters({
                      organization_id: v === "all" ? null : Number(v),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All organizations</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={String(org.id)}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select
                value={localFilters.module}
                onValueChange={(v) => applyFilters({ module: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All modules</SelectItem>
                  {Object.entries(moduleOptions).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={localFilters.status}
                onValueChange={(v) => applyFilters({ status: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={localFilters.created_by?.toString() ?? "all"}
                onValueChange={(v) =>
                  applyFilters({ created_by: v === "all" ? null : Number(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Created by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All creators</SelectItem>
                  {creators.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={localFilters.date_from ?? ""}
                onChange={(e) => applyFilters({ date_from: e.target.value || null })}
              />
              <Input
                type="date"
                value={localFilters.date_to ?? ""}
                onChange={(e) => applyFilters({ date_to: e.target.value || null })}
              />
            </div>

            <div className="mt-3 flex gap-2">
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                <Input
                  className="pl-8"
                  placeholder="Search title, body, organization…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyFilters({ search: search || null });
                  }}
                />
              </div>
              <Button variant="secondary" onClick={() => applyFilters({ search: search || null })}>
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead className="text-right">Recipients</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Opened</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-muted-foreground py-8 text-center">
                      No push notification logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.data.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {log.created_at
                          ? format(new Date(log.created_at), "MMM d, yyyy HH:mm")
                          : "—"}
                      </TableCell>
                      <TableCell>{log.organization?.name ?? "—"}</TableCell>
                      <TableCell>{log.module_label}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{log.notification_title}</TableCell>
                      <TableCell>{log.audience_type}</TableCell>
                      <TableCell className="text-right">{log.recipient_count}</TableCell>
                      <TableCell className="text-right">{log.sent_count}</TableCell>
                      <TableCell className="text-right">{log.delivered_count}</TableCell>
                      <TableCell className="text-right">{log.opened_count}</TableCell>
                      <TableCell className="text-right">{log.failed_count}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusStyles[log.status] ?? ""}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.creator?.name ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/admin/push-notifications/${log.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          {isPlatformAdmin &&
                            (log.status === "failed" ||
                              log.failed_count > 0 ||
                              log.status === "processing") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRepush(log.id)}
                                title="Re-push"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {logs.links && logs.links.length > 3 && (
              <div className="flex items-center justify-center gap-1 border-t p-4">
                {logs.links.map((link, i) => (
                  <Button
                    key={i}
                    variant={link.active ? "default" : "outline"}
                    size="sm"
                    disabled={!link.url}
                    asChild={!!link.url}
                  >
                    {link.url ? (
                      <Link href={link.url} preserveScroll>
                        {link.label.includes("Previous") ? (
                          <ChevronLeft className="h-4 w-4" />
                        ) : link.label.includes("Next") ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <span dangerouslySetInnerHTML={{ __html: link.label }} />
                        )}
                      </Link>
                    ) : (
                      <span>
                        {link.label.includes("Previous") ? (
                          <ChevronLeft className="h-4 w-4" />
                        ) : link.label.includes("Next") ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          link.label
                        )}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
