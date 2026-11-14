import { getSessionCandidate, getSessionStaff } from "./session";
import type { CandidateUser, StaffUser } from "./roles";

/** Login/register pages must still render if live auth env is incomplete. */
export async function peekStaffSession(): Promise<StaffUser | null> {
  try {
    return await getSessionStaff();
  } catch {
    return null;
  }
}

export async function peekCandidateSession(): Promise<CandidateUser | null> {
  try {
    return await getSessionCandidate();
  } catch {
    return null;
  }
}
