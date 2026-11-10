import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertStaffProfileForRoleChange } from "./roles.ts";

describe("staff role update guard (F-08)", () => {
  it("allows admin and recruiter staff profiles", () => {
    assert.equal(assertStaffProfileForRoleChange({ id: "a", role: "admin" }).role, "admin");
    assert.equal(
      assertStaffProfileForRoleChange({ id: "r", role: "recruiter" }).role,
      "recruiter"
    );
  });

  it("rejects missing staff profile without implying a write", () => {
    assert.throws(() => assertStaffProfileForRoleChange(null), /Kein internes Nutzerprofil/);
  });

  it("rejects candidate role profiles", () => {
    assert.throws(
      () => assertStaffProfileForRoleChange({ id: "c", role: "candidate" }),
      /interne Nutzer/
    );
  });

  it("rejects unknown roles", () => {
    assert.throws(
      () => assertStaffProfileForRoleChange({ id: "x", role: "employer" }),
      /interne Nutzer/
    );
  });
});
