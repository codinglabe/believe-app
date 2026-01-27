"use client";

import React, { useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/layouts/app-layout";
import type { BreadcrumbItem } from "@/types";
import { Edit, Plus, Send, Trash2, Image as ImageIcon } from "lucide-react";
import { showErrorToast } from "@/lib/toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { route } from "ziggy-js";

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Believe FundMe", href: "/fundme" },
];

interface CampaignItem {
  id: number;
  title: string;
  slug: string;
  goal_amount: number;
  raised_amount: number;
  goal_amount_dollars: number;
  raised_amount_dollars: number;
  progress_percent: number;
  status: string;
  cover_image: string | null;
  category: { id: number; name: string; slug: string } | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PaginatedCampaigns {
  data: CampaignItem[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number;
  to?: number;
  prev_page_url: string | null;
  next_page_url: string | null;
}

interface Props {
  campaigns: PaginatedCampaigns;
  filters: { per_page: number; status: string };
  statusOptions: Record<string, string>;
}

const statusBadgeClass: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  in_review: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  live: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
  frozen: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
};

export default function FundMeCampaignsIndex({ campaigns, filters, statusOptions }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<CampaignItem | null>(null);

  const handleDeleteClick = (c: CampaignItem) => {
    setCampaignToDelete(c);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (campaignToDelete) {
      router.delete(route("fundme.campaigns.destroy", campaignToDelete.id), {
        onError: () => showErrorToast("Failed to delete campaign"),
      });
      setDeleteOpen(false);
      setCampaignToDelete(null);
    }
  };

  const handleSubmitForReview = (c: CampaignItem) => {
    if (c.status !== "draft") return;
    router.post(route("fundme.campaigns.submit", c.id), {}, {
      onError: () => showErrorToast("Failed to submit campaign"),
    });
  };

  const handleStatusFilter = (value: string) => {
    router.get(route("fundme.campaigns.index"), { status: value }, { preserveState: true });
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Believe FundMe – My Campaigns" />
      <div className="flex flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
        <Card className="px-0">
          <CardHeader className="px-4 md:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold">Believe FundMe</CardTitle>
                <CardDescription>
                  Create and manage your fundraising campaigns. Total: {campaigns.total} campaign{campaigns.total !== 1 ? "s" : ""}
                </CardDescription>
              </div>
              <Link href={route("fundme.campaigns.create")}>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Campaign
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Select value={filters.status ?? "__all__"} onValueChange={(v) => handleStatusFilter(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All statuses</SelectItem>
                    {Object.entries(statusOptions).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            {campaigns.data.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                <ImageIcon className="mx-auto h-12 w-12 mb-3 opacity-50" />
                <p className="font-medium">No campaigns yet</p>
                <p className="text-sm mt-1">Create your first Believe FundMe campaign to start raising funds.</p>
                <Link href={route("fundme.campaigns.create")}>
                  <Button className="mt-4">Create Campaign</Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                {campaigns.data.map((c) => (
                  <Card key={c.id} className="overflow-hidden">
                    <div className="aspect-video w-full bg-muted relative">
                      {c.cover_image ? (
                        <img src={c.cover_image} alt="" className="object-cover w-full h-full" />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 right-2 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${Math.min(100, c.progress_percent)}%` }}
                        />
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold truncate">{c.title}</h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {c.category?.name ?? "—"}
                          </p>
                        </div>
                        <Badge className={statusBadgeClass[c.status] ?? "bg-muted"}>
                          {statusOptions[c.status] ?? c.status}
                        </Badge>
                      </div>
                      <p className="text-sm mt-2">
                        ${c.raised_amount_dollars.toLocaleString("en-US", { minimumFractionDigits: 2 })} raised of $
                        {c.goal_amount_dollars.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {c.status === "draft" && (
                          <>
                            <Link href={route("fundme.campaigns.edit", c.id)}>
                              <Button variant="outline" size="sm" className="gap-1">
                                <Edit className="h-3.5 w-3.5" /> Edit
                              </Button>
                            </Link>
                            <Button
                              variant="default"
                              size="sm"
                              className="gap-1"
                              onClick={() => handleSubmitForReview(c)}
                            >
                              <Send className="h-3.5 w-3.5" /> Submit for review
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="gap-1"
                              onClick={() => handleDeleteClick(c)}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </Button>
                          </>
                        )}
                        {c.status === "rejected" && (
                          <Link href={route("fundme.campaigns.edit", c.id)}>
                            <Button variant="outline" size="sm" className="gap-1">
                              <Edit className="h-3.5 w-3.5" /> Edit & resubmit
                            </Button>
                          </Link>
                        )}
                        {c.status === "live" && (
                          <Link href={route("fundme.show", { slug: c.slug })} target="_blank">
                            <Button variant="outline" size="sm">View page</Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {campaigns.last_page > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  Page {campaigns.current_page} of {campaigns.last_page}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!campaigns.prev_page_url}
                    onClick={() => router.get(route("fundme.campaigns.index"), { page: campaigns.current_page - 1, status: filters.status })}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!campaigns.next_page_url}
                    onClick={() => router.get(route("fundme.campaigns.index"), { page: campaigns.current_page + 1, status: filters.status })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete campaign?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete “{campaignToDelete?.title}”. Only draft campaigns can be removed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
