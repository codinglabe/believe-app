"use client";

import React, { useState } from "react";
import { router } from "@inertiajs/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Coins } from "lucide-react";

declare global {
  function route(name: string, params?: Record<string, unknown>): string;
}

interface Listing {
  id: number;
  title: string;
  points_value: number;
  nonprofit?: { name: string };
}

interface RequestTradeModalProps {
  requestedListing: Listing;
  myListings: { id: number; title: string; points_value: number }[];
  onClose: () => void;
}

export default function RequestTradeModal({
  requestedListing,
  myListings,
  onClose,
}: RequestTradeModalProps) {
  const [returnListingId, setReturnListingId] = useState<string>("");
  const [extraPoints, setExtraPoints] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const returnListing = myListings.find((l) => l.id === Number(returnListingId));
  const baseDelta = returnListing
    ? requestedListing.points_value - returnListing.points_value
    : null;
  const extra = parseInt(extraPoints, 10) || 0;
  const previewDelta = baseDelta !== null ? baseDelta + extra : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnListingId) return;
    setSubmitting(true);
    router.post(route("barter.request-trade"), {
      requested_listing_id: requestedListing.id,
      return_listing_id: Number(returnListingId),
      extra_points: extra || 0,
    }, {
      onFinish: () => setSubmitting(false),
      onSuccess: () => onClose(),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Trade</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            You want: <strong className="text-foreground">{requestedListing.title}</strong> ({requestedListing.points_value}{" "}
            pts) from {requestedListing.nonprofit?.name}. Select one of your listings to offer in
            return.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Your listing to offer</Label>
            <Select value={returnListingId} onValueChange={setReturnListingId} required>
              <SelectTrigger className="mt-1 min-h-10">
                <SelectValue placeholder="Select a listing" />
              </SelectTrigger>
              <SelectContent>
                {myListings.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.title} ({l.points_value} pts)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Extra Believe Points (optional)</Label>
            <Input
              type="number"
              min={0}
              value={extraPoints}
              onChange={(e) => setExtraPoints(e.target.value)}
              placeholder="0"
              className="mt-1 min-h-10"
            />
          </div>
          {previewDelta !== null && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Coins className="h-4 w-4 shrink-0 text-primary" />
              {previewDelta > 0
                ? `You pay ${previewDelta} points to them`
                : previewDelta < 0
                  ? `They pay ${Math.abs(previewDelta)} points to you`
                  : "Even swap, no points movement"}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} className="min-h-10 touch-manipulation">
              Cancel
            </Button>
            <Button type="submit" disabled={!returnListingId || submitting} className="min-h-10 touch-manipulation">
              {submitting ? "Sending…" : "Send Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
