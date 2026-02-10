"use client";

import React, { useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { BarterLayout } from "./BarterLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Coins } from "lucide-react";
import RequestTradeModal from "./RequestTradeModal";

declare global {
  function route(name: string, params?: Record<string, unknown>): string;
}

interface Listing {
  id: number;
  title: string;
  description?: string | null;
  points_value: number;
  barter_allowed: boolean;
  image_url?: string | null;
  nonprofit?: { id: number; name: string };
  category?: { id: number; name: string } | null;
  subcategory?: { id: number; name: string } | null;
  benefit_groups?: { id: number; name: string }[];
  benefitGroups?: { id: number; name: string }[];
}

interface ListingShowProps {
  listing: Listing;
  isOwner: boolean;
  myListings: { id: number; title: string; points_value: number }[];
}

export default function BarterListingShow({ listing, isOwner, myListings = [] }: ListingShowProps) {
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const auth = usePage().props?.auth as { organization?: { id: number } };

  return (
    <AppLayout>
      <Head title={`${listing.title} – Nonprofit Barter Network`} />
      <BarterLayout currentTab="browse" title="Listing">
        <Card className="overflow-hidden">
          <div className="aspect-video w-full bg-muted sm:aspect-[2/1]">
            {listing.image_url ? (
              <img
                src={listing.image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <Coins className="h-16 w-16" />
              </div>
            )}
          </div>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{listing.title}</h1>
              {listing.nonprofit && (
                <p className="mt-1 text-sm text-muted-foreground">{listing.nonprofit.name}</p>
              )}
            </div>
            <p className="flex items-center gap-2 text-lg font-medium text-primary">
              <Coins className="h-5 w-5 shrink-0" />
              {listing.points_value} Believe Points {listing.barter_allowed ? "or Barter" : ""}
            </p>
            {(listing.category || ((listing.benefit_groups || listing.benefitGroups)?.length)) && (
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Category:</span> {listing.category?.name ?? "—"}
                {listing.subcategory && <> → {listing.subcategory.name}</>}
                {((listing.benefit_groups || listing.benefitGroups) ?? []).length > 0 && (
                  <>
                    {" "}
                    <span className="font-medium text-foreground">Benefits:</span> {(listing.benefit_groups || listing.benefitGroups)!.map((b) => b.name).join(", ")}
                  </>
                )}
              </div>
            )}
            {listing.description && (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{listing.description}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {isOwner ? (
                <Button asChild variant="outline" className="min-h-10 touch-manipulation">
                  <Link href={route("barter.my-listings")}>Edit in My Listings</Link>
                </Button>
              ) : (
                <Button
                  className="min-h-10 touch-manipulation"
                  onClick={() => setTradeModalOpen(true)}
                  disabled={auth?.organization?.id === listing.nonprofit?.id}
                >
                  Request Trade
                </Button>
              )}
              <Button asChild variant="outline" className="min-h-10 touch-manipulation">
                <Link href={route("barter.marketplace")}>Back to Marketplace</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {tradeModalOpen && (
          <RequestTradeModal
            requestedListing={listing}
            myListings={myListings}
            onClose={() => setTradeModalOpen(false)}
          />
        )}
      </BarterLayout>
    </AppLayout>
  );
}
