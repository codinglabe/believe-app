"use client";

import React from "react";
import { Head, Link } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { BarterLayout } from "./BarterLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ChevronRight } from "lucide-react";

declare global {
  function route(name: string, params?: Record<string, unknown>): string;
}

interface Listing {
  id: number;
  title: string;
  description?: string;
  points_value: number;
  barter_allowed: boolean;
  status: string;
  image_url?: string | null;
  nonprofit?: { id: number; name: string };
}

interface IncomingRequest {
  id: number;
  requesting_nonprofit_id: number;
  requested_listing_id: number;
  points_delta: number;
  requestingNonprofit?: { id: number; name: string };
  requestedListing?: { id: number; title: string; points_value: number };
  returnListing?: { id: number; title: string } | null;
}

interface RecentTrade {
  id: number;
  requestingNonprofit?: { id: number; name: string };
  respondingNonprofit?: { id: number; name: string };
  requestedListing?: { id: number; title: string };
  returnListing?: { id: number; title: string } | null;
}

interface BarterIndexProps {
  balance: number;
  organizationName: string;
  currentListings: Listing[];
  incomingRequests: IncomingRequest[];
  recentTrades: RecentTrade[];
  recentListings: { id: number; title: string; status: string }[];
}

export default function BarterIndex({
  currentListings,
  incomingRequests,
  recentTrades,
  recentListings,
}: BarterIndexProps) {
  return (
    <AppLayout>
      <Head title="Nonprofit Barter Network" />
      <BarterLayout currentTab="home" recentListings={recentListings}>
        {/* Layout like image: Current Listings (left) | Incoming Offers (right), then Recent Trades full width */}
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2 lg:gap-6">
          {/* Current Listings */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 pt-4 sm:pt-6">
              <CardTitle className="text-base font-semibold sm:text-lg">Current Listings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-4 sm:pb-6">
              {currentListings.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  No active listings.{" "}
                  <Link href={route("barter.my-listings")} className="font-medium text-primary hover:underline">
                    Create one
                  </Link>
                </p>
              ) : (
                currentListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="flex flex-col overflow-hidden rounded-xl border border-border bg-muted/20 transition hover:bg-muted/30 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <Link
                      href={route("barter.listings.show", { listing: listing.id })}
                      className="aspect-video w-full shrink-0 bg-muted sm:aspect-square sm:w-20 sm:rounded-lg overflow-hidden"
                    >
                      {listing.image_url ? (
                        <img src={listing.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full" />
                      )}
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:py-3 sm:pr-3">
                      <p className="font-medium text-foreground line-clamp-2">{listing.title}</p>
                      <p className="text-xs text-muted-foreground sm:text-sm">
                        {listing.nonprofit?.name} · {listing.points_value} Believe Points or Barter
                      </p>
                      <Button variant="outline" size="sm" className="mt-1 w-full shrink-0 touch-manipulation sm:w-auto sm:min-h-9" asChild>
                        <Link href={route("barter.listings.show", { listing: listing.id })} className="inline-flex items-center gap-1">
                          View Details <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Incoming Trade Offers */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 pt-4 sm:pt-6">
              <CardTitle className="text-base font-semibold sm:text-lg">Incoming Trade Offers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-4 sm:pb-6">
              {incomingRequests.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">No pending offers.</p>
              ) : (
                incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-3 transition hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">
                        {req.requestedListing?.title}
                        {req.points_delta !== 0 && (
                          <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                            {req.points_delta > 0 ? "+" : ""}{req.points_delta} pts
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                        {req.requestingNonprofit?.name}
                      </p>
                    </div>
                    <Button size="sm" className="w-full shrink-0 touch-manipulation sm:min-h-9 sm:w-auto" asChild>
                      <Link href={route("barter.incoming-requests")}>Review Offer</Link>
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Trades — full width */}
          <Card className="lg:col-span-2 overflow-hidden">
            <CardHeader className="pb-2 pt-4 sm:pt-6">
              <CardTitle className="text-base font-semibold sm:text-lg">Recent Trades</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 sm:pb-6">
              {recentTrades.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">No completed trades yet.</p>
              ) : (
                <ul className="space-y-2">
                  {recentTrades.map((trade) => (
                    <li
                      key={trade.id}
                      className="flex min-h-[48px] items-center justify-between gap-3 rounded-lg border border-border bg-muted/10 py-2.5 pl-3 pr-2"
                    >
                      <span className="min-w-0 flex-1 text-sm text-foreground line-clamp-2">
                        {trade.requestedListing?.title} ↔ {trade.returnListing?.title ?? "—"}
                      </span>
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-500" />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </BarterLayout>
    </AppLayout>
  );
}
