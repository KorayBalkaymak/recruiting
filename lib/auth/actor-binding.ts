/**
 * Pure actor-binding checks (Node-testable without path aliases).
 * Keep role literals in sync with lib/auth/roles.ts.
 */

export type StaffActor = {
  id: string;
  email: string;
  fullName: string;
  role: "recruiter" | "kam" | "geschaeftsleitung" | "admin";
};

export type CandidateActor = {
  accountId: string;
  candidateId: string;
  email: string;
  fullName: string;
  role: "candidate";
};

export class ActorAccessError extends Error {
  readonly code: "UNAUTHENTICATED" | "FORBIDDEN";

  constructor(code: "UNAUTHENTICATED" | "FORBIDDEN", message: string) {
    super(message);
    this.name = "ActorAccessError";
    this.code = code;
  }
}

const INTERNAL_ROLES = new Set([
  "recruiter",
  "kam",
  "geschaeftsleitung",
  "admin",
]);

function isStaffUser(value: unknown): value is StaffActor {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.email === "string" &&
    typeof v.fullName === "string" &&
    typeof v.role === "string" &&
    INTERNAL_ROLES.has(v.role)
  );
}

function isCandidateUser(value: unknown): value is CandidateActor {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.accountId === "string" &&
    typeof v.candidateId === "string" &&
    typeof v.email === "string" &&
    typeof v.fullName === "string" &&
    v.role === "candidate"
  );
}

/** Staff CRM / portal review access — rejects candidates and malformed actors. */
export function assertStaffActor(actor: unknown): StaffActor {
  if (!isStaffUser(actor)) {
    throw new ActorAccessError("FORBIDDEN", "Nur interne Nutzer haben Zugriff.");
  }
  return actor;
}

/** Candidate self-access — rejects staff-shaped objects used as candidates. */
export function assertCandidateActor(actor: unknown): CandidateActor {
  if (!isCandidateUser(actor)) {
    throw new ActorAccessError("FORBIDDEN", "Nur Kandidaten haben Zugriff.");
  }
  return actor;
}

/**
 * Candidate may only touch their own resource IDs.
 * Never treat a client-supplied candidateId as proof of identity alone.
 */
export function assertCandidateOwnsResource(
  actor: CandidateActor,
  resourceCandidateId: string
): void {
  assertCandidateActor(actor);
  if (!resourceCandidateId || actor.candidateId !== resourceCandidateId) {
    throw new ActorAccessError("FORBIDDEN", "Kein Zugriff auf diese Kandidatendaten.");
  }
}

export function assertUserManagerActor(actor: unknown): StaffActor {
  const staff = assertStaffActor(actor);
  if (staff.role !== "admin" && staff.role !== "geschaeftsleitung") {
    throw new ActorAccessError("FORBIDDEN", "Keine Berechtigung für Nutzerverwaltung.");
  }
  return staff;
}

export function assertOfferReviewerActor(actor: unknown): StaffActor {
  const staff = assertStaffActor(actor);
  if (
    staff.role !== "admin" &&
    staff.role !== "geschaeftsleitung" &&
    staff.role !== "kam"
  ) {
    throw new ActorAccessError("FORBIDDEN", "Keine Berechtigung für Angebotsfreigaben.");
  }
  return staff;
}

/**
 * Resolves the bound candidate id for candidate actors (ignores client overrides).
 * Staff actors may address any candidateId (flat single-tenant CRM ACL).
 */
export function resolveBoundCandidateId(
  actor:
    | { type: "candidate"; user: CandidateActor }
    | { type: "staff"; user: StaffActor },
  requestedCandidateId: string
): string {
  if (actor.type === "candidate") {
    assertCandidateOwnsResource(actor.user, requestedCandidateId);
    return actor.user.candidateId;
  }
  assertStaffActor(actor.user);
  if (!requestedCandidateId.trim()) {
    throw new ActorAccessError("FORBIDDEN", "Ungültige Kandidaten-ID.");
  }
  return requestedCandidateId;
}
