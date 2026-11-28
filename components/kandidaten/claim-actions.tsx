"use client";

import { useState, useTransition } from "react";
import { claimCandidate, releaseCandidateClaim } from "@/app/(app)/kandidaten/actions";
import { Button } from "@/components/ui/button";
import { claimLiveLabel } from "@/lib/candidate/recruiter-workflow";

export function CandidateClaimActions({
  candidateId,
  currentUserId,
  canForceRelease,
  claimedBy,
}: {
  candidateId: string;
  currentUserId: string;
  canForceRelease: boolean;
  claimedBy: { id: string; full_name: string } | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isOwner = claimedBy?.id === currentUserId;
  const isClaimedByOther = Boolean(claimedBy && !isOwner);

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      {claimedBy ? (
        <p className="text-xs text-white/65">
          {isOwner ? "Sie bearbeiten diesen Kandidaten gerade." : claimLiveLabel(claimedBy.full_name)}
        </p>
      ) : null}

      {!claimedBy ? (
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={() => run(() => claimCandidate(candidateId))}
        >
          Kandidat bearbeiten übernehmen
        </Button>
      ) : null}

      {isOwner ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => run(() => releaseCandidateClaim(candidateId))}
        >
          Bearbeitung abschließen
        </Button>
      ) : null}

      {isClaimedByOther ? (
        canForceRelease ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={isPending}
            onClick={() => run(() => releaseCandidateClaim(candidateId))}
          >
            Übernahme aufheben
          </Button>
        ) : (
          <Button type="button" size="sm" disabled>
            Kandidat bearbeiten übernehmen
          </Button>
        )
      ) : null}

      {error ? <p className="text-xs text-status-danger">{error}</p> : null}
    </div>
  );
}
