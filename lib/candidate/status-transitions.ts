import type { PortalProfileStatus } from "./portal-types";

/** Staff-only portal review transitions. Single source of truth for app + tests. */
export const STAFF_TRANSITIONS: Record<PortalProfileStatus, PortalProfileStatus[]> = {
  submitted: ["in_review"],
  in_review: ["changes_requested", "approved", "rejected"],
  changes_requested: [],
  approved: [],
  rejected: [],
  draft: [],
};

/** Statuses in which a candidate may save profile content. */
export const CANDIDATE_EDITABLE_STATUSES: readonly PortalProfileStatus[] = [
  "draft",
  "changes_requested",
  "approved",
] as const;

export function isStaffTransitionAllowed(
  from: PortalProfileStatus,
  to: PortalProfileStatus
): boolean {
  return (STAFF_TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Candidate may edit only in draft / changes_requested.
 * approved keeps the existing workflow: edit resets to draft (caller must record the event).
 * submitted / in_review / rejected are locked.
 */
export function assertCandidateCanEditProfile(status: PortalProfileStatus): void {
  if (status === "draft" || status === "changes_requested" || status === "approved") {
    return;
  }
  throw new Error(
    "Profil kann in diesem Status nicht bearbeitet werden. Warte auf Abschluss der Prüfung oder eine Rückmeldung."
  );
}

export function candidateEditResetsApproved(status: PortalProfileStatus): boolean {
  return status === "approved";
}

export type ReviewTransitionAttempt = {
  fromStatus: PortalProfileStatus;
  toStatus: PortalProfileStatus;
  matchedRows: number;
};

/** Contract for atomic CTE update+event (F-07); used by live SQL and unit tests. */
export function evaluateReviewTransitionAttempt(
  attempt: ReviewTransitionAttempt
): { ok: true } | { ok: false; reason: "invalid_transition" | "conflict" } {
  if (!isStaffTransitionAllowed(attempt.fromStatus, attempt.toStatus)) {
    return { ok: false, reason: "invalid_transition" };
  }
  if (attempt.matchedRows <= 0) {
    return { ok: false, reason: "conflict" };
  }
  return { ok: true };
}

/**
 * Two reviewers both observe the same initial status; only the first conditional
 * update wins (matchedRows=0 → conflict for the loser).
 */
export function simulateConcurrentReviews(args: {
  initialStatus: PortalProfileStatus;
  firstTo: PortalProfileStatus;
  secondTo: PortalProfileStatus;
}) {
  const expected = args.initialStatus;
  let status = args.initialStatus;

  const run = (actor: "first" | "second", toStatus: PortalProfileStatus) => {
    const allowed = isStaffTransitionAllowed(expected, toStatus);
    const matchedRows = allowed && status === expected ? 1 : 0;
    if (matchedRows === 1) status = toStatus;
    return {
      actor,
      ...evaluateReviewTransitionAttempt({
        fromStatus: expected,
        toStatus,
        matchedRows,
      }),
    };
  };

  const results = [run("first", args.firstTo), run("second", args.secondTo)];
  return { finalStatus: status, results };
}

/**
 * Contract for atomic approved → draft + event (BA3.3 Teil B).
 * Live path uses a CTE; this models matchedRows / partial-write refusal for unit tests.
 */
export type ApprovedToDraftAttempt = {
  fromStatus: PortalProfileStatus;
  matchedRows: number;
  eventInserted: boolean;
};

export function evaluateApprovedToDraftAttempt(
  attempt: ApprovedToDraftAttempt
): { ok: true } | { ok: false; reason: "invalid_status" | "conflict" | "partial_write" } {
  if (attempt.fromStatus !== "approved") {
    return { ok: false, reason: "invalid_status" };
  }
  if (attempt.matchedRows <= 0) {
    return { ok: false, reason: "conflict" };
  }
  if (!attempt.eventInserted) {
    return { ok: false, reason: "partial_write" };
  }
  return { ok: true };
}

/** Concurrent approved→draft: only one conditional CTE can match. */
export function simulateConcurrentApprovedToDraft() {
  let status: PortalProfileStatus = "approved";
  const expected: PortalProfileStatus = "approved";

  const run = (actor: "first" | "second") => {
    const matchedRows = status === expected ? 1 : 0;
    const eventInserted = matchedRows === 1;
    if (matchedRows === 1) status = "draft";
    return {
      actor,
      ...evaluateApprovedToDraftAttempt({
        fromStatus: expected,
        matchedRows,
        eventInserted,
      }),
    };
  };

  const results = [run("first"), run("second")];
  return { finalStatus: status, results };
}
