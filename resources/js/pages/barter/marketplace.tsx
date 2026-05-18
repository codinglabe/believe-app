"use client";

import React, { useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { BarterLayout } from "./BarterLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Coins } from "lucide-react";
import RequestTradeModal from "./RequestTradeModal";

declare global {
  function route(name: string, params?: Record<string, unknown>): string;
}

interface Listing {
  id: number;
  title: string;
  description?: string;
  points_value: number;
  barter_allowed: boolean;
  requested_services?: string[];
  image_url?: string | null;
  nonprofit?: { id: number; name: string };
  category?: { id: number; name: string } | null;
  subcategory?: { id: number; name: string } | null;
  benefit_groups?: { id: number; name: string }[];
  benefitGroups?: { id: number; name: string }[];
}

interface PaginatedListings {
  data: Listing[];
  links: any[];
  meta?: { current_page: number; last_page: number; total: number };
}

interface BarterSubcategory {
  id: number;
  name: string;
  barter_category_id: number;
}

interface BarterCategory {
  id: number;
  name: string;
  subcategories: BarterSubcategory[];
}

interface BarterBenefitGroup {
  id: number;
  name: string;
}

interface MarketplaceProps {
  listings: PaginatedListings;
  myListings: { id: number; title: string; points_value: number }[];
  barterCategories?: BarterCategory[];
  barterBenefitGroups?: BarterBenefitGroup[];
}

export default function BarterMarketplace({ listings, myListings = [], barterCategories = [], barterBenefitGroups = [] }: MarketplaceProps) {
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [benefit, setBenefit] = useState("");
  const [tradeModalListing, setTradeModalListing] = useState<Listing | null>(null);
  const auth = usePage().props?.auth as { user?: any; organization?: { id: number } };
  const myOrgId = auth?.organization?.id;

  const selectedCat = barterCategories.find((c) => String(c.id) === category);
  const subcategories = selectedCat?.subcategories ?? [];

  const applyFilters = () => {
    const params: Record<string, string> = {};
    if (category) params.category = category;
    if (subcategory) params.subcategory = subcategory;
    if (benefit) params.benefit = benefit;
    router.get(route("barter.marketplace"), params, { preserveState: true });
  };

  return (
    <AppLayout>
      <Head title="Browse Offers – Nonprofit Barter Network" />
      <BarterLayout currentTab="browse" title="Browse Offers">
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[140px]">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Category</label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setSubcategory("");
                }}
                className="min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All</option>
                {barterCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {subcategories.length > 0 && (
              <div className="min-w-[140px]">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Subcategory</label>
                <select
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className="min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">All</option>
                  {subcategories.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="min-w-[140px]">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Benefits</label>
              <select
                value={benefit}
                onChange={(e) => setBenefit(e.target.value)}
                className="min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All</option>
                {barterBenefitGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <Button variant="outline" className="min-h-10 touch-manipulation" onClick={applyFilters}>
              Apply
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.data?.map((listing) => (
              <Card key={listing.id} className="overflow-hidden transition hover:shadow-md">
                <Link href={route("barter.listings.show", { listing: listing.id })} className="block aspect-video w-full bg-muted">
                  {listing.image_url ? (
                    <img src={listing.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full" />
                  )}
                </Link>
                <CardContent className="flex flex-col gap-3 p-4">
                  <Link href={route("barter.listings.show", { listing: listing.id })}>
                    <h3 className="line-clamp-2 font-semibold text-foreground hover:underline">{listing.title}</h3>
                  </Link>
                  <p className="text-sm text-muted-foreground">{listing.nonprofit?.name}</p>
                  {(listing.category || ((listing.benefit_groups || listing.benefitGroups)?.length)) && (
                    <p className="text-xs text-muted-foreground">
                      {listing.category?.name}
                      {listing.subcategory && ` → ${listing.subcategory.name}`}
                      {((listing.benefit_groups || listing.benefitGroups) ?? []).length > 0 && (
                        <> · {(listing.benefit_groups || listing.benefitGroups)!.map((b) => b.name).join(", ")}</>
                      )}
                    </p>
                  )}
                  <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
                    <Coins className="h-4 w-4 shrink-0" />
                    {listing.points_value} Believe Points or Barter
                  </p>
                  <Button
                    className="mt-1 min-h-10 w-full touch-manipulation"
                    size="sm"
                    onClick={() => setTradeModalListing(listing)}
                    disabled={myOrgId === listing.nonprofit?.id}
                  >
                    Request Trade
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {listings.data?.length === 0 && (
            <div className="rounded-xl border border-border bg-card py-12 text-center">
              <p className="text-muted-foreground">No listings to browse. Check back later.</p>
            </div>
          )}
        </div>

        {tradeModalListing && (
          <RequestTradeModal
            requestedListing={tradeModalListing}
            myListings={myListings}
            onClose={() => setTradeModalListing(null)}
          />
        )}
      </BarterLayout>
    </AppLayout>
  );
}
