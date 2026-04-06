"use client";

import React from "react";
import { Head, Link, router } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Eye, Handshake, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

declare global {
  function route(name: string, params?: Record<string, unknown>): string;
}

interface Org {
  id: number;
  name: string;
  ein?: string;
}

interface Listing {
  id: number;
  nonprofit_id?: number;
  title: string;
  points_value?: number;
}

interface Settlement {
  id: number;
  from_organization_id: number;
  to_organization_id: number;
  points: number;
}

interface Transaction {
  id: number;
  requesting_nonprofit_id: number;
  responding_nonprofit_id: number;
  requested_listing_id: number;
  return_listing_id: number | null;
  points_delta: number;
  status: string;
  dispute_flag: boolean;
  accepted_at: string | null;
  completed_at: string | null;
  created_at: string;
  requestingNonprofit?: Org;
  respondingNonprofit?: Org;
  requestedListing?: Listing;
  returnListing?: Listing | null;
  settlements?: Settlement[];
}

interface Paginated<T> {
  data: T[];
  links?: { url: string | null; label: string; active: boolean }[];
  meta?: { current_page: number; last_page: number; total: number; from?: number; to?: number };
}

interface AuditProps {
  transactions: Paginated<Transaction>;
  filters?: { status?: string; dispute?: string };
}

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "in_fulfillment", label: "In fulfillment" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function AdminBarterAudit({ transactions, filters = {} }: AuditProps) {
  const [status, setStatus] = React.useState<string>(filters.status ?? "all");
  const [dispute, setDispute] = React.useState<string>(
    filters.dispute === "1" ? "1" : "all"
  );

  const applyFilters = (newStatus: string, newDispute: string) => {
    const params: Record<string, string> = {};
    if (newStatus && newStatus !== "all") params.status = newStatus;
    if (newDispute === "1") params.dispute = "1";
    router.get(route("admin.barter.index"), params, { preserveState: true });
  };

  const items = transactions.data ?? [];

  return (
    <AppLayout>
      <Head title="Barter Network Audit – Admin" />
      <div className="space-y-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Handshake className="h-6 w-6" />
            Barter Network Audit
          </h1>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center gap-4">
              <Select
                value={status}
                onValueChange={(v) => {
                  setStatus(v);
                  applyFilters(v, dispute);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={dispute}
                onValueChange={(v) => {
                  setDispute(v);
                  applyFilters(status, v);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Disputes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="1">Disputed only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Requester (A)</TableHead>
                  <TableHead>Responder (B)</TableHead>
                  <TableHead>Requested listing</TableHead>
                  <TableHead>Return listing</TableHead>
                  <TableHead>Points Δ</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dispute</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-sm">{t.id}</TableCell>
                      <TableCell>
                        <span className="font-medium">{t.requestingNonprofit?.name}</span>
                        {t.requestingNonprofit?.ein && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            EIN {t.requestingNonprofit.ein}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{t.respondingNonprofit?.name}</span>
                        {t.respondingNonprofit?.ein && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            EIN {t.respondingNonprofit.ein}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {t.requestedListing?.title}
                        {t.requestedListing?.points_value != null && (
                          <span className="text-muted-foreground"> ({t.requestedListing.points_value} pts)</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {t.returnListing?.title ?? "—"}
                        {t.returnListing?.points_value != null && (
                          <span className="text-muted-foreground"> ({t.returnListing.points_value} pts)</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={t.points_delta > 0 ? "text-amber-600" : t.points_delta < 0 ? "text-emerald-600" : ""}>
                          {t.points_delta > 0 ? "+" : ""}{t.points_delta}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{t.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {t.dispute_flag ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" /> Flagged
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(t.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={route("admin.barter.show", { transaction: t.id })}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {transactions.meta && transactions.meta.last_page > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {transactions.meta.from ?? 0} to {transactions.meta.to ?? 0} of{" "}
                  {transactions.meta.total}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
