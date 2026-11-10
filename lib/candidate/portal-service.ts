import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  candidatePortalProfiles,
  candidateProfileReviewEvents,
  candidateSearchProfiles,
  candidateTerms,
  candidates,
} from "@/lib/db/schema";
import {
  assertSearchRadius,
  sanitizeTermList,
  type CandidateTermKind,
} from "@/lib/candidate/terms";
import { normalizeTerm } from "@/lib/candidate/terms";
import {
  assertCandidateCanEditProfile,
  candidateEditResetsApproved,
  isStaffTransitionAllowed,
} from "@/lib/candidate/status-transitions";
import { isDemoMode } from "@/lib/demo/mode";
import {
  getDemoPortalProfile,
  getDemoReviewEvents,
  listDemoPortalProfilesForReview,
  replaceDemoTerms,
  upsertDemoPortalProfile,
} from "@/lib/demo/candidate-portal";
import type { PortalProfileStatus } from "@/lib/candidate/portal-types";
import { ConflictError } from "@/lib/auth/conflicts";
import {
  assertCandidateActor,
  assertCandidateOwnsResource,
  assertStaffActor,
} from "@/lib/auth/actor-binding";
import type { CandidateUser, StaffUser } from "@/lib/auth";
import {
  notifyCandidatePortalStatus,
  notifyStaffPortalSubmitted,
} from "@/lib/mail/send";

async function safeNotifyCandidateStatus(
  candidateId: string,
  status: PortalProfileStatus,
  note?: string | null
) {
  if (isDemoMode()) return;
  if (status !== "changes_requested" && status !== "approved" && status !== "rejected") {
    return;
  }
  try {
    const db = getDb();
    const [row] = await db
      .select({
        email: candidates.email,
        firstName: candidates.firstName,
      })
      .from(candidates)
      .where(eq(candidates.id, candidateId))
      .limit(1);
    if (!row?.email) return;
    await notifyCandidatePortalStatus({
      to: row.email,
      firstName: row.firstName || "Kandidat",
      status,
      note,
    });
  } catch (error) {
    console.warn("[mail] portal status notify failed", {
      candidateId: "[redacted]",
      status,
      reason: error instanceof Error ? error.message : "unknown",
    });
  }
}

