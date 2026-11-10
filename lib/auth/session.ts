import "server-only";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { candidateAccounts, candidates, profiles } from "@/lib/db/schema";
import {
  DEMO_CANDIDATE_COOKIE,
  DEMO_COOKIE,
  isDemoMode,
} from "@/lib/demo/mode";
import { verifyDemoCandidateSessionToken } from "@/lib/demo/candidate-session";
import { verifyDemoStaffSessionToken } from "@/lib/demo/staff-session";
import { findDemoCandidateByAccountId } from "@/lib/demo/candidate-accounts";
import { findDemoUserById } from "@/lib/demo/store";
import { getAuth } from "./auth";
import {
  CANDIDATE_ROLE,
  isCandidateRole,
  isInternalRole,
  type CandidateUser,
  type StaffUser,
} from "./roles";

export async function getSessionStaff(): Promise<StaffUser | null> {
  if (isDemoMode()) {
    const token = cookies().get(DEMO_COOKIE)?.value;
    const payload = await verifyDemoStaffSessionToken(token);
    if (!payload) return null;
    const demo = findDemoUserById(payload.userId);
    if (!demo || !isInternalRole(demo.role)) return null;
    return {
      id: demo.id,
      email: demo.email,
      fullName: demo.full_name,
      role: demo.role,
    };
  }

  const session = await getAuth().api.getSession({
    headers: headers(),
  });
  if (!session?.user) return null;
  if (isCandidateRole(session.user.role)) return null;

  const [profile] = await getDb()
    .select({
      id: profiles.id,
      email: profiles.email,
      fullName: profiles.fullName,
      role: profiles.role,
    })
    .from(profiles)
    .where(eq(profiles.id, session.user.id))
    .limit(1);

  if (!profile || !isInternalRole(profile.role)) return null;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
  };
}

export async function getSessionCandidate(): Promise<CandidateUser | null> {
  if (isDemoMode()) {
    const token = cookies().get(DEMO_CANDIDATE_COOKIE)?.value;
    const payload = await verifyDemoCandidateSessionToken(token);
    if (!payload) return null;
    const demo = findDemoCandidateByAccountId(payload.accountId);
    if (!demo) return null;
    return {
      accountId: demo.accountId,
      candidateId: demo.candidateId,
      email: demo.email,
      fullName: demo.fullName,
      role: CANDIDATE_ROLE,
    };
  }

  const session = await getAuth().api.getSession({
    headers: headers(),
  });
  if (!session?.user) return null;
  if (!isCandidateRole(session.user.role)) return null;

  const [row] = await getDb()
    .select({
      accountId: candidateAccounts.id,
      candidateId: candidateAccounts.candidateId,
      email: candidates.email,
      firstName: candidates.firstName,
      lastName: candidates.lastName,
    })
    .from(candidateAccounts)
    .innerJoin(candidates, eq(candidates.id, candidateAccounts.candidateId))
    .where(eq(candidateAccounts.id, session.user.id))
    .limit(1);

  if (!row) return null;

  return {
    accountId: row.accountId,
    candidateId: row.candidateId,
    email: row.email ?? session.user.email,
    fullName: `${row.firstName} ${row.lastName}`.trim(),
    role: CANDIDATE_ROLE,
  };
}
