"use client";

import { Head, Link, router, usePage } from "@inertiajs/react";
import AdminLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Smartphone,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Search,
  Send,
  RefreshCw,
  AlertTriangle,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type Device = {
  id: number;
  user_id: number;
  push_token: string;
  device_id: string;
  device_type: string;
  device_name: string | null;
  browser: string | null;
  platform: string | null;
  is_active: boolean;
  status: string;
  last_error: string | null;
  last_error_at: string | null;
  needs_reregister: boolean;
  last_used_at: string;
  user?: { id: number; name: string; email: string; slug?: string };
};

type Log = {
  id: number;
  user_id: number;
  title: string;
  body: string | null;
  source_type: string | null;
  status: string;
  fcm_error_code: string | null;
  sent_at: string;
  user?: { id: number; name: string; email: string };
};

type PaginationLink = {
  url: string | null;
  label: string;
  active: boolean;
};

type Props = {
  stats: {
    total_devices: number;
    active_devices: number;
    invalid_devices: number;
    total_sent: number;
    total_failed: number;
  };
  devices: {
    data: Device[];
    links: PaginationLink[];
    current_page?: number;
    last_page?: number;
    from?: number | null;
    to?: number | null;
    total?: number;
    per_page?: number;
  };
  recentLogs: Log[];
  filters: { status?: string; search?: string };
};

