import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldAllowUnauthenticatedDbHealth } from "./db-health-bypass.ts";

describe("shouldAllowUnauthenticatedDbHealth", () => {
  it("allows only /api/health/db when ENABLE_DB_HEALTH=true", () => {
    assert.equal(shouldAllowUnauthenticatedDbHealth("/api/health/db", "true"), true);
  });

  it("denies when flag is missing, false, or mistyped", () => {
    assert.equal(shouldAllowUnauthenticatedDbHealth("/api/health/db", undefined), false);
    assert.equal(shouldAllowUnauthenticatedDbHealth("/api/health/db", null), false);
    assert.equal(shouldAllowUnauthenticatedDbHealth("/api/health/db", "false"), false);
    assert.equal(shouldAllowUnauthenticatedDbHealth("/api/health/db", "TRUE"), false);
    assert.equal(shouldAllowUnauthenticatedDbHealth("/api/health/db", "1"), false);
  });

  it("does not open other API or CRM routes", () => {
    assert.equal(shouldAllowUnauthenticatedDbHealth("/api/health", "true"), false);
    assert.equal(shouldAllowUnauthenticatedDbHealth("/api/health/db/extra", "true"), false);
    assert.equal(shouldAllowUnauthenticatedDbHealth("/api/auth/sign-in", "true"), false);
    assert.equal(shouldAllowUnauthenticatedDbHealth("/api/candidate/cv", "true"), false);
    assert.equal(shouldAllowUnauthenticatedDbHealth("/", "true"), false);
    assert.equal(shouldAllowUnauthenticatedDbHealth("/kandidaten", "true"), false);
  });
});
