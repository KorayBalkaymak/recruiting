import "server-only";

import { AuthError } from "./errors";
import {
  canManageUsers,
  canReviewOffers,
  type CandidateUser,
  type InternalRole,
  type StaffUser,
} from "./roles";
import { getSessionCandidate, getSessionStaff } from "./session";

export async function requireStaff(): Promise<StaffUser> {
  const staff = await getSessionStaff();
  if (!staff) {
    throw new AuthError("UNAUTHENTICATED", "Anmeldung erforderlich.");
  }
  return staff;
}

export async function requireCandidate(): Promise<CandidateUser> {
  const candidate = await getSessionCandidate();
  if (!candidate) {
    throw new AuthError("UNAUTHENTICATED", "Anmeldung erforderlich.");
  }
  return candidate;
}

export async function requireRoles(allowed: InternalRole[]): Promise<StaffUser> {
  const staff = await requireStaff();
  if (!allowed.includes(staff.role)) {
    throw new AuthError("FORBIDDEN", "Keine Berechtigung für diese Aktion.");
  }
  return staff;
}

export async function requireAdmin(): Promise<StaffUser> {
  return requireRoles(["admin", "geschaeftsleitung"]);
}

export async function requireUserManager(): Promise<StaffUser> {
  const staff = await requireStaff();
  if (!canManageUsers(staff.role)) {
    throw new AuthError("FORBIDDEN", "Keine Berechtigung für Nutzerverwaltung.");
  }
  return staff;
}

export async function requireOfferReviewer(): Promise<StaffUser> {
  const staff = await requireStaff();
  if (!canReviewOffers(staff.role)) {
    throw new AuthError("FORBIDDEN", "Keine Berechtigung für Angebotsfreigaben.");
  }
  return staff;
}
