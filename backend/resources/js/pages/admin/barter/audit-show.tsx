"use client";

import React from "react";
import { Head, Link } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Handshake, AlertTriangle } from "lucide-react";
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
  title: string;
  description?: string;
  points_value: number;
  barter_allowed?: boolean;
}

interface Settlement {
  id: number;
  points: number;
  fromOrganization?: { id: number; name: string };
  toOrganization?: { id: number; name: string };
}

interface Offer {
  id: number;
  proposed_points_delta: number | null;
  message: string | null;
  status: string;
  proposerNonprofit?: { id: number; name: string };
  proposedReturnListing?: { id: number; title: string; points_value: number };
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
  updated_at: string;
  requestingNonprofit?: Org;
  respondingNonprofit?: Org;
  requestedListing?: Listing;
  returnListing?: Listing | null;
  settlements?: Settlement[];
  offers?: Offer[];
}

interface AuditShowProps {
  transaction: Transaction;
}

export default function AdminBarterAuditShow({ transaction: t }: AuditShowProps) {
  return (
    <AppLayout>
      <Head title={`Barter Transaction #${t.id} – Admin`} />
      <div className="space-y-6 p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={route("admin.barter.index")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Handshake className="h-6 w-6" />
            Transaction #{t.id}
          </h1>
          <Badge variant="secondary">{t.status}</Badge>
          {t.dispute_flag && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> Dispute flagged
            </Badge>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nonprofits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Requester (A)</p>
                <p className="font-medium">{t.requestingNonprofit?.name}</p>
                {t.requestingNonprofit?.ein && (
                  <p className="text-sm text-muted-foreground">EIN {t.requestingNonprofit.ein}</p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Responder (B)</p>
                <p className="font-medium">{t.respondingNonprofit?.name}</p>
                {t.respondingNonprofit?.ein && (
                  <p className="text-sm text-muted-foreground">EIN {t.respondingNonprofit.ein}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Listings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Requested (B’s listing)</p>
                <p className="font-medium">{t.requestedListing?.title}</p>
                {t.requestedListing?.points_value != null && (
                  <p className="text-sm text-muted-foreground">{t.requestedListing.points_value} pts</p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Return (A’s listing)</p>
                <p className="font-medium">{t.returnListing?.title ?? "—"}</p>
                {t.returnListing?.points_value != null && (
                  <p className="text-sm text-muted-foreground">{t.returnListing.points_value} pts</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Settlement & timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>
              <span className="text-muted-foreground">Points delta: </span>
              <span className={t.points_delta > 0 ? "text-amber-600" : t.points_delta < 0 ? "text-emerald-600" : ""}>
                {t.points_delta > 0 ? "+" : ""}{t.points_delta}
              </span>
              {t.points_delta > 0 && " (A pays B)"}
              {t.points_delta < 0 && " (B pays A)"}
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>Created: {format(new Date(t.created_at), "PPpp")}</li>
              {t.accepted_at && (
                <li>Accepted: {format(new Date(t.accepted_at), "PPpp")}</li>
              )}
              {t.completed_at && (
                <li>Completed: {format(new Date(t.completed_at), "PPpp")}</li>
              )}
            </ul>
            {t.settlements && t.settlements.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-sm font-medium text-muted-foreground mb-2">Ledger entries</p>
                <ul className="space-y-1 text-sm">
                  {t.settlements.map((s) => (
                    <li key={s.id}>
                      {s.fromOrganization?.name} → {s.toOrganization?.name}: {s.points} pts
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {t.offers && t.offers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Counter-offers</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {t.offers.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{o.proposerNonprofit?.name}</span>
                    {o.proposedReturnListing && (
                      <span>→ {o.proposedReturnListing.title} ({o.proposedReturnListing.points_value} pts)</span>
                    )}
                    {o.proposed_points_delta != null && (
                      <Badge variant="outline">Δ {o.proposed_points_delta}</Badge>
                    )}
                    <Badge variant="secondary">{o.status}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
