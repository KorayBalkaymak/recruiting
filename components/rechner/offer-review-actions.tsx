"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { reviewOffer, sendOfferForApproval } from "@/app/(app)/rechner/actions";

export function OfferReviewActions({ offerId, status }: { offerId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  if (status === "entwurf") {
    return (
      <Button size="sm" variant="secondary" disabled={isPending} onClick={() => startTransition(() => sendOfferForApproval(offerId))}>
        Zur Freigabe senden
      </Button>
    );
  }

  if (status === "zur_freigabe" || status === "in_pruefung") {
    return (
      <div className="flex gap-1.5">
        <Button size="sm" disabled={isPending} onClick={() => startTransition(() => reviewOffer(offerId, true))}>
          Freigeben
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={isPending}
          onClick={() => startTransition(() => reviewOffer(offerId, false))}
        >
          Ablehnen
        </Button>
      </div>
    );
  }

  return null;
}