async function safeNotifyStaffSubmission(input: {
  candidateId: string;
  firstName: string;
  lastName: string;
}) {
  if (isDemoMode()) return;
  try {
    await notifyStaffPortalSubmitted({
      candidateId: input.candidateId,
      candidateLabel: `${input.firstName} ${input.lastName}`.trim() || "Kandidat",
    });
  } catch (error) {
    console.warn("[mail] portal submit notify failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
  }
}

export type CandidatePortalView = {
  candidateId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  status: PortalProfileStatus;
  summary: string | null;
  yearsExperience: number | null;
  reviewNote: string | null;
  submittedAt: string | null;
  desiredRole: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  searchRadiusKm: number | null;
  skills: string[];
  keywords: string[];
  qualifications: string[];
};

export type ProfileSaveInput = {
  firstName: string;
  lastName: string;
  desiredRole: string;
  summary: string;
  yearsExperience: number | null;
  city: string;
  postalCode: string;
  country: string;
  searchRadiusKm: number;
  skills: string[];
  keywords: string[];
  qualifications: string[];
};

function mapDemoProfile(
  candidateId: string,
  firstName: string,
  lastName: string,
  email: string | null
): CandidatePortalView | null {
  const p = getDemoPortalProfile(candidateId);
  if (!p) return null;
  return {
    candidateId,
    firstName,
    lastName,
    email,
    status: p.status,
    summary: p.summary,
    yearsExperience: p.yearsExperience,
    reviewNote: p.reviewNote,
    submittedAt: p.submittedAt,
    desiredRole: p.desiredRole,
    city: p.city,
    postalCode: p.postalCode,
    country: p.country,
    searchRadiusKm: p.searchRadiusKm,
    skills: p.skills,
    keywords: p.keywords,
    qualifications: p.qualifications,
  };
}

export async function getCandidatePortalView(
  candidate: CandidateUser
): Promise<CandidatePortalView | null> {
  assertCandidateActor(candidate);
  if (isDemoMode()) {
    return mapDemoProfile(
      candidate.candidateId,
      candidate.fullName.split(" ")[0] ?? "Kandidat",
      candidate.fullName.split(" ").slice(1).join(" ") || "-",
      candidate.email
    );
  }

  const db = getDb();
  const [row] = await db
    .select({
      candidateId: candidates.id,
      firstName: candidates.firstName,
      lastName: candidates.lastName,
      email: candidates.email,
      status: candidatePortalProfiles.status,
      summary: candidatePortalProfiles.summary,
      yearsExperience: candidatePortalProfiles.yearsExperience,
      reviewNote: candidatePortalProfiles.reviewNote,
      submittedAt: candidatePortalProfiles.submittedAt,
      desiredRole: candidateSearchProfiles.desiredRole,
      city: candidateSearchProfiles.city,
      postalCode: candidateSearchProfiles.postalCode,
      country: candidateSearchProfiles.country,
      searchRadiusKm: candidateSearchProfiles.searchRadiusKm,
    })
    .from(candidates)
    .innerJoin(
      candidatePortalProfiles,
      eq(candidatePortalProfiles.candidateId, candidates.id)
    )
    .leftJoin(
      candidateSearchProfiles,
      eq(candidateSearchProfiles.candidateId, candidates.id)
    )
    .where(eq(candidates.id, candidate.candidateId))
    .limit(1);

  if (!row) return null;

  const terms = await db
    .select({
      kind: candidateTerms.kind,
      term: candidateTerms.term,
    })
    .from(candidateTerms)
    .where(eq(candidateTerms.candidateId, candidate.candidateId));

  const skills = terms.filter((t) => t.kind === "skill").map((t) => t.term);
  const keywords = terms.filter((t) => t.kind === "keyword").map((t) => t.term);
  const qualifications = terms
    .filter((t) => t.kind === "qualification")
    .map((t) => t.term);

  return {
    candidateId: row.candidateId,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    status: row.status,
    summary: row.summary,
    yearsExperience: row.yearsExperience,
    reviewNote: row.reviewNote,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    desiredRole: row.desiredRole,
    city: row.city,
    postalCode: row.postalCode,
    country: row.country,
    searchRadiusKm: row.searchRadiusKm,
    skills,
    keywords,
    qualifications,
  };
}

async function replaceTermsLive(candidateId: string, kind: CandidateTermKind, terms: string[]) {
  const db = getDb();
  await db
    .delete(candidateTerms)
    .where(and(eq(candidateTerms.candidateId, candidateId), eq(candidateTerms.kind, kind)));
  if (terms.length === 0) return;
  await db.insert(candidateTerms).values(
    terms.map((term) => ({
      candidateId,
      kind,
      term,
      normalized: normalizeTerm(term),
      source: "candidate" as const,
    }))
  );
}

export async function saveCandidateDraft(candidate: CandidateUser, input: ProfileSaveInput) {
  assertCandidateActor(candidate);
  const skills = sanitizeTermList(input.skills, "skill");
  const keywords = sanitizeTermList(input.keywords, "keyword");
  const qualifications = sanitizeTermList(input.qualifications, "qualification");
  assertSearchRadius(input.searchRadiusKm);

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName) throw new Error("Vor- und Nachname sind erforderlich.");

  if (isDemoMode()) {
    const current = getDemoPortalProfile(candidate.candidateId);
    if (!current) throw new Error("Profil nicht gefunden.");
    assertCandidateCanEditProfile(current.status);
    let nextStatus = current.status;
    let statusEvent: { from: PortalProfileStatus | null; to: PortalProfileStatus; note?: string } | undefined;
    if (candidateEditResetsApproved(current.status)) {
      nextStatus = "draft";
      statusEvent = {
        from: "approved",
        to: "draft",
        note: "Profil nach Freigabe bearbeitet — erneute Prüfung erforderlich",
      };
    }
    replaceDemoTerms(candidate.candidateId, "skill", skills);
    replaceDemoTerms(candidate.candidateId, "keyword", keywords);
    replaceDemoTerms(candidate.candidateId, "qualification", qualifications);
    return upsertDemoPortalProfile(
      candidate.candidateId,
      {
        status: nextStatus,
        summary: input.summary.trim() || null,
        yearsExperience: input.yearsExperience,
        desiredRole: input.desiredRole.trim() || null,
        city: input.city.trim() || null,
        postalCode: input.postalCode.trim() || null,
        country: input.country.trim() || "Deutschland",
        searchRadiusKm: input.searchRadiusKm,
        skills,
        keywords,
        qualifications,
      },
      { accountId: candidate.accountId },
      statusEvent
    );
  }

  const db = getDb();
  const [portal] = await db
    .select({ status: candidatePortalProfiles.status })
    .from(candidatePortalProfiles)
    .where(eq(candidatePortalProfiles.candidateId, candidate.candidateId))
    .limit(1);
  if (!portal) throw new Error("Profil nicht gefunden.");
  assertCandidateCanEditProfile(portal.status);

  const resetsApproved = candidateEditResetsApproved(portal.status);
  const summary = input.summary.trim() || null;
  const yearsExperience = input.yearsExperience;

  if (resetsApproved) {
    /**
     * Atomic approved → draft + review event (Neon HTTP single statement).
     * Content fields are updated in the same UPDATE so a failed event cannot leave
     * a silent content change on an still-approved profile.
     */
    const result = await db.execute(sql`
      WITH updated AS (
        UPDATE candidate_portal_profiles
        SET
          status = 'draft'::portal_profile_status,
          summary = ${summary},
          years_experience = ${yearsExperience},
          updated_at = now()
        WHERE candidate_id = ${candidate.candidateId}::uuid
          AND status = 'approved'::portal_profile_status
        RETURNING candidate_id
      )
      INSERT INTO candidate_profile_review_events (
        candidate_id,
        actor_candidate_account_id,
        from_status,
        to_status,
        note
      )
      SELECT
        updated.candidate_id,
        ${candidate.accountId}::uuid,
        'approved'::portal_profile_status,
        'draft'::portal_profile_status,
        ${"Profil nach Freigabe bearbeitet — erneute Prüfung erforderlich"}
      FROM updated
      RETURNING id
    `);
    const rows = Array.isArray(result)
      ? result
      : ((result as { rows?: unknown[] }).rows ?? []);
    if (rows.length === 0) {
      throw new ConflictError();
    }
  } else {
    // Conditional status guard: refuse silent edits if status raced to submitted/in_review.
    const [locked] = await db
      .update(candidatePortalProfiles)
      .set({
        status: portal.status,
        summary,
        yearsExperience,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(candidatePortalProfiles.candidateId, candidate.candidateId),
          eq(candidatePortalProfiles.status, portal.status)
        )
      )
      .returning({ candidateId: candidatePortalProfiles.candidateId });

    if (!locked) {
      throw new ConflictError();
    }
  }

  await db
    .update(candidates)
    .set({ firstName, lastName, location: input.city.trim() || null, updatedAt: new Date() })
    .where(eq(candidates.id, candidate.candidateId));

  await db
    .insert(candidateSearchProfiles)
    .values({
      candidateId: candidate.candidateId,
      desiredRole: input.desiredRole.trim() || null,
      city: input.city.trim() || null,
      postalCode: input.postalCode.trim() || null,
      country: input.country.trim() || "Deutschland",
      searchRadiusKm: input.searchRadiusKm,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: candidateSearchProfiles.candidateId,
      set: {
        desiredRole: input.desiredRole.trim() || null,
        city: input.city.trim() || null,
        postalCode: input.postalCode.trim() || null,
        country: input.country.trim() || "Deutschland",
        searchRadiusKm: input.searchRadiusKm,
        updatedAt: new Date(),
      },
    });

  await replaceTermsLive(candidate.candidateId, "skill", skills);
  await replaceTermsLive(candidate.candidateId, "keyword", keywords);
  await replaceTermsLive(candidate.candidateId, "qualification", qualifications);
}

