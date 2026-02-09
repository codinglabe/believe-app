"use client";

import React from "react";
import { Head } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { BarterLayout } from "./BarterLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

interface ReputationProps {
  score?: number | null;
}

export default function BarterReputation({ score }: ReputationProps) {
  return (
    <AppLayout>
      <Head title="Reputation Score – Nonprofit Barter Network" />
      <BarterLayout title="Reputation Score">
        <Card className="mx-auto w-full max-w-md overflow-hidden">
          <CardContent className="flex flex-col items-center gap-4 px-4 py-8 sm:py-10">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 sm:h-16 sm:w-16">
              <Star className="h-8 w-8 sm:h-9 sm:w-9" />
            </div>
            <p className="text-sm text-muted-foreground">Your reputation</p>
            {score != null ? (
              <p className="text-3xl font-bold text-foreground sm:text-4xl">{score}</p>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                Complete trades to earn ratings. Reputation will appear here in a future update.
              </p>
            )}
          </CardContent>
        </Card>
      </BarterLayout>
    </AppLayout>
  );
}
