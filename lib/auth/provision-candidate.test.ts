import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCandidateProvisionPlan,
  runProvisionBatchSimulation,
} from "./provision-candidate.ts";

describe("candidate provision plan (F-03)", () => {
  it("builds all five domain steps for one account", () => {
    const plan = buildCandidateProvisionPlan(
      { id: "user-1", name: "Clara Kandidat", email: "c@example.com" },
      "cand-1"
    );
    assert.equal(plan.candidateId, "cand-1");
    assert.equal(plan.firstName, "Clara");
    assert.equal(plan.lastName, "Kandidat");
    assert.equal(plan.steps.length, 5);
  });

  it("commits nothing when a later insert fails (batch rollback simulation)", async () => {
    const plan = buildCandidateProvisionPlan({
      id: "user-2",
      name: "Test User",
      email: "t@example.com",
    });
    const seen: string[] = [];

    await assert.rejects(
      () =>
        runProvisionBatchSimulation(plan, async (step) => {
          seen.push(step);
          if (step === "candidate_portal_profiles") {
            throw new Error("simulated insert failure");
          }
        }),
      (err: unknown) => {
        assert.ok(err && typeof err === "object");
        const e = err as { rolledBack?: boolean; committed?: string[] };
        assert.equal(e.rolledBack, true);
        assert.deepEqual(e.committed, []);
        return true;
      }
    );

    assert.ok(seen.includes("candidates"));
    assert.ok(seen.includes("candidate_accounts"));
    assert.ok(!seen.includes("candidate_profile_review_events"));
  });

  it("commits all steps when every insert succeeds", async () => {
    const plan = buildCandidateProvisionPlan({
      id: "user-3",
      name: "Ok User",
      email: "ok@example.com",
    });
    const { committed } = await runProvisionBatchSimulation(plan, async () => undefined);
    assert.deepEqual(committed, [...plan.steps]);
  });
});
