"use client";

import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { candidateStatusLabels } from "@/lib/labels";
import { updateCandidateStatus } from "@/app/(app)/kandidaten/actions";
import type { CandidateStatus } from "@/types/supabase";

export function CandidateStatusSelect({
  candidateId,
  status,
}: {
  candidateId: string;
  status: CandidateStatus;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      onValueChange={(value) =>
        startTransition(() => updateCandidateStatus(candidateId, value as CandidateStatus))
      }
      disabled={isPending}
    >
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(candidateStatusLabels).map(([value, meta]) => (
          <SelectItem key={value} value={value}>
            {meta.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
