"use client";

import { Head, Link, router } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { formatUtcTimestamp } from "@/lib/timezone-detection";
import type { BreadcrumbItem } from "@/types";

type LogDetail = {
  id: number;
  created_at: string;
  organization: { id: number; name: string } | null;
  module_name: string;
  module_label: string;
  module_record_id: number | null;
  notification_title: string;
  notification_body: string | null;
  audience_type: string;
  recipient_count: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  failed_count: number;
  status: string;
  deep_link: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  creator: { id: number; name: string; role: string | null; role_label: string } | null;
};

type RecipientRow = {
  id: number;
  user: { id: number; name: string; email: string } | null;
  device_token: string | null;
  status: string;
  delivered_at: string | null;
  opened_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  firebase_error_code: string | null;
  attempt_count: number;
  token_status: string;
  failure_count: number;
  can_repush: boolean;
  can_repush_override: boolean;
};

type Paginated<T> = {
  data: T[];
  links?: { url: string | null; label: string; active: boolean }[];
};

type PageProps = {
  log: LogDetail;
  recipients: Paginated<RecipientRow>;
  isPlatformAdmin: boolean;
  canRepush: boolean;
};

const statusStyles: Record<string, string> = {
  pending: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  sent: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  delivered: "bg-green-500/10 text-green-400 border-green-500/20",
  opened: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
  unsubscribed: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  invalid_token: "bg-red-500/10 text-red-400 border-red-500/20",
};

const tokenStatusStyles: Record<string, string> = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  inactive: "bg-red-500/10 text-red-400 border-red-500/20",
  opted_out: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  missing: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  unknown: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export default function PushNotificationShow({ log, recipients, canRepush }: PageProps) {
  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Push Notification Logs", href: "/admin/push-notifications" },
    { title: `#${log.id}`, href: "#" },
  ];

  const handleRepush = (manualOverride = false) => {
    const message = manualOverride
      ? "Force re-push to all eligible recipients (including non-retryable failures)?"
      : "Re-push to eligible failed/pending recipients?";
    if (!confirm(message)) return;
    router.post(
      `/admin/push-notifications/${log.id}/repush`,
      { manual_override: manualOverride },
      { preserveScroll: true },
    );
  };

  const handleRecipientRepush = (recipientId: number, manualOverride = false) => {
    const message = manualOverride
      ? "Force re-push to this recipient?"
      : "Re-push to this recipient?";
    if (!confirm(message)) return;
    router.post(
      `/admin/push-notifications/${log.id}/recipients/${recipientId}/repush`,
      { manual_override: manualOverride },
      { preserveScroll: true },
    );
  };

  const fmt = (iso: string | null) => formatUtcTimestamp(iso);

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`Push Notification #${log.id}`} />

      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin/push-notifications">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{log.notification_title}</h1>
              <p className="text-muted-foreground text-sm">
                {log.module_label} · {log.organization?.name ?? "Platform"}
              </p>
            </div>
          </div>
          {canRepush && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => handleRepush(false)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Re-Push
              </Button>
              <Button variant="outline" onClick={() => handleRepush(true)}>
                Force Re-Push
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">General Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Title</span>
                <span className="col-span-2">{log.notification_title}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Message</span>
                <span className="col-span-2 whitespace-pre-wrap">{log.notification_body ?? "—"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Module</span>
                <span className="col-span-2">{log.module_label}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Module Record ID</span>
                <span className="col-span-2">{log.module_record_id ?? "—"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Deep Link</span>
                <span className="col-span-2 font-mono text-xs">{log.deep_link ?? "—"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Audience</span>
                <span className="col-span-2">{log.audience_type}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Creator</span>
                <span className="col-span-2">
                  {log.creator ? (
                    <div>
                      <div className="font-medium">{log.creator.name}</div>
                      <div className="text-muted-foreground text-xs">{log.creator.role_label}</div>
                    </div>
                  ) : (
                    "System (automated)"
                  )}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Status</span>
                <span className="col-span-2">
                  <Badge variant="outline">{log.status}</Badge>
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {[
                  { label: "Recipients", value: log.recipient_count },
                  { label: "Sent", value: log.sent_count },
                  { label: "Delivered", value: log.delivered_count },
                  { label: "Opened", value: log.opened_count },
                  { label: "Failed", value: log.failed_count },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border p-3">
                    <p className="text-muted-foreground text-xs">{label}</p>
                    <p className="text-2xl font-bold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="text-muted-foreground mt-4 space-y-1 text-xs">
                <p>Created: {fmt(log.created_at)}</p>
                {log.scheduled_at && <p>Scheduled: {fmt(log.scheduled_at)}</p>}
                {log.sent_at && <p>Sent: {fmt(log.sent_at)}</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recipients</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Device Token</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Delivered At</TableHead>
                  <TableHead>Failed At</TableHead>
                  <TableHead>Firebase Code</TableHead>
                  <TableHead>Failure Reason</TableHead>
                  {canRepush && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canRepush ? 10 : 9} className="text-muted-foreground py-8 text-center">
                      No recipients recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  recipients.data.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        {r.user ? (
                          <div>
                            <div className="font-medium">{r.user.name}</div>
                            <div className="text-muted-foreground text-xs">{r.user.email}</div>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.device_token ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusStyles[r.status] ?? ""}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={tokenStatusStyles[r.token_status] ?? ""}>
                          {r.token_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.attempt_count}
                        {r.failure_count > 0 && (
                          <span className="text-muted-foreground block text-xs">
                            {r.failure_count} failure log{r.failure_count !== 1 ? "s" : ""}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{fmt(r.delivered_at)}</TableCell>
                      <TableCell className="text-sm">{fmt(r.failed_at)}</TableCell>
                      <TableCell className="font-mono text-xs">{r.firebase_error_code ?? "—"}</TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm">
                        {r.failure_reason ?? "—"}
                      </TableCell>
                      {canRepush && (
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {r.can_repush && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRecipientRepush(r.id, false)}
                              >
                                Repush
                              </Button>
                            )}
                            {r.can_repush_override && !r.can_repush && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRecipientRepush(r.id, true)}
                              >
                                Force
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