function validateForSubmit(view: {
  firstName: string;
  lastName: string;
  desiredRole: string | null;
  city: string | null;
  searchRadiusKm: number | null;
  skills: string[];
}) {
  if (!view.firstName.trim() || !view.lastName.trim()) {
    throw new Error("Vor- und Nachname sind erforderlich.");
  }
  if (!view.desiredRole?.trim()) throw new Error("Gewünschte Tätigkeit ist erforderlich.");
  if (!view.city?.trim()) throw new Error("Standort ist erforderlich.");
  if (view.searchRadiusKm == null) throw new Error("Suchradius ist erforderlich.");
  assertSearchRadius(view.searchRadiusKm);
  if (view.skills.length < 1) throw new Error("Mindestens ein Skill ist erforderlich.");
}

export async function submitCandidateProfile(candidate: CandidateUser) {
  assertCandidateActor(candidate);
  if (isDemoMode()) {
    const current = getDemoPortalProfile(candidate.candidateId);
    if (!current) throw new Error("Profil nicht gefunden.");
    if (!["draft", "changes_requested"].includes(current.status)) {
      throw new Error("Profil kann in diesem Status nicht eingereicht werden.");
    }
    validateForSubmit({
      firstName: candidate.fullName,
      lastName: "-",
      desiredRole: current.desiredRole,
      city: current.city,
      searchRadiusKm: current.searchRadiusKm,
      skills: current.skills,
    });
    if (!current.desiredRole?.trim()) throw new Error("Gewünschte Tätigkeit ist erforderlich.");
    return upsertDemoPortalProfile(
      candidate.candidateId,
      { status: "submitted", submittedAt: new Date().toISOString(), reviewNote: null },
      { accountId: candidate.accountId },
      {
        from: current.status,
        to: "submitted",
        note: "Profil zur Prüfung eingereicht",
      }
    );
  }

  const view = await getCandidatePortalView(candidate);
  if (!view) throw new Error("Profil nicht gefunden.");
  if (!["draft", "changes_requested"].includes(view.status)) {
    throw new Error("Profil kann in diesem Status nicht eingereicht werden.");
  }
  validateForSubmit(view);

  const db = getDb();
  const result = await db.execute(sql`
    WITH updated AS (
      UPDATE candidate_portal_profiles
      SET
        status = 'submitted'::portal_profile_status,
        submitted_at = now(),
        review_note = null,
        updated_at = now()
      WHERE candidate_id = ${candidate.candidateId}::uuid
        AND status = ${view.status}::portal_profile_status
      RETURNING candidate_id
    )
    INSERT INTO candidate_profile_review_events (
      candidate_id,
      actor_candidate_account_id,
      from_status,
      to_status,
      note
    )
    SELECT
      updated.candidate_id,
      ${candidate.accountId}::uuid,
      ${view.status}::portal_profile_status,
      'submitted'::portal_profile_status,
      ${"Profil zur Prüfung eingereicht"}
    FROM updated
    RETURNING id
  `);

  const rows = Array.isArray(result)
    ? result
    : ((result as { rows?: unknown[] }).rows ?? []);
  if (rows.length === 0) {
    throw new ConflictError();
  }

  await safeNotifyStaffSubmission({
    candidateId: candidate.candidateId,
    firstName: view.firstName,
    lastName: view.lastName,
  });
}

