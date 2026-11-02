"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submissionStatusLabels } from "@/lib/labels";
import { formatCurrency, initials } from "@/lib/utils";
import { addCandidateToMatching, updateSubmissionStatus } from "@/app/(app)/vakanzen/actions";

type Submission = {
  id: string;
  match_score: number | null;
  status: string;
  candidate: {
    id: string;
    first_name: string;
    last_name: string;
    anonymized_title: string | null;
    hourly_rate_net: number | null;
    location: string | null;
  } | null;
};

type CandidateOption = {
  id: string;
  first_name: string;
  last_name: string;
  anonymized_title: string | null;
};

export function MatchingPanel({
  vacancyId,
  submissions,
  availableCandidates,
}: {
  vacancyId: string;
  submissions: Submission[];
  availableCandidates: CandidateOption[];
}) {
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [matchScore, setMatchScore] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!selectedCandidate) return;
    startTransition(async () => {
      await addCandidateToMatching(
        vacancyId,
        selectedCandidate,
        matchScore ? Number(matchScore) : undefined
      );
      setSelectedCandidate("");
      setMatchScore("");
    });
  }

  return (
    <div className="rounded-lg border border-surface-border bg-white shadow-panel">
      <div className="border-b border-surface-border px-5 py-3">
        <h2 className="text-sm font-medium text-ink">Matching & Einreichungen</h2>
      </div>

      {submissions.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-muted">Noch keine Kandidaten zugeordnet.</p>
      ) : (
        <ul className="divide-y divide-surface-border">
          {submissions.map((submission) => (
            <li key={submission.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-semibold text-brand">
                  {initials(submission.candidate?.first_name, submission.candidate?.last_name)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">
                    {submission.candidate?.first_name} {submission.candidate?.last_name}
                  </span>
                  <span className="block truncate text-xs text-ink-muted">
                    {submission.candidate?.anonymized_title ?? "–"} ·{" "}
                    {submission.candidate?.hourly_rate_net
                      ? formatCurrency(submission.candidate.hourly_rate_net) + "/Std."
                      : "Satz offen"}
                  </span>
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {submission.match_score != null && (
                  <Badge variant="brand">{submission.match_score}% Match</Badge>
                )}
                <Select
                  value={submission.status}
                  onValueChange={(status) =>
                    startTransition(() => updateSubmissionStatus(submission.id, vacancyId, status))
                  }
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(submissionStatusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-surface-border px-5 py-3">
        <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Kandidat auswählen…" />
          </SelectTrigger>
          <SelectContent>
            {availableCandidates.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.first_name} {c.last_name} {c.anonymized_title ? `— ${c.anonymized_title}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={matchScore}
          onChange={(e) => setMatchScore(e.target.value)}
          placeholder="Match-Score %"
          type="number"
          min={0}
          max={100}
          className="w-32"
        />
        <Button variant="secondary" size="sm" onClick={handleAdd} disabled={isPending || !selectedCandidate}>
          <Plus className="h-3.5 w-3.5" />
          Zur Vakanz hinzufügen
        </Button>
      </div>
    </div>
  );
}
