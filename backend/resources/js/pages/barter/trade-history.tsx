"use client";

import React from "react";
import { Head } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { BarterLayout } from "./BarterLayout";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

declare global {
  function route(name: string, params?: Record<string, unknown>): string;
}

interface Trade {
  id: number;
  requestingNonprofit?: { id: number; name: string };
  respondingNonprofit?: { id: number; name: string };
  requestedListing?: { id: number; title: string };
  returnListing?: { id: number; title: string } | null;
}

interface TradeHistoryProps {
  trades: { data: Trade[]; links: any[] };
}

export default function BarterTradeHistory({ trades }: TradeHistoryProps) {
  const items = trades.data ?? [];

  return (
    <AppLayout>
      <Head title="Trade History – Nonprofit Barter Network" />
      <BarterLayout title="Trade History">
        <div className="space-y-3">
          {items.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">No completed trades yet.</p>
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-2">
              {items.map((trade) => (
                <li
                  key={trade.id}
                  className="flex min-h-[48px] items-center justify-between gap-3 rounded-xl border border-border bg-card py-2.5 pl-3 pr-2"
                >
                  <span className="min-w-0 flex-1 text-sm text-foreground line-clamp-2">
                    {trade.requestedListing?.title} ↔ {trade.returnListing?.title ?? "—"}
                  </span>
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-500" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </BarterLayout>
    </AppLayout>
  );
}
