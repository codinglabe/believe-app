"use client";

import React, { useState, useRef } from "react";
import { Head, Link, router, useForm } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { BarterLayout } from "./BarterLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Coins, ImagePlus, Pause, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  function route(name: string, params?: Record<string, unknown>): string;
}

interface BarterSubcategory {
  id: number;
  name: string;
  slug: string;
  barter_category_id: number;
}

interface BarterCategory {
  id: number;
  name: string;
  slug: string;
  subcategories: BarterSubcategory[];
}

interface BarterBenefitGroup {
  id: number;
  name: string;
  slug: string;
}

interface Listing {
  id: number;
  title: string;
  description?: string | null;
  points_value: number;
  barter_allowed: boolean;
  status: string;
  image_url?: string | null;
  category?: { id: number; name: string } | null;
  subcategory?: { id: number; name: string } | null;
  benefit_groups?: { id: number; name: string }[];
  benefitGroups?: { id: number; name: string }[];
}

interface MyListingsProps {
  listings: { data: Listing[]; links: any[] };
  barterCategories: BarterCategory[];
  barterBenefitGroups: BarterBenefitGroup[];
}

export default function BarterMyListings({ listings, barterCategories = [], barterBenefitGroups = [] }: MyListingsProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: items } = listings;
  const form = useForm({
    title: "",
    description: "",
    barter_category_id: "" as number | "",
    barter_subcategory_id: "" as number | "",
    benefit_group_ids: [] as number[],
    points_value: 0,
    barter_allowed: true,
    image: null as File | null,
  });

  const selectedCategory = barterCategories.find((c) => c.id === form.data.barter_category_id);
  const subcategories = selectedCategory?.subcategories ?? [];

  const imagePreviewUrl = form.data.image
    ? URL.createObjectURL(form.data.image)
    : null;

  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const options: { onSuccess: () => void; forceFormData?: boolean } = {
      onSuccess: () => {
        if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
        form.reset();
        setCreateOpen(false);
      },
    };
    if (form.data.image) options.forceFormData = true;
    form.post(route("barter.listings.store"), options);
  };

  const clearImage = () => {
    form.setData("image", null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updateStatus = (listing: Listing, status: string) => {
    router.put(route("barter.listings.update", { listing: listing.id }), { status });
  };

  return (
    <AppLayout>
      <Head title="My Listings – Nonprofit Barter Network" />
      <BarterLayout currentTab="listings" title="My Listings">
        <div className="space-y-4">
          <Button
            onClick={() => setCreateOpen(true)}
            className="min-h-10 w-full touch-manipulation sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Create New Listing
          </Button>

          {items?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">No listings yet. Create one to start trading.</p>
              </CardContent>
            </Card>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:gap-4">
              {items?.map((listing) => (
                <li key={listing.id}>
                  <Card className="overflow-hidden">
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <Link
                        href={route("barter.listings.show", { listing: listing.id })}
                        className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4"
                      >
                        <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-16 sm:w-24">
                          {listing.image_url ? (
                            <img
                              src={listing.image_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <Coins className="h-6 w-6 sm:h-8 sm:w-8" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-foreground">{listing.title}</h3>
                          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                            <Coins className="h-4 w-4 shrink-0" />
                            {listing.points_value} Believe Points · {listing.barter_allowed ? "Barter allowed" : "Points only"}
                          </p>
                          {(listing.category || ((listing.benefit_groups || listing.benefitGroups)?.length)) && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {listing.category?.name}
                              {listing.subcategory && ` → ${listing.subcategory.name}`}
                              {((listing.benefit_groups || listing.benefitGroups) ?? []).length > 0 && (
                                <> · Benefits: {(listing.benefit_groups || listing.benefitGroups)!.map((b) => b.name).join(", ")}</>
                              )}
                            </p>
                          )}
                        </div>
                      </Link>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                            listing.status === "active" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
                            listing.status === "paused" && "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
                            listing.status === "completed" && "bg-muted text-muted-foreground"
                          )}
                        >
                          {listing.status}
                        </span>
                        {listing.status === "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-h-9 touch-manipulation"
                            onClick={() => updateStatus(listing, "paused")}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                        {listing.status === "paused" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-h-9 touch-manipulation"
                            onClick={() => updateStatus(listing, "active")}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Listing</DialogTitle>
              <DialogDescription>Offer a good or service to other nonprofits.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submitCreate} className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={form.data.title}
                  onChange={(e) => form.setData("title", e.target.value)}
                  placeholder="e.g. Event Space Available"
                  className="mt-1 min-h-10"
                />
                {form.errors.title && (
                  <p className="mt-1 text-sm text-destructive">{form.errors.title}</p>
                )}
              </div>
              <div>
                <Label>Description (optional)</Label>
                <textarea
                  value={form.data.description}
                  onChange={(e) => form.setData("description", e.target.value)}
                  placeholder="Brief description"
                  className="mt-1 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
              <div>
                <Label>Category</Label>
                <select
                  value={form.data.barter_category_id || ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : "";
                    form.setData("barter_category_id", val);
                    form.setData("barter_subcategory_id", "");
                  }}
                  className="mt-1 min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select category</option>
                  {barterCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {subcategories.length > 0 && (
                <div>
                  <Label>Subcategory</Label>
                  <select
                    value={form.data.barter_subcategory_id || ""}
                    onChange={(e) => form.setData("barter_subcategory_id", e.target.value ? Number(e.target.value) : "")}
                    className="mt-1 min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select subcategory</option>
                    {subcategories.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <Label>Which group does it benefit?</Label>
                <div className="mt-2 flex flex-wrap gap-3">
                  {barterBenefitGroups.map((g) => (
                    <label key={g.id} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.data.benefit_group_ids.includes(g.id)}
                        onChange={(e) => {
                          const ids = e.target.checked
                            ? [...form.data.benefit_group_ids, g.id]
                            : form.data.benefit_group_ids.filter((id) => id !== g.id);
                          form.setData("benefit_group_ids", ids);
                        }}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span className="text-sm">{g.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label>Image (optional)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  className="mt-1 hidden w-full text-sm text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground file:text-sm"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) form.setData("image", file);
                  }}
                />
                {imagePreviewUrl ? (
                  <div className="mt-2 flex items-center gap-3">
                    <img
                      src={imagePreviewUrl}
                      alt="Preview"
                      className="h-20 w-24 rounded-lg border border-border object-cover"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={clearImage} className="min-h-9">
                      <X className="h-4 w-4" /> Remove
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2 min-h-10 w-full touch-manipulation"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="mr-2 h-4 w-4" /> Choose image (JPEG, PNG, WebP, max 5MB)
                  </Button>
                )}
                {form.errors.image && (
                  <p className="mt-1 text-sm text-destructive">{form.errors.image}</p>
                )}
              </div>
              <div>
                <Label>Points value</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.data.points_value || ""}
                  onChange={(e) => form.setData("points_value", parseInt(e.target.value, 10) || 0)}
                  className="mt-1 min-h-10"
                />
                {form.errors.points_value && (
                  <p className="mt-1 text-sm text-destructive">{form.errors.points_value}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="barter_allowed"
                  checked={form.data.barter_allowed}
                  onChange={(e) => form.setData("barter_allowed", e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="barter_allowed" className="cursor-pointer">Barter allowed</Label>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="min-h-10 touch-manipulation">
                  Cancel
                </Button>
                <Button type="submit" disabled={form.processing} className="min-h-10 touch-manipulation">
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </BarterLayout>
    </AppLayout>
  );
}
