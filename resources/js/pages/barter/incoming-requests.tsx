"use client";

import React from "react";
import { Head, Link, router } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { BarterLayout } from "./BarterLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

declare global {
  function route(name: string, params?: Record<string, unknown>): string;
}

interface Request {
  id: number;
  requesting_nonprofit_id: number;
  requested_listing_id: number;
  return_listing_id?: number | null;
  points_delta: number;
  requestingNonprofit?: { id: number; name: string };
  requestedListing?: { id: number; title: string; points_value: number };
  returnListing?: { id: number; title: string } | null;
}

interface IncomingRequestsProps {
  requests: { data: Request[]; links: any[] };
}

export default function BarterIncomingRequests({ requests }: IncomingRequestsProps) {
  const items = requests.data ?? [];

  const accept = (id: number) => {
    router.post(route("barter.transactions.accept", { transaction: id }));
  };

  const reject = (id: number) => {
    router.post(route("barter.transactions.reject", { transaction: id }));
  };

  return (
    <AppLayout>
      <Head title="Incoming Requests – Nonprofit Barter Network" />
      <BarterLayout currentTab="home" title="Incoming Trade Offers">
        <div className="space-y-3 sm:space-y-4">
          {items.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">No pending requests.</p>
              </CardContent>
            </Card>
          ) : (
            items.map((req) => (
              <Card key={req.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground">
                      {req.requestedListing?.title}
                      {req.points_delta !== 0 && (
                        <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                          {req.points_delta > 0 ? `+${req.points_delta}` : req.points_delta} pts
                        </span>
                      )}
                    </h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      From {req.requestingNonprofit?.name}
                    </p>
                  </div>
                  <div className="flex w-full gap-2 sm:w-auto sm:shrink-0">
                    <Button
                      size="sm"
                      className="min-h-9 flex-1 touch-manipulation sm:flex-none"
                      onClick={() => accept(req.id)}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-9 flex-1 touch-manipulation sm:flex-none"
                      onClick={() => reject(req.id)}
                    >
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </BarterLayout>
    </AppLayout>
  );
}
