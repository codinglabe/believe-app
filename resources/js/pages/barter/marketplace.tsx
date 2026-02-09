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
}

interface PaginatedListings {
  data: Listing[];
  links: any[];
  meta?: { current_page: number; last_page: number; total: number };
}

interface MarketplaceProps {
  listings: PaginatedListings;
  myListings: { id: number; title: string; points_value: number }[];
}

export default function BarterMarketplace({ listings, myListings = [] }: MarketplaceProps) {
  const [category, setCategory] = useState("");
  const [tradeModalListing, setTradeModalListing] = useState<Listing | null>(null);
  const auth = usePage().props?.auth as { user?: any; organization?: { id: number } };
  const myOrgId = auth?.organization?.id;

  return (
    <AppLayout>
      <Head title="Browse Offers – Nonprofit Barter Network" />
      <BarterLayout currentTab="browse" title="Browse Offers">
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
            <Input
              placeholder="Filter by category..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="min-h-10 flex-1 touch-manipulation sm:max-w-xs"
            />
            <Button
              variant="outline"
              className="min-h-10 w-full touch-manipulation sm:w-auto"
              onClick={() =>
                router.get(route("barter.marketplace"), category ? { category } : {}, {
                  preserveState: true,
                })
              }
            >
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
