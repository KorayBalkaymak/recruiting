export const INTERNAL_ROLES = ["recruiter", "kam", "geschaeftsleitung", "admin"] as const;

export type InternalRole = (typeof INTERNAL_ROLES)[number];

export const CANDIDATE_ROLE = "candidate" as const;

export type AppRole = InternalRole | typeof CANDIDATE_ROLE;

export type StaffUser = {
  id: string;
  email: string;
  fullName: string;
  role: InternalRole;
};

export type CandidateUser = {
  accountId: string;
  candidateId: string;
  email: string;
  fullName: string;
  role: typeof CANDIDATE_ROLE;
};

export function isInternalRole(value: unknown): value is InternalRole {
  return typeof value === "string" && (INTERNAL_ROLES as readonly string[]).includes(value);
}

export function isCandidateRole(value: unknown): value is typeof CANDIDATE_ROLE {
  return value === CANDIDATE_ROLE;
}

export function isAppRole(value: unknown): value is AppRole {
  return isInternalRole(value) || isCandidateRole(value);
}

export function canManageUsers(role: InternalRole) {
  return role === "admin" || role === "geschaeftsleitung";
}

export function canReviewOffers(role: InternalRole) {
  return role === "admin" || role === "geschaeftsleitung" || role === "kam";
}

export function isStaffRole(role: InternalRole) {
  return (INTERNAL_ROLES as readonly string[]).includes(role);
}

/**
 * Pure guard used by updateUserRole before any profile/auth writes.
 * Candidate accounts and missing staff profiles are rejected without side effects.
 */
export function assertStaffProfileForRoleChange(profile: {
  id: string;
  role: unknown;
} | null): { id: string; role: InternalRole } {
  if (!profile) {
    throw new Error("Kein internes Nutzerprofil gefunden.");
  }
  if (!isInternalRole(profile.role)) {
    throw new Error("Rollenänderung nur für interne Nutzer erlaubt.");
  }
  return { id: profile.id, role: profile.role };
}
