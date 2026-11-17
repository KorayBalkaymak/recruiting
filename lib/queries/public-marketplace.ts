import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  candidatePortalProfiles,
  candidateSearchProfiles,
  candidateTerms,
  candidates,
} from "@/lib/db/schema";
import { isDemoMode } from "@/lib/demo/mode";
import {
  matchesPublicMarketplaceFilter,
  publicDisplayName,
  uniqueDesiredRoles,
  type PublicMarketplaceFilter,
  type PublicMarketplaceProfile,
} from "@/lib/marketplace/public-profiles";

const DEMO_APPROVED: PublicMarketplaceProfile[] = [
  {
    displayName: "Clara K.",
    desiredRole: "Senior Backend Developer",
    summary: "Backend-Entwicklung mit Fokus auf Node.js, TypeScript und belastbare Schnittstellen.",
    yearsExperience: 5,
    city: "Köln",
    country: "Deutschland",
    skills: ["TypeScript", "Node.js", "PostgreSQL"],
  },
  {
    displayName: "Jonas M.",
    desiredRole: "Controller",
    summary: "Operatives Controlling und Reporting in mittelständischen Strukturen.",
    yearsExperience: 8,
    city: "Düsseldorf",
    country: "Deutschland",
    skills: ["DATEV", "Excel", "Reporting"],
  },
  {
    displayName: "Lea S.",
    desiredRole: "Projektleiterin",
    summary: "Steuerung von Umsetzungsprojekten zwischen Fachbereich und Technik.",
    yearsExperience: 6,
    city: "Frankfurt",
    country: "Deutschland",
    skills: ["Projektleitung", "Stakeholder", "Scrum"],
  },
];

function applyFilter(profiles: PublicMarketplaceProfile[], filter: PublicMarketplaceFilter) {
  return profiles.filter((profile) => matchesPublicMarketplaceFilter(profile, filter));
}

export async function listPublicMarketplace(filter: PublicMarketplaceFilter = {}): Promise<{
  profiles: PublicMarketplaceProfile[];
  roles: string[];
}> {
  if (isDemoMode()) {
    return {
      profiles: applyFilter(DEMO_APPROVED, filter),
      roles: uniqueDesiredRoles(DEMO_APPROVED),
    };
  }

  try {
    const db = getDb();
    const rows = await db
      .select({
        candidateId: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        summary: candidatePortalProfiles.summary,
        yearsExperience: candidatePortalProfiles.yearsExperience,
        desiredRole: candidateSearchProfiles.desiredRole,
        city: candidateSearchProfiles.city,
        country: candidateSearchProfiles.country,
      })
      .from(candidatePortalProfiles)
      .innerJoin(candidates, eq(candidates.id, candidatePortalProfiles.candidateId))
      .leftJoin(
        candidateSearchProfiles,
        eq(candidateSearchProfiles.candidateId, candidates.id)
      )
      .where(eq(candidatePortalProfiles.status, "approved"))
      .orderBy(desc(candidatePortalProfiles.updatedAt))
      .limit(100);

    const ids = rows.map((row) => row.candidateId);
    const skillRows =
      ids.length === 0
        ? []
        : await db
            .select({
              candidateId: candidateTerms.candidateId,
              term: candidateTerms.term,
            })
            .from(candidateTerms)
            .where(
              and(inArray(candidateTerms.candidateId, ids), eq(candidateTerms.kind, "skill"))
            );

    const skillsByCandidate = new Map<string, string[]>();
    for (const row of skillRows) {
      const list = skillsByCandidate.get(row.candidateId) ?? [];
      if (list.length < 8) list.push(row.term);
      skillsByCandidate.set(row.candidateId, list);
    }

    const all: PublicMarketplaceProfile[] = rows.map((row) => ({
      displayName: publicDisplayName(row.firstName, row.lastName),
      desiredRole: row.desiredRole,
      summary: row.summary,
      yearsExperience: row.yearsExperience,
      city: row.city,
      country: row.country,
      skills: skillsByCandidate.get(row.candidateId) ?? [],
    }));

    return {
      profiles: applyFilter(all, filter),
      roles: uniqueDesiredRoles(all),
    };
  } catch {
    return { profiles: [], roles: [] };
  }
}
