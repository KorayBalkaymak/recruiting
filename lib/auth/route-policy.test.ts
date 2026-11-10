import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyPath,
  decideRouteAccess,
  principalFromRole,
} from "./route-policy.ts";

describe("route classification (BA4.2)", () => {
  it("classifies auth, login, candidate, and defaults staff fail-closed", () => {
    assert.equal(classifyPath("/api/auth/sign-in"), "auth_api");
    assert.equal(classifyPath("/login"), "staff_login");
    assert.equal(classifyPath("/login/set-password"), "staff_login");
    assert.equal(classifyPath("/candidate/login"), "candidate_login");
    assert.equal(classifyPath("/candidate/register"), "candidate_login");
    assert.equal(classifyPath("/candidate/dashboard"), "candidate");
    assert.equal(classifyPath("/api/candidate/cv"), "candidate");
    assert.equal(classifyPath("/"), "staff");
    assert.equal(classifyPath("/kandidaten"), "staff");
    assert.equal(classifyPath("/kandidaten/abc/pdf"), "staff");
    assert.equal(classifyPath("/rechner/pdf/xyz"), "staff");
    assert.equal(classifyPath("/api/portal-pruefungen/1/cv"), "staff");
    assert.equal(classifyPath("/brand-new-module"), "staff");
  });

  it("maps roles to principals", () => {
    assert.equal(principalFromRole("candidate"), "candidate");
    assert.equal(principalFromRole("admin"), "staff");
    assert.equal(principalFromRole("recruiter"), "staff");
    assert.equal(principalFromRole("unknown"), null);
  });
});

describe("route access decisions (BA4.2)", () => {
  it("allows unauthenticated access only to login surfaces", () => {
    assert.equal(decideRouteAccess({ pathname: "/login", principal: "anonymous" }).action, "allow");
    assert.equal(
      decideRouteAccess({ pathname: "/candidate/login", principal: "anonymous" }).action,
      "allow"
    );
    const staffHome = decideRouteAccess({ pathname: "/", principal: "anonymous" });
    assert.deepEqual(staffHome, { action: "redirect", location: "/login" });
    const candDash = decideRouteAccess({
      pathname: "/candidate/dashboard",
      principal: "anonymous",
    });
    assert.deepEqual(candDash, { action: "redirect", location: "/candidate/login" });
  });

  it("allows staff on staff routes and blocks candidate area", () => {
    assert.equal(decideRouteAccess({ pathname: "/", principal: "staff" }).action, "allow");
    assert.equal(
      decideRouteAccess({ pathname: "/kandidaten/x/pdf", principal: "staff" }).action,
      "allow"
    );
    assert.equal(
      decideRouteAccess({ pathname: "/api/portal-pruefungen/1/cv", principal: "staff" }).action,
      "allow"
    );
    assert.deepEqual(decideRouteAccess({ pathname: "/candidate/dashboard", principal: "staff" }), {
      action: "redirect",
      location: "/",
    });
    assert.deepEqual(decideRouteAccess({ pathname: "/api/candidate/cv", principal: "staff" }), {
      action: "unauthorized",
      status: 403,
    });
  });

  it("allows candidate on candidate routes and blocks staff CRM", () => {
    assert.equal(
      decideRouteAccess({ pathname: "/candidate/dashboard", principal: "candidate" }).action,
      "allow"
    );
    assert.equal(
      decideRouteAccess({ pathname: "/api/candidate/cv", principal: "candidate" }).action,
      "allow"
    );
    assert.deepEqual(decideRouteAccess({ pathname: "/kandidaten", principal: "candidate" }), {
      action: "redirect",
      location: "/candidate/dashboard",
    });
    assert.deepEqual(decideRouteAccess({ pathname: "/rechner/pdf/abc", principal: "candidate" }), {
      action: "redirect",
      location: "/candidate/dashboard",
    });
    assert.deepEqual(
      decideRouteAccess({ pathname: "/api/portal-pruefungen/1/cv", principal: "candidate" }),
      { action: "unauthorized", status: 403 }
    );
  });

  it("returns 401 for unauthenticated API; redirects unauthenticated PDF pages", () => {
    assert.deepEqual(decideRouteAccess({ pathname: "/api/candidate/cv", principal: "anonymous" }), {
      action: "unauthorized",
      status: 401,
    });
    assert.deepEqual(
      decideRouteAccess({ pathname: "/api/portal-pruefungen/1/cv", principal: "anonymous" }),
      { action: "unauthorized", status: 401 }
    );
    assert.deepEqual(decideRouteAccess({ pathname: "/kandidaten/x/pdf", principal: "anonymous" }), {
      action: "redirect",
      location: "/login",
    });
  });

  it("redirects authenticated users away from the other area login pages", () => {
    assert.deepEqual(decideRouteAccess({ pathname: "/login", principal: "staff" }), {
      action: "redirect",
      location: "/",
    });
    assert.equal(
      decideRouteAccess({ pathname: "/login/set-password", principal: "staff" }).action,
      "allow"
    );
    assert.deepEqual(decideRouteAccess({ pathname: "/candidate/login", principal: "candidate" }), {
      action: "redirect",
      location: "/candidate/dashboard",
    });
    assert.deepEqual(decideRouteAccess({ pathname: "/login", principal: "candidate" }), {
      action: "redirect",
      location: "/candidate/dashboard",
    });
    assert.deepEqual(decideRouteAccess({ pathname: "/candidate/login", principal: "staff" }), {
      action: "redirect",
      location: "/",
    });
  });
});
