"use client";

import React from "react";
import { Head, Link } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { BarterLayout } from "./BarterLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Coins } from "lucide-react";

declare global {
  function route(name: string, params?: Record<string, unknown>): string;
}

interface PointsWalletProps {
  balance: number;
}

export default function BarterPointsWallet({ balance }: PointsWalletProps) {
  return (
    <AppLayout>
      <Head title="My Points Wallet – Nonprofit Barter Network" />
      <BarterLayout title="My Points Wallet">
        <Card className="mx-auto w-full max-w-md overflow-hidden">
          <CardContent className="flex flex-col items-center gap-4 px-4 py-8 sm:py-10">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-16 sm:w-16">
              <Coins className="h-8 w-8 sm:h-9 sm:w-9" />
            </div>
            <p className="text-sm text-muted-foreground">Believe Points balance</p>
            <p className="text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
              {Number(balance).toLocaleString()}
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Use points to settle barter trades with other nonprofits. No cash, no Stripe.
            </p>
            <Link
              href={route("believe-points.index")}
              className="text-sm font-medium text-primary hover:underline"
            >
              Manage Believe Points
            </Link>
          </CardContent>
        </Card>
      </BarterLayout>
    </AppLayout>
  );
}
