/**
 * BA3.4 isolated Neon smoke tests (ba3-test only).
 * Loads .env.local, refuses non-ba3-test hosts, never prints secrets.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "node:http";

const require = createRequire(import.meta.url);
const Module = require("module");
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad.apply(this, arguments);
};

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  const env = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    env[t.slice(0, i)] = t.slice(i + 1);
  }
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] == null) process.env[k] = v;
  }
  return env;
}

function assertBa3TestUrl(url) {
  const u = new URL(url.replace(/^postgresql:/, "http:").replace(/^postgres:/, "http:"));
  if (!u.hostname.startsWith("ep-calm-art-")) {
    throw new Error("Abort: DATABASE_URL host is not ba3-test compute.");
  }
  if (u.pathname.replace(/^\//, "") !== "neondb") {
    throw new Error("Abort: database name is not neondb.");
  }
  return u.hostname.split(".")[0];
}

function result(id, name, status, detail = "") {
  return { id, name, status, detail: String(detail).slice(0, 240) };
}

async function main() {
  loadEnvLocal();
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    throw new Error("Abort: NEXT_PUBLIC_DEMO_MODE must be false for Neon smoke.");
  }
  const hostPrefix = assertBa3TestUrl(process.env.DATABASE_URL);

  // Clear cached modules that might have been created under demo mode.
  for (const key of Object.keys(require.cache)) {
    if (key.includes("/lib/")) delete require.cache[key];
  }

  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);

  const stamp = Date.now();
  const candidateEmail = `cand.ba34.${stamp}@example.test`;
  const staffEmail = `staff.ba34.${stamp}@example.test`;
  const adminEmail = `admin.ba34.${stamp}@example.test`;
  const password = `Test-${stamp}-Aa1!`;

  const results = [];
  let candidateUserId = null;
  let candidateId = null;
  let staffUserId = null;
  let adminUserId = null;

  // Dynamic import app modules after env + server-only mock
  const { getAuth, runAsCandidateSignup, runAsInternalInvite } = await import(
    pathToFileURL(path.join(process.cwd(), "lib/auth/index.ts")).href
  );
  const { provisionCandidateAccount } = await import(
    pathToFileURL(path.join(process.cwd(), "lib/auth/auth.ts")).href
  );
  const {
    saveCandidateDraft,
    submitCandidateProfile,
    transitionPortalReview,
  } = await import(pathToFileURL(path.join(process.cwd(), "lib/candidate/portal-service.ts")).href);
  const { ConflictError } = await import(
    pathToFileURL(path.join(process.cwd(), "lib/auth/conflicts.ts")).href
  );
  const { assertStaffProfileForRoleChange, syncAuthUserRole } = await import(
    pathToFileURL(path.join(process.cwd(), "lib/auth/index.ts")).href
  );
  // syncAuthUserRole from auth.ts
  const authMod = await import(pathToFileURL(path.join(process.cwd(), "lib/auth/auth.ts")).href);
  const { getDb } = await import(pathToFileURL(path.join(process.cwd(), "lib/db/index.ts")).href);
  const schema = await import(pathToFileURL(path.join(process.cwd(), "lib/db/schema/index.ts")).href);
  const { eq } = await import("drizzle-orm");

  const auth = getAuth();

  // --- 1 Candidate signup ---
  try {
    await runAsCandidateSignup(async () => {
      await auth.api.signUpEmail({
        body: { email: candidateEmail, password, name: "BA34 Candidate" },
      });
    });
    const users = await sql`select id, role from "user" where email = ${candidateEmail}`;
    candidateUserId = users[0]?.id ?? null;
    const accounts =
      await sql`select id, candidate_id from candidate_accounts where id = ${candidateUserId}`;
    candidateId = accounts[0]?.candidate_id ?? null;
    const portal =
      await sql`select status from candidate_portal_profiles where candidate_id = ${candidateId}`;
    if (
      users[0]?.role === "candidate" &&
      accounts.length === 1 &&
      portal[0]?.status === "draft" &&
      candidateUserId === accounts[0].id
    ) {
      results.push(result(1, "Candidate-Signup", "pass", "user+account+portal draft"));
    } else {
      results.push(result(1, "Candidate-Signup", "fail", JSON.stringify({ users, accounts, portal })));
    }
  } catch (e) {
    results.push(result(1, "Candidate-Signup", "fail", e.message));
  }

  // --- 2 Provision multi-insert presence ---
  try {
    const c = await sql`select count(*)::int as n from candidates where id = ${candidateId}`;
    const a = await sql`select count(*)::int as n from candidate_accounts where candidate_id = ${candidateId}`;
    const s =
      await sql`select count(*)::int as n from candidate_search_profiles where candidate_id = ${candidateId}`;
    const p =
      await sql`select count(*)::int as n from candidate_portal_profiles where candidate_id = ${candidateId}`;
    const e =
      await sql`select count(*)::int as n from candidate_profile_review_events where candidate_id = ${candidateId}`;
    const ok = c[0].n === 1 && a[0].n === 1 && s[0].n === 1 && p[0].n === 1 && e[0].n >= 1;
    results.push(
      result(2, "Candidate-Provisionierung", ok ? "pass" : "fail", `c=${c[0].n} a=${a[0].n} s=${s[0].n} p=${p[0].n} e=${e[0].n}`)
    );
  } catch (e) {
    results.push(result(2, "Candidate-Provisionierung", "fail", e.message));
  }

  // --- 3 Provision rollback via forced second provision with duplicate account id ---
  try {
    const beforeCand = await sql`select count(*)::int as n from candidates`;
    const beforeAcc = await sql`select count(*)::int as n from candidate_accounts`;
    let failed = false;
    try {
      // Re-using existing auth user id must fail on candidate_accounts PK / exclusive trigger
      await provisionCandidateAccount({
        id: candidateUserId,
        name: "Dup Fail",
        email: `dup.${stamp}@example.test`,
      });
    } catch {
      failed = true;
    }
    const afterCand = await sql`select count(*)::int as n from candidates`;
    const afterAcc = await sql`select count(*)::int as n from candidate_accounts`;
    // Batch should roll back: no net new candidates/accounts
    const rolledBack =
      failed && afterCand[0].n === beforeCand[0].n && afterAcc[0].n === beforeAcc[0].n;
    results.push(
      result(
        3,
        "Provision-Rollback",
        rolledBack ? "pass" : "fail",
        `failed=${failed} candDelta=${afterCand[0].n - beforeCand[0].n} accDelta=${afterAcc[0].n - beforeAcc[0].n}`
      )
    );
  } catch (e) {
    results.push(result(3, "Provision-Rollback", "fail", e.message));
  }

  // --- 4 Candidate login ---
  try {
    await auth.api.signInEmail({ body: { email: candidateEmail, password } });
    const sessions =
      await sql`select count(*)::int as n from session where user_id = ${candidateUserId}`;
    results.push(
      result(4, "Candidate-Login", sessions[0].n >= 1 ? "pass" : "fail", `sessions=${sessions[0].n}`)
    );
  } catch (e) {
    results.push(result(4, "Candidate-Login", "fail", e.message));
  }

  const candidateActor = {
    accountId: candidateUserId,
    candidateId,
    email: candidateEmail,
    fullName: "BA34 Candidate",
    role: "candidate",
  };

  // --- 5 Save profile draft ---
  try {
    await saveCandidateDraft(candidateActor, {
      firstName: "BA34",
      lastName: "Candidate",
      desiredRole: "Fullstack Engineer",
      summary: "Smoke test profile",
      yearsExperience: 3,
      city: "Berlin",
      postalCode: "10115",
      country: "Deutschland",
      searchRadiusKm: 50,
      skills: ["TypeScript", "React"],
      keywords: ["remote"],
      qualifications: ["B.Sc."],
    });
    const row =
      await sql`select status, summary from candidate_portal_profiles where candidate_id = ${candidateId}`;
    const terms =
      await sql`select count(*)::int as n from candidate_terms where candidate_id = ${candidateId}`;
    const ok = row[0]?.status === "draft" && terms[0].n >= 2;
    results.push(result(5, "Profil speichern", ok ? "pass" : "fail", `status=${row[0]?.status} terms=${terms[0].n}`));
  } catch (e) {
    results.push(result(5, "Profil speichern", "fail", e.message));
  }

  // --- 6 Submit ---
  try {
    await submitCandidateProfile(candidateActor);
    const row =
      await sql`select status from candidate_portal_profiles where candidate_id = ${candidateId}`;
    const ev =
      await sql`select count(*)::int as n from candidate_profile_review_events where candidate_id = ${candidateId} and to_status = 'submitted'`;
    const ok = row[0]?.status === "submitted" && ev[0].n >= 1;
    results.push(result(6, "Einreichen", ok ? "pass" : "fail", `status=${row[0]?.status} events=${ev[0].n}`));
  } catch (e) {
    results.push(result(6, "Einreichen", "fail", e.message));
  }

  // --- 7 Staff invite + login ---
  try {
    await runAsInternalInvite(async () => {
      await auth.api.signUpEmail({
        body: {
          email: staffEmail,
          password: `Inv-${stamp}-Aa1!`,
          name: "BA34 Staff",
        },
      });
    });
    const users = await sql`select id, role from "user" where email = ${staffEmail}`;
    staffUserId = users[0]?.id;
    // Ensure recruiter profile/role
    if (staffUserId) {
      await getDb()
        .update(schema.profiles)
        .set({ role: "recruiter", updatedAt: new Date() })
        .where(eq(schema.profiles.id, staffUserId));
      await authMod.syncAuthUserRole(staffUserId, "recruiter");
    }
    await auth.api.signInEmail({
      body: { email: staffEmail, password: `Inv-${stamp}-Aa1!` },
    });
    const profile = await sql`select id, role from profiles where id = ${staffUserId}`;
    const ok = profile[0]?.role === "recruiter" && users[0]?.id === profile[0]?.id;
    results.push(result(7, "Staff-Invite+Login", ok ? "pass" : "fail", `role=${profile[0]?.role}`));
  } catch (e) {
    results.push(result(7, "Staff-Invite+Login", "fail", e.message));
  }

  const staffActor = {
    id: staffUserId,
    email: staffEmail,
    fullName: "BA34 Staff",
    role: "recruiter",
  };

  // --- 8 Review status change ---
  try {
    await transitionPortalReview(staffActor, candidateId, "in_review");
    const row =
      await sql`select status from candidate_portal_profiles where candidate_id = ${candidateId}`;
    results.push(
      result(8, "Review-Status ändern", row[0]?.status === "in_review" ? "pass" : "fail", `status=${row[0]?.status}`)
    );
  } catch (e) {
    results.push(result(8, "Review-Status ändern", "fail", e.message));
  }

  // --- 9 Review event atomic ---
  try {
    const status =
      await sql`select status from candidate_portal_profiles where candidate_id = ${candidateId}`;
    const events =
      await sql`select from_status, to_status from candidate_profile_review_events where candidate_id = ${candidateId} and to_status = 'in_review' order by created_at desc limit 1`;
    const ok =
      status[0]?.status === "in_review" &&
      events[0]?.from_status === "submitted" &&
      events[0]?.to_status === "in_review";
    results.push(result(9, "Review-Event atomar", ok ? "pass" : "fail", JSON.stringify(events[0] ?? {})));
  } catch (e) {
    results.push(result(9, "Review-Event atomar", "fail", e.message));
  }

  // --- 10 Concurrent reviews ---
  try {
    const [r1, r2] = await Promise.allSettled([
      transitionPortalReview(staffActor, candidateId, "approved", undefined),
      transitionPortalReview(staffActor, candidateId, "rejected", "parallel reject"),
    ]);
    const fulfilled = [r1, r2].filter((r) => r.status === "fulfilled").length;
    const rejected = [r1, r2].filter((r) => r.status === "rejected");
    const conflictish = rejected.some(
      (r) =>
        r.reason instanceof ConflictError ||
        /Conflict|Status|Übergang|geändert/i.test(String(r.reason?.message ?? r.reason))
    );
    const status =
      await sql`select status from candidate_portal_profiles where candidate_id = ${candidateId}`;
    const ok = fulfilled === 1 && conflictish && ["approved", "rejected"].includes(status[0]?.status);
    results.push(
      result(
        10,
        "Konkurrierende Reviews",
        ok ? "pass" : "fail",
        `fulfilled=${fulfilled} conflict=${conflictish} status=${status[0]?.status}`
      )
    );
  } catch (e) {
    results.push(result(10, "Konkurrierende Reviews", "fail", e.message));
  }

  // --- 11 ID convention ---
  try {
    const u = await sql`select id, pg_typeof(id)::text as t from "user" where id = ${candidateUserId}`;
    const a =
      await sql`select id, pg_typeof(id)::text as t, candidate_id, pg_typeof(candidate_id)::text as ct from candidate_accounts where id = ${candidateUserId}`;
    const p = staffUserId
      ? await sql`select id, pg_typeof(id)::text as t from profiles where id = ${staffUserId}`
      : [];
    const ok =
      u[0]?.t === "text" &&
      a[0]?.t === "uuid" &&
      a[0]?.ct === "uuid" &&
      String(u[0].id) === String(a[0].id) &&
      (p.length === 0 || p[0].t === "uuid");
    results.push(
      result(
        11,
        "Text/UUID-Konvention",
        ok ? "pass" : "fail",
        `user=${u[0]?.t} account=${a[0]?.t} linked=${String(u[0]?.id) === String(a[0]?.id)}`
      )
    );
  } catch (e) {
    results.push(result(11, "Text/UUID-Konvention", "fail", e.message));
  }

  // --- 12 Admin role update ---
  try {
    await runAsInternalInvite(async () => {
      await auth.api.signUpEmail({
        body: { email: adminEmail, password: `Adm-${stamp}-Aa1!`, name: "BA34 Admin" },
      });
    });
    const adm = await sql`select id from "user" where email = ${adminEmail}`;
    adminUserId = adm[0]?.id;
    await getDb()
      .update(schema.profiles)
      .set({ role: "admin", updatedAt: new Date() })
      .where(eq(schema.profiles.id, adminUserId));
    await authMod.syncAuthUserRole(adminUserId, "admin");

    // Valid staff target: change recruiter -> kam
    const before = await sql`select role from profiles where id = ${staffUserId}`;
    assertStaffProfileForRoleChange({ id: staffUserId, role: before[0].role });
    await getDb()
      .update(schema.profiles)
      .set({ role: "kam", updatedAt: new Date() })
      .where(eq(schema.profiles.id, staffUserId));
    await authMod.syncAuthUserRole(staffUserId, "kam");
    const after = await sql`select role from profiles where id = ${staffUserId}`;
    const authAfter = await sql`select role from "user" where id = ${staffUserId}`;

    let rejectedCandidate = false;
    try {
      assertStaffProfileForRoleChange({ id: candidateUserId, role: "candidate" });
    } catch {
      rejectedCandidate = true;
    }
    // Ensure candidate auth role unchanged by aborted path
    const candRole = await sql`select role from "user" where id = ${candidateUserId}`;

    const ok =
      after[0]?.role === "kam" &&
      authAfter[0]?.role === "kam" &&
      rejectedCandidate &&
      candRole[0]?.role === "candidate";
    results.push(
      result(
        12,
        "Admin-Rollenänderung",
        ok ? "pass" : "fail",
        `staff=${after[0]?.role} candRejected=${rejectedCandidate} candRole=${candRole[0]?.role}`
      )
    );
  } catch (e) {
    results.push(result(12, "Admin-Rollenänderung", "fail", e.message));
  }

  // Extra: approved -> draft atomicity if we landed on approved
  try {
    const st =
      await sql`select status from candidate_portal_profiles where candidate_id = ${candidateId}`;
    if (st[0]?.status === "approved") {
      await saveCandidateDraft(candidateActor, {
        firstName: "BA34",
        lastName: "Candidate",
        desiredRole: "Fullstack Engineer",
        summary: "After approval edit",
        yearsExperience: 4,
        city: "Berlin",
        postalCode: "10115",
        country: "Deutschland",
        searchRadiusKm: 40,
        skills: ["TypeScript"],
        keywords: ["berlin"],
        qualifications: ["B.Sc."],
      });
      const after =
        await sql`select status from candidate_portal_profiles where candidate_id = ${candidateId}`;
      const ev =
        await sql`select count(*)::int as n from candidate_profile_review_events where candidate_id = ${candidateId} and from_status='approved' and to_status='draft'`;
      results.push(
        result(
          "B",
          "approved→draft atomic",
          after[0]?.status === "draft" && ev[0].n >= 1 ? "pass" : "fail",
          `status=${after[0]?.status} events=${ev[0].n}`
        )
      );
    } else if (st[0]?.status === "rejected") {
      // reset to approved via SQL then test CTE path? Prefer not inventing rules.
      // Force in_review then approved sequentially for dedicated atomicity check
      await sql`update candidate_portal_profiles set status='in_review' where candidate_id = ${candidateId}`;
      await transitionPortalReview(staffActor, candidateId, "approved");
      await saveCandidateDraft(candidateActor, {
        firstName: "BA34",
        lastName: "Candidate",
        desiredRole: "Fullstack Engineer",
        summary: "After approval edit",
        yearsExperience: 4,
        city: "Berlin",
        postalCode: "10115",
        country: "Deutschland",
        searchRadiusKm: 40,
        skills: ["TypeScript"],
        keywords: ["berlin"],
        qualifications: ["B.Sc."],
      });
      const after =
        await sql`select status from candidate_portal_profiles where candidate_id = ${candidateId}`;
      const ev =
        await sql`select count(*)::int as n from candidate_profile_review_events where candidate_id = ${candidateId} and from_status='approved' and to_status='draft'`;
      results.push(
        result(
          "B",
          "approved→draft atomic",
          after[0]?.status === "draft" && ev[0].n >= 1 ? "pass" : "fail",
          `status=${after[0]?.status} events=${ev[0].n}`
        )
      );
    } else {
      results.push(result("B", "approved→draft atomic", "skip", `status=${st[0]?.status}`));
    }
  } catch (e) {
    results.push(result("B", "approved→draft atomic", "fail", e.message));
  }

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const skipped = results.filter((r) => r.status === "skip").length;

  console.log(
    JSON.stringify(
      {
        target: {
          projectId: "dark-shadow-93088747",
          branch: "ba3-test",
          branchId: "br-icy-dew-bebcii72",
          database: "neondb",
          hostPrefix,
        },
        summary: { passed, failed, skipped, total: results.length },
        results,
      },
      null,
      2
    )
  );

  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error("SMOKE_FATAL:", e?.message ?? String(e));
  process.exit(1);
});