export async function listPortalProfilesForStaff(staff: StaffUser) {
  assertStaffActor(staff);
  if (isDemoMode()) {
    const { getDemoCandidateAccounts } = await import("@/lib/demo/candidate-accounts");
    const accounts = getDemoCandidateAccounts();
    return listDemoPortalProfilesForReview().map((p) => {
      const account = accounts.find((a) => a.candidateId === p.candidateId);
      return {
        candidateId: p.candidateId,
        firstName: account?.firstName ?? "Kandidat",
        lastName: account?.lastName ?? "-",
        email: account?.email ?? null,
        status: p.status,
        desiredRole: p.desiredRole,
        city: p.city,
        submittedAt: p.submittedAt,
      };
    });
  }

  const db = getDb();
  const rows = await db
    .select({
      candidateId: candidates.id,
      firstName: candidates.firstName,
      lastName: candidates.lastName,
      email: candidates.email,
      status: candidatePortalProfiles.status,
      desiredRole: candidateSearchProfiles.desiredRole,
      city: candidateSearchProfiles.city,
      submittedAt: candidatePortalProfiles.submittedAt,
    })
    .from(candidatePortalProfiles)
    .innerJoin(candidates, eq(candidates.id, candidatePortalProfiles.candidateId))
    .leftJoin(
      candidateSearchProfiles,
      eq(candidateSearchProfiles.candidateId, candidates.id)
    )
    .where(
      inArray(candidatePortalProfiles.status, [
        "submitted",
        "in_review",
        "changes_requested",
        "approved",
        "rejected",
      ])
    )
    .orderBy(desc(candidatePortalProfiles.updatedAt));

  return rows.map((r) => ({
    ...r,
    submittedAt: r.submittedAt?.toISOString() ?? null,
  }));
}

