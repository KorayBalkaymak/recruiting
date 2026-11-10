import "server-only";

import type { CandidateTermKind } from "@/lib/candidate/terms";
import { normalizeTerm } from "@/lib/candidate/terms";
import {
  DEMO_CANDIDATE_ACCOUNT_ID,
  DEMO_PORTAL_CANDIDATE_ID,
  addDemoCandidateAccount,
  getDemoCandidateAccounts,
  type DemoCandidateAccount,
} from "./candidate-accounts";

import type { PortalProfileStatus } from "@/lib/candidate/portal-types";

export type { PortalProfileStatus };

export type DemoPortalProfile = {
  candidateId: string;
  status: PortalProfileStatus;
  summary: string | null;
  yearsExperience: number | null;
  reviewNote: string | null;
  submittedAt: string | null;
  desiredRole: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  searchRadiusKm: number | null;
  skills: string[];
  keywords: string[];
  qualifications: string[];
};

export type DemoReviewEvent = {
  id: string;
  candidateId: string;
  actorProfileId: string | null;
  actorCandidateAccountId: string | null;
  fromStatus: PortalProfileStatus | null;
  toStatus: PortalProfileStatus;
  note: string | null;
  createdAt: string;
};

export {
  findDemoCandidateByAccountId,
  findDemoCandidateByEmail,
  DEMO_CANDIDATE_LOGIN_HINT,
  type DemoCandidateAccount,
} from "./candidate-accounts";

// re-exports kept for portal actions / session helpers

function seedProfiles(): Record<string, DemoPortalProfile> {
  return {
    [DEMO_PORTAL_CANDIDATE_ID]: {
      candidateId: DEMO_PORTAL_CANDIDATE_ID,
      status: "submitted",
      summary: "Backend-Entwicklerin mit Fokus auf Node.js und TypeScript.",
      yearsExperience: 5,
      reviewNote: null,
      submittedAt: new Date().toISOString(),
      desiredRole: "Senior Backend Developer",
      city: "Köln",
      postalCode: "50667",
      country: "Deutschland",
      searchRadiusKm: 50,
      skills: ["TypeScript", "Node.js", "PostgreSQL"],
      keywords: ["fullstack", "remote-ready"],
      qualifications: ["B.Sc. Informatik"],
    },
  };
}

function seedEvents(): DemoReviewEvent[] {
  return [
    {
      id: "rev-demo-0001",
      candidateId: DEMO_PORTAL_CANDIDATE_ID,
      actorProfileId: null,
      actorCandidateAccountId: DEMO_CANDIDATE_ACCOUNT_ID,
      fromStatus: "draft",
      toStatus: "submitted",
      note: "Profil zur Prüfung eingereicht",
      createdAt: new Date().toISOString(),
    },
  ];
}

type PortalDemoStore = {
  profiles: Record<string, DemoPortalProfile>;
  events: DemoReviewEvent[];
};

const globalForPortal = globalThis as unknown as { __cmsDemoCandidatePortal?: PortalDemoStore };

function getStore(): PortalDemoStore {
  if (!globalForPortal.__cmsDemoCandidatePortal) {
    globalForPortal.__cmsDemoCandidatePortal = {
      profiles: seedProfiles(),
      events: seedEvents(),
    };
  }
  return globalForPortal.__cmsDemoCandidatePortal;
}

export function listDemoPortalProfilesForReview() {
  return Object.values(getStore().profiles).filter((p) =>
    ["submitted", "in_review", "changes_requested", "approved", "rejected"].includes(p.status)
  );
}

export function getDemoPortalProfile(candidateId: string) {
  return getStore().profiles[candidateId] ?? null;
}

export function getDemoReviewEvents(candidateId: string) {
  return getStore()
    .events.filter((e) => e.candidateId === candidateId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function upsertDemoPortalProfile(
  candidateId: string,
  patch: Partial<DemoPortalProfile>,
  actor: { accountId?: string; profileId?: string },
  statusEvent?: { from: PortalProfileStatus | null; to: PortalProfileStatus; note?: string }
) {
  const store = getStore();
  const current = store.profiles[candidateId];
  if (!current) throw new Error("Profil nicht gefunden.");
  store.profiles[candidateId] = { ...current, ...patch, candidateId };
  if (statusEvent) {
    store.events.push({
      id: crypto.randomUUID(),
      candidateId,
      actorProfileId: actor.profileId ?? null,
      actorCandidateAccountId: actor.accountId ?? null,
      fromStatus: statusEvent.from,
      toStatus: statusEvent.to,
      note: statusEvent.note ?? null,
      createdAt: new Date().toISOString(),
    });
  }
  return store.profiles[candidateId];
}

export function registerDemoCandidate(input: {
  email: string;
  password: string;
  fullName: string;
}) {
  const email = input.email.trim().toLowerCase();
  if (getDemoCandidateAccounts().some((a) => a.email.toLowerCase() === email)) {
    throw new Error("Für diese E-Mail existiert bereits ein Konto.");
  }
  const parts = input.fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "Kandidat";
  const lastName = parts.slice(1).join(" ") || "-";
  const accountId = crypto.randomUUID();
  const candidateId = crypto.randomUUID();
  const account: DemoCandidateAccount = {
    accountId,
    candidateId,
    email,
    password: input.password,
    fullName: `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
  };
  addDemoCandidateAccount(account);
  const store = getStore();
  store.profiles[candidateId] = {
    candidateId,
    status: "draft",
    summary: null,
    yearsExperience: null,
    reviewNote: null,
    submittedAt: null,
    desiredRole: null,
    city: null,
    postalCode: null,
    country: "Deutschland",
    searchRadiusKm: null,
    skills: [],
    keywords: [],
    qualifications: [],
  };
  store.events.push({
    id: crypto.randomUUID(),
    candidateId,
    actorProfileId: null,
    actorCandidateAccountId: accountId,
    fromStatus: null,
    toStatus: "draft",
    note: "Profil angelegt",
    createdAt: new Date().toISOString(),
  });
  return account;
}

export function replaceDemoTerms(candidateId: string, kind: CandidateTermKind, terms: string[]) {
  const profile = getStore().profiles[candidateId];
  if (!profile) throw new Error("Profil nicht gefunden.");
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const term of terms) {
    const n = normalizeTerm(term);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    unique.push(term.trim());
  }
  if (kind === "skill") profile.skills = unique;
  else if (kind === "keyword") profile.keywords = unique;
  else if (kind === "qualification") profile.qualifications = unique;
}
