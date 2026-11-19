export const MISSING_DOCUMENTS_TAB = "keine_unterlagen";
export const RECRUITER_INACTIVITY_DAYS = 3;
const DAY_MS = 86_400_000;

export function hasRequiredApplicationDocument(input: {
  originalCvCount: number;
  cvFilePath: string | null | undefined;
}) {
  return input.originalCvCount > 0 || Boolean(input.cvFilePath);
}

/** Registered portal account without a CV/application document. Not the same as an incomplete profile. */
export function isRegisteredWithoutUploads(input: {
  hasAccount: boolean;
  originalCvCount: number;
  cvFilePath: string | null | undefined;
}) {
  return input.hasAccount && !hasRequiredApplicationDocument(input);
}

export function recruiterInactivity(
  lastRecruiterActionAt: string | Date | null | undefined,
  now: Date = new Date()
): { stale: boolean; days: number | null; label: string | null; lastActionAt: string | null } {
  if (!lastRecruiterActionAt) {
    return {
      stale: true,
      days: null,
      label: "Noch nicht bearbeitet",
      lastActionAt: null,
    };
  }

  const last =
    typeof lastRecruiterActionAt === "string" ? new Date(lastRecruiterActionAt) : lastRecruiterActionAt;
  const days = Math.floor((now.getTime() - last.getTime()) / DAY_MS);
  if (days < RECRUITER_INACTIVITY_DAYS) {
    return { stale: false, days, label: null, lastActionAt: last.toISOString() };
  }

  return {
    stale: true,
    days,
    label:
      days === RECRUITER_INACTIVITY_DAYS
        ? "Seit 3 Tagen nicht bearbeitet"
        : `Seit ${days} Tagen nicht bearbeitet`,
    lastActionAt: last.toISOString(),
  };
}

export function firstGivenName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export function claimStatusLabel(fullName: string) {
  return `In Bearbeitung durch ${fullName}`;
}

export function claimLiveLabel(fullName: string) {
  return `${firstGivenName(fullName)} bearbeitet diesen Kandidaten gerade.`;
}

export function evaluateClaimAttempt(state: { claimedById: string | null }, actorId: string) {
  if (!state.claimedById) return { ok: true as const };
  if (state.claimedById === actorId) return { ok: false as const, reason: "already_yours" as const };
  return { ok: false as const, reason: "claimed_by_other" as const };
}

export function evaluateReleaseAttempt(
  state: { claimedById: string | null },
  actor: { id: string; canForce: boolean }
) {
  if (!state.claimedById) return { ok: false as const, reason: "not_claimed" as const };
  if (state.claimedById === actor.id) return { ok: true as const, mode: "owner" as const };
  if (actor.canForce) return { ok: true as const, mode: "force" as const };
  return { ok: false as const, reason: "forbidden" as const };
}

/** Two recruiters race: only the first matching WHERE claimed_by is null wins. */
export function evaluateConcurrentClaims(firstMatchedRows: number, secondMatchedRows: number) {
  return {
    firstWon: firstMatchedRows === 1,
    secondWon: secondMatchedRows === 1,
    conflict: firstMatchedRows + secondMatchedRows !== 1,
  };
}
