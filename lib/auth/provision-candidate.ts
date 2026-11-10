/**
 * Pure helpers for atomic candidate provisioning (testable without Neon).
 * Live path uses getDb().batch() which maps to Neon HTTP SQL transactions.
 */

export type ProvisionCandidateUser = {
  id: string;
  name: string;
  email: string;
};

export type ProvisionCandidatePlan = {
  candidateId: string;
  firstName: string;
  lastName: string;
  email: string;
  accountId: string;
  steps: readonly [
    "candidates",
    "candidate_accounts",
    "candidate_search_profiles",
    "candidate_portal_profiles",
    "candidate_profile_review_events",
  ];
};

export function splitProvisionName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Kandidat", lastName: "Unbekannt" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "-" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

export function buildCandidateProvisionPlan(
  user: ProvisionCandidateUser,
  candidateId = crypto.randomUUID()
): ProvisionCandidatePlan {
  const { firstName, lastName } = splitProvisionName(user.name);
  return {
    candidateId,
    firstName,
    lastName,
    email: user.email,
    accountId: user.id,
    steps: [
      "candidates",
      "candidate_accounts",
      "candidate_search_profiles",
      "candidate_portal_profiles",
      "candidate_profile_review_events",
    ],
  };
}

/**
 * Simulates all-or-nothing batch execution for unit tests.
 * If any step throws, nothing from the batch is committed.
 */
export async function runProvisionBatchSimulation(
  plan: ProvisionCandidatePlan,
  executor: (step: ProvisionCandidatePlan["steps"][number], plan: ProvisionCandidatePlan) => Promise<void>
): Promise<{ committed: string[] }> {
  const committed: string[] = [];
  const pending: string[] = [];
  try {
    for (const step of plan.steps) {
      await executor(step, plan);
      pending.push(step);
    }
    committed.push(...pending);
    return { committed };
  } catch (error) {
    // Neon HTTP batch rolls back the whole transaction — mirror that in the simulation.
    return Promise.reject(
      Object.assign(error instanceof Error ? error : new Error(String(error)), {
        rolledBack: true,
        attempted: pending,
        committed: [] as string[],
      })
    );
  }
}
