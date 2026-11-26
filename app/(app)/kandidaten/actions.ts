"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { insertActivityLog } from "@/lib/db/crm";
import { isDemoMode } from "@/lib/demo/mode";
import { getDemoStore } from "@/lib/demo/store";
import type { AnonymizedProfile } from "@/lib/candidate-profile";
import { markCandidateRecruiterAction } from "@/lib/candidate/recruiter-action";
import { evaluateClaimAttempt, evaluateReleaseAttempt } from "@/lib/candidate/recruiter-workflow";
import type { CandidateStatus } from "@/types/supabase";
import { AuthError } from "@/lib/auth";
import { requireCrmStaff } from "@/lib/auth/crm-access";
import { canManageUsers } from "@/lib/auth/roles";

function revalidateCandidate(candidateId: string) {
  revalidatePath("/kandidaten");
  revalidatePath(`/kandidaten/${candidateId}`);
}

function claimConflictMessage(reason: "already_yours" | "claimed_by_other") {
  if (reason === "already_yours") return "Sie bearbeiten diesen Kandidaten bereits.";
  return "Dieser Kandidat wird bereits von einem anderen Recruiter bearbeitet.";
}

export async function updateCandidateStatus(candidateId: string, status: CandidateStatus) {
  const staff = await requireCrmStaff();

  if (isDemoMode()) {
    const supabase = createClient();
    const { error } = await supabase.from("candidates").update({ status }).eq("id", candidateId);
    if (error) throw error;

    await supabase.from("activity_logs").insert({
      entity_type: "candidate",
      entity_id: candidateId,
      type: "statusaenderung",
      content: `Status geändert auf „${status}“.`,
      created_by: staff.id,
    });
    await markCandidateRecruiterAction(candidateId);
  } else {
    const db = getDb();
    await db
      .update(candidates)
      .set({ status, updatedAt: new Date() })
      .where(eq(candidates.id, candidateId));
    await insertActivityLog({
      entityType: "candidate",
      entityId: candidateId,
      type: "statusaenderung",
      content: `Status geändert auf „${status}“.`,
      createdBy: staff.id,
    });
  }

  revalidateCandidate(candidateId);
}

export async function saveAnonymizedProfile(
  candidateId: string,
  title: string,
  profile: AnonymizedProfile
) {
  await requireCrmStaff();

  if (isDemoMode()) {
    const supabase = createClient();
    const { error } = await supabase
      .from("candidates")
      .update({ anonymized_title: title, anonymized_profile: profile })
      .eq("id", candidateId);
    if (error) throw error;
  } else {
    await getDb()
      .update(candidates)
      .set({
        anonymizedTitle: title,
        anonymizedProfile: profile as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(candidates.id, candidateId));
  }

  await markCandidateRecruiterAction(candidateId);
  revalidateCandidate(candidateId);
}

export async function claimCandidate(candidateId: string) {
  const staff = await requireCrmStaff();
  const now = new Date();

  if (isDemoMode()) {
    const row = getDemoStore().candidates.find((candidate) => candidate.id === candidateId) as
      | Record<string, unknown>
      | undefined;
    if (!row) return { error: "Kandidat nicht gefunden." };
    const decision = evaluateClaimAttempt(
      { claimedById: (row.claimed_by_profile_id as string | null) ?? null },
      staff.id
    );
    if (!decision.ok) return { error: claimConflictMessage(decision.reason) };
    row.claimed_by_profile_id = staff.id;
    row.claimed_at = now.toISOString();
    row.last_recruiter_action_at = now.toISOString();
    revalidateCandidate(candidateId);
    return {};
  }

  const { candidatesHaveClaimColumns } = await import("@/lib/db/candidate-schema-compat");
  if (!(await candidatesHaveClaimColumns())) {
    return { error: "Übernahme ist in dieser Datenbank noch nicht verfügbar." };
  }

  const db = getDb();
  const taken = await db
    .update(candidates)
    .set({
      claimedByProfileId: staff.id,
      claimedAt: now,
      lastRecruiterActionAt: now,
    })
    .where(and(eq(candidates.id, candidateId), isNull(candidates.claimedByProfileId)))
    .returning({ id: candidates.id });

  if (taken.length === 1) {
    revalidateCandidate(candidateId);
    return {};
  }

  const [current] = await db
    .select({ id: candidates.id, claimedByProfileId: candidates.claimedByProfileId })
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);
  if (!current) return { error: "Kandidat nicht gefunden." };
  const decision = evaluateClaimAttempt({ claimedById: current.claimedByProfileId }, staff.id);
  if (!decision.ok) return { error: claimConflictMessage(decision.reason) };
  return { error: "Die Übernahme konnte nicht gespeichert werden." };
}

export async function releaseCandidateClaim(candidateId: string) {
  const staff = await requireCrmStaff();
  const canForce = canManageUsers(staff.role);
  const now = new Date();

  if (isDemoMode()) {
    const row = getDemoStore().candidates.find((candidate) => candidate.id === candidateId) as
      | Record<string, unknown>
      | undefined;
    if (!row) return { error: "Kandidat nicht gefunden." };
    const decision = evaluateReleaseAttempt(
      { claimedById: (row.claimed_by_profile_id as string | null) ?? null },
      { id: staff.id, canForce }
    );
    if (!decision.ok) {
      if (decision.reason === "forbidden") {
        throw new AuthError("FORBIDDEN", "Keine Berechtigung, diese Übernahme aufzuheben.");
      }
      return { error: "Dieser Kandidat ist derzeit nicht in Bearbeitung." };
    }
    row.claimed_by_profile_id = null;
    row.claimed_at = null;
    row.last_recruiter_action_at = now.toISOString();
    revalidateCandidate(candidateId);
    return {};
  }

  const { candidatesHaveClaimColumns } = await import("@/lib/db/candidate-schema-compat");
  if (!(await candidatesHaveClaimColumns())) {
    return { error: "Übernahme ist in dieser Datenbank noch nicht verfügbar." };
  }

  const db = getDb();
  const [current] = await db
    .select({ id: candidates.id, claimedByProfileId: candidates.claimedByProfileId })
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);
  if (!current) return { error: "Kandidat nicht gefunden." };

  const decision = evaluateReleaseAttempt(
    { claimedById: current.claimedByProfileId },
    { id: staff.id, canForce }
  );
  if (!decision.ok) {
    if (decision.reason === "forbidden") {
      throw new AuthError("FORBIDDEN", "Keine Berechtigung, diese Übernahme aufzuheben.");
    }
    return { error: "Dieser Kandidat ist derzeit nicht in Bearbeitung." };
  }

  const released = await db
    .update(candidates)
    .set({
      claimedByProfileId: null,
      claimedAt: null,
      lastRecruiterActionAt: now,
    })
    .where(
      and(
        eq(candidates.id, candidateId),
        eq(candidates.claimedByProfileId, current.claimedByProfileId!)
      )
    )
    .returning({ id: candidates.id });

  if (released.length !== 1) {
    return { error: "Die Übernahme hat sich geändert. Bitte die Akte neu laden." };
  }

  revalidateCandidate(candidateId);
  return {};
}