export default function PushNotificationsIndex({
  stats,
  devices,
  recentLogs,
  filters,
}: Props) {
  const { props } = usePage();
  const flash = (props as any).success || (props as any).error;
  const isSuccess = !!(props as any).success;

  const handleSendTest = (userPushTokenId: number) => {
    router.post(route("admin.push-notifications.send-test"), {
      user_push_token_id: userPushTokenId,
    });
  };

  const handleRequestReregister = (userPushTokenId: number) => {
    router.post(route("admin.push-notifications.request-reregister"), {
      user_push_token_id: userPushTokenId,
    });
  };

  const handleInvalidate = (userPushTokenId: number) => {
    if (
      !confirm(
        "Mark this token as invalid? No further notifications will be sent to this device."
      )
    )
      return;
    router.post(route("admin.push-notifications.invalidate-token"), {
      user_push_token_id: userPushTokenId,
    });
  };

  const applyFilter = (key: string, value: string) => {
    const params = new URLSearchParams(window.location.search);
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    router.get(window.location.pathname + "?" + params.toString(), {}, { preserveState: true });
  };

  const goToPage = (url: string | null) => {
    if (url) router.get(url, {}, { preserveState: true });
  };

  const links = devices.links ?? [];
  const hasPagination = links.length > 2;
  const from = devices.from ?? 0;
  const to = devices.to ?? 0;
  const total = devices.total ?? 0;

  return (
    <AdminLayout>
      <Head title="Push Notifications (FCM)" />

      <div className="space-y-6 px-1 sm:px-0">
        {/* Page header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl flex items-center gap-2 flex-wrap">
            <Bell className="h-7 w-7 sm:h-8 sm:w-8 shrink-0" />
            Push Notifications (FCM)
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            View devices, delivery history, and who received messages. Admin only.
          </p>
        </div>

        {/* Flash message */}
        {flash && (
          <div
            className={`rounded-lg border p-4 text-sm ${
              isSuccess
                ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
            }`}
          >
            {flash}
          </div>
        )}

        {/* Stats grid - responsive */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 sm:pt-6">
              <CardTitle className="text-xs font-medium sm:text-sm">
                Total devices
              </CardTitle>
              <Smartphone className="h-4 w-4 shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-4 sm:pb-6">
              <div className="text-xl font-bold sm:text-2xl">{stats.total_devices}</div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 sm:pt-6">
              <CardTitle className="text-xs font-medium sm:text-sm">Active</CardTitle>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-500" />
            </CardHeader>
            <CardContent className="pb-4 sm:pb-6">
              <div className="text-xl font-bold sm:text-2xl">{stats.active_devices}</div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 sm:pt-6">
              <CardTitle className="text-xs font-medium sm:text-sm">Invalid</CardTitle>
              <XCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-500" />
            </CardHeader>
            <CardContent className="pb-4 sm:pb-6">
              <div className="text-xl font-bold sm:text-2xl">{stats.invalid_devices}</div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 sm:pt-6">
              <CardTitle className="text-xs font-medium sm:text-sm">Sent</CardTitle>
              <Send className="h-4 w-4 shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-4 sm:pb-6">
              <div className="text-xl font-bold sm:text-2xl">{stats.total_sent}</div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 sm:pt-6">
              <CardTitle className="text-xs font-medium sm:text-sm">Failed</CardTitle>
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
            </CardHeader>
            <CardContent className="pb-4 sm:pb-6">
              <div className="text-xl font-bold sm:text-2xl">{stats.total_failed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Devices card */}
        <Card>
          <CardHeader className="space-y-1.5 pb-4">
            <CardTitle className="text-lg sm:text-xl">Devices</CardTitle>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Registered FCM devices. Send test, request re-register, or invalidate token.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters - responsive row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <div className="relative w-full min-w-0 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by user, device, browser..."
                  defaultValue={filters?.search}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const search = (e.target as HTMLInputElement).value;
                      applyFilter("search", search);
                    }
                  }}
                  className="pl-9 h-9"
                />
              </div>
              <Select
                value={filters?.status ?? "all"}
                onValueChange={(value) => applyFilter("status", value)}
              >
                <SelectTrigger className="w-full sm:w-[180px] h-9">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="invalid">Invalid</SelectItem>
                  <SelectItem value="opted_out">Opted out</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table - horizontal scroll on small screens */}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="whitespace-nowrap">User</TableHead>
                    <TableHead className="whitespace-nowrap">Device / Browser</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Last used</TableHead>
                    <TableHead className="whitespace-nowrap min-w-[140px]">Last error</TableHead>
                    <TableHead className="whitespace-nowrap text-right w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.data.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-12 text-sm"
                      >
                        No devices found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    devices.data.map((d) => (
                      <TableRow key={d.id} className="align-top">
                        <TableCell className="py-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate max-w-[160px] sm:max-w-none">
                              {d.user?.name ?? "—"}
                            </div>
                            <div className="text-xs text-muted-foreground truncate max-w-[160px] sm:max-w-none">
                              {d.user?.email ?? "—"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="text-sm min-w-0 max-w-[140px] sm:max-w-none">
                            <div className="truncate">{d.device_name || d.device_type}</div>
                            {d.browser && (
                              <div className="text-muted-foreground truncate">{d.browser}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge
                              variant={
                                d.status === "active"
                                  ? "default"
                                  : d.status === "invalid"
                                    ? "destructive"
                                    : "secondary"
                              }
                              className="capitalize"
                            >
                              {d.status}
                            </Badge>
                            {d.needs_reregister && (
                              <Badge variant="outline" className="text-xs">
                                Re-register
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-sm text-muted-foreground whitespace-nowrap">
                          {d.last_used_at
                            ? new Date(d.last_used_at).toLocaleString()
                            : "—"}
                        </TableCell>
                        <TableCell className="py-3 text-sm text-muted-foreground max-w-[180px]">
                          <span className="line-clamp-2" title={d.last_error ?? undefined}>
                            {d.last_error || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {d.status === "active" && (
                                <DropdownMenuItem onClick={() => handleSendTest(d.id)}>
                                  <Send className="h-4 w-4 mr-2" />
                                  Send test
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleRequestReregister(d.id)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Request re-register
                              </DropdownMenuItem>
                              {d.status === "active" && (
                                <DropdownMenuItem
                                  onClick={() => handleInvalidate(d.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Mark invalid
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {hasPagination && total > 0 && (
              <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between sm:pt-4 border-t">
                <p className="text-xs text-muted-foreground sm:text-sm order-2 sm:order-1">
                  Showing{" "}
                  <span className="font-medium text-foreground">{from}</span> to{" "}
                  <span className="font-medium text-foreground">{to}</span> of{" "}
                  <span className="font-medium text-foreground">{total}</span> results
                </p>
                <div className="flex items-center justify-center gap-1 order-1 sm:order-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 sm:w-auto sm:px-3"
                    disabled={!links[0]?.url}
                    onClick={() => goToPage(links[0]?.url ?? null)}
                  >
                    <ChevronLeft className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                  <div className="flex items-center gap-1 mx-1">
                    {links.slice(1, -1).map((link, idx) => {
                      if (link.label === "...") {
                        return (
                          <span
                            key={`ellipsis-${idx}`}
                            className="flex h-8 w-8 items-center justify-center text-muted-foreground text-sm"
                          >
                            …
                          </span>
                        );
                      }
                      const isNumber = /^\d+$/.test(link.label);
                      if (!isNumber) return null;
                      return (
                        <Button
                          key={link.label}
                          variant={link.active ? "default" : "outline"}
                          size="sm"
                          className="h-8 min-w-8 px-2"
                          onClick={() => goToPage(link.url)}
                        >
                          {link.label}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 sm:w-auto sm:px-3"
                    disabled={!links[links.length - 1]?.url}
                    onClick={() => goToPage(links[links.length - 1]?.url ?? null)}
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4 sm:ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent delivery logs card */}
        <Card>
          <CardHeader className="space-y-1.5 pb-4">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <MessageSquare className="h-5 w-5 shrink-0" />
              Recent delivery logs
            </CardTitle>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Who received which message and whether it succeeded or failed.
            </p>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="whitespace-nowrap">User</TableHead>
                    <TableHead className="whitespace-nowrap">Title</TableHead>
                    <TableHead className="whitespace-nowrap">Source</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap min-w-[100px]">Error</TableHead>
                    <TableHead className="whitespace-nowrap">Sent at</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLogs.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-12 text-sm"
                      >
                        No delivery logs yet. Logs are created when notifications are sent
                        (campaigns, events, chat, etc.).
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentLogs.map((log) => (
                      <TableRow key={log.id} className="align-top">
                        <TableCell className="py-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate max-w-[140px] sm:max-w-none">
                              {log.user?.name ?? "—"}
                            </div>
                            <div className="text-xs text-muted-foreground truncate max-w-[140px] sm:max-w-none">
                              {log.user?.email ?? "—"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 font-medium max-w-[160px] sm:max-w-none truncate">
                          {log.title}
                        </TableCell>
                        <TableCell className="py-3 text-sm text-muted-foreground capitalize">
                          {log.source_type?.replace(/_/g, " ") ?? "—"}
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge
                            variant={log.status === "sent" ? "default" : "destructive"}
                            className="capitalize"
                          >
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-sm text-muted-foreground max-w-[150px]">
                          <span className="line-clamp-2" title={log.fcm_error_code ?? undefined}>
                            {log.fcm_error_code || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(log.sent_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
