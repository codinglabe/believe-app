"use client";

import React from "react";
import { Head, Link } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { BarterLayout } from "./BarterLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

declare global {
  function route(name: string, params?: Record<string, unknown>): string;
}

interface Trade {
  id: number;
  status: string;
  points_delta: number;
  requestingNonprofit?: { id: number; name: string };
  respondingNonprofit?: { id: number; name: string };
  requestedListing?: { id: number; title: string };
  returnListing?: { id: number; title: string } | null;
}

interface ActiveTradesProps {
  trades: { data: Trade[]; links: any[] };
}

export default function BarterActiveTrades({ trades }: ActiveTradesProps) {
  const items = trades.data ?? [];

  return (
    <AppLayout>
      <Head title="Active Trades – Nonprofit Barter Network" />
      <BarterLayout currentTab="trades" title="Active Trades">
        <div className="space-y-3 sm:space-y-4">
          {items.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">No active trades.</p>
              </CardContent>
            </Card>
          ) : (
            items.map((trade) => (
              <Card key={trade.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:gap-4">
                  <p className="font-medium text-foreground line-clamp-2">
                    {trade.requestedListing?.title} ↔ {trade.returnListing?.title ?? "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {trade.requestingNonprofit?.name} · {trade.respondingNonprofit?.name}
                    {trade.points_delta !== 0 && (
                      <span className="ml-1">
                        · {trade.points_delta > 0 ? "You receive" : "You pay"}{" "}
                        {Math.abs(trade.points_delta)} pts
                      </span>
                    )}
                  </p>
                  <Badge variant="secondary" className="w-fit">
                    {trade.status}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </BarterLayout>
    </AppLayout>
  );
}