export async function getPortalProfileForStaff(staff: StaffUser, candidateId: string) {
  assertStaffActor(staff);
  if (!candidateId.trim()) return null;
  if (isDemoMode()) {
    const { getDemoCandidateAccounts } = await import("@/lib/demo/candidate-accounts");
    const match = getDemoCandidateAccounts().find((a) => a.candidateId === candidateId);
    const profile = getDemoPortalProfile(candidateId);
    if (!profile) return null;
    return {
      ...(mapDemoProfile(
        candidateId,
        match?.firstName ?? "Kandidat",
        match?.lastName ?? "-",
        match?.email ?? null
      ) as CandidatePortalView),
      events: getDemoReviewEvents(candidateId),
    };
  }

  const db = getDb();
  const [row] = await db
    .select({
      candidateId: candidates.id,
      firstName: candidates.firstName,
      lastName: candidates.lastName,
      email: candidates.email,
      status: candidatePortalProfiles.status,
      summary: candidatePortalProfiles.summary,
      yearsExperience: candidatePortalProfiles.yearsExperience,
      reviewNote: candidatePortalProfiles.reviewNote,
      submittedAt: candidatePortalProfiles.submittedAt,
      desiredRole: candidateSearchProfiles.desiredRole,
      city: candidateSearchProfiles.city,
      postalCode: candidateSearchProfiles.postalCode,
      country: candidateSearchProfiles.country,
      searchRadiusKm: candidateSearchProfiles.searchRadiusKm,
    })
    .from(candidates)
    .innerJoin(
      candidatePortalProfiles,
      eq(candidatePortalProfiles.candidateId, candidates.id)
    )
    .leftJoin(
      candidateSearchProfiles,
      eq(candidateSearchProfiles.candidateId, candidates.id)
    )
    .where(eq(candidates.id, candidateId))
    .limit(1);

  if (!row) return null;

  const terms = await db
    .select({ kind: candidateTerms.kind, term: candidateTerms.term })
    .from(candidateTerms)
    .where(eq(candidateTerms.candidateId, candidateId));

  const events = await db
    .select()
    .from(candidateProfileReviewEvents)
    .where(eq(candidateProfileReviewEvents.candidateId, candidateId))
    .orderBy(desc(candidateProfileReviewEvents.createdAt));

  return {
    candidateId: row.candidateId,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    status: row.status,
    summary: row.summary,
    yearsExperience: row.yearsExperience,
    reviewNote: row.reviewNote,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    desiredRole: row.desiredRole,
    city: row.city,
    postalCode: row.postalCode,
    country: row.country,
    searchRadiusKm: row.searchRadiusKm,
    skills: terms.filter((t) => t.kind === "skill").map((t) => t.term),
    keywords: terms.filter((t) => t.kind === "keyword").map((t) => t.term),
    qualifications: terms.filter((t) => t.kind === "qualification").map((t) => t.term),
    events: events.map((e) => ({
      id: e.id,
      candidateId: e.candidateId,
      actorProfileId: e.actorProfileId,
      actorCandidateAccountId: e.actorCandidateAccountId,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      note: e.note,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

export async function transitionPortalReview(
  staff: StaffUser,
  candidateId: string,
  toStatus: PortalProfileStatus,
  note?: string
) {
  assertStaffActor(staff);
  if (!candidateId.trim()) throw new Error("Ungültige Kandidaten-ID.");
  if (isDemoMode()) {
    const current = getDemoPortalProfile(candidateId);
    if (!current) throw new Error("Profil nicht gefunden.");
    if (!isStaffTransitionAllowed(current.status, toStatus)) {
      throw new Error("Ungültiger Statusübergang.");
    }
    if ((toStatus === "changes_requested" || toStatus === "rejected") && !note?.trim()) {
      throw new Error("Begründung ist erforderlich.");
    }
    return upsertDemoPortalProfile(
      candidateId,
      {
        status: toStatus,
        reviewNote: note?.trim() || current.reviewNote,
      },
      { profileId: staff.id },
      { from: current.status, to: toStatus, note: note?.trim() }
    );
  }

  const db = getDb();
  const [current] = await db
    .select({ status: candidatePortalProfiles.status, reviewNote: candidatePortalProfiles.reviewNote })
    .from(candidatePortalProfiles)
    .where(eq(candidatePortalProfiles.candidateId, candidateId))
    .limit(1);
  if (!current) throw new Error("Profil nicht gefunden.");
  if (!isStaffTransitionAllowed(current.status, toStatus)) {
    throw new Error("Ungültiger Statusübergang.");
  }
  if ((toStatus === "changes_requested" || toStatus === "rejected") && !note?.trim()) {
    throw new Error("Begründung ist erforderlich.");
  }

  const reviewNote = note?.trim() || current.reviewNote;
  const eventNote = note?.trim() || null;

  /**
   * Single SQL statement: conditional status update + event insert only if the row matched.
   * Atomic on Postgres; concurrent reviews: at most one succeeds (ConflictError otherwise).
   */
  const result = await db.execute(sql`
    WITH updated AS (
      UPDATE candidate_portal_profiles
      SET
        status = ${toStatus}::portal_profile_status,
        review_note = ${reviewNote},
        updated_at = now()
      WHERE candidate_id = ${candidateId}::uuid
        AND status = ${current.status}::portal_profile_status
      RETURNING candidate_id
    )
    INSERT INTO candidate_profile_review_events (
      candidate_id,
      actor_profile_id,
      from_status,
      to_status,
      note
    )
    SELECT
      updated.candidate_id,
      ${staff.id}::uuid,
      ${current.status}::portal_profile_status,
      ${toStatus}::portal_profile_status,
      ${eventNote}
    FROM updated
    RETURNING id
  `);

  const rows = Array.isArray(result)
    ? result
    : ((result as { rows?: unknown[] }).rows ?? []);
  if (rows.length === 0) {
    throw new ConflictError();
  }

  if (toStatus === "changes_requested" || toStatus === "approved" || toStatus === "rejected") {
    await safeNotifyCandidateStatus(candidateId, toStatus, eventNote);
  }
}

export async function getCandidateReviewEvents(
  actor:
    | { type: "candidate"; user: CandidateUser }
    | { type: "staff"; user: StaffUser },
  requestedCandidateId: string
) {
  let candidateId: string;
  if (actor.type === "candidate") {
    assertCandidateOwnsResource(actor.user, requestedCandidateId);
    candidateId = actor.user.candidateId;
  } else {
    assertStaffActor(actor.user);
    candidateId = requestedCandidateId.trim();
  }
  if (!candidateId) throw new Error("Ungültige Kandidaten-ID.");

  if (isDemoMode()) return getDemoReviewEvents(candidateId);
  const db = getDb();
  const events = await db
    .select()
    .from(candidateProfileReviewEvents)
    .where(eq(candidateProfileReviewEvents.candidateId, candidateId))
    .orderBy(desc(candidateProfileReviewEvents.createdAt));
  return events.map((e) => ({
    id: e.id,
    candidateId: e.candidateId,
    actorProfileId: e.actorProfileId,
    actorCandidateAccountId: e.actorCandidateAccountId,
    fromStatus: e.fromStatus,
    toStatus: e.toStatus,
    note: e.note,
    createdAt: e.createdAt.toISOString(),
  }));
}
