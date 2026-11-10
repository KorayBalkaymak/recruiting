import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  candidates,
  companies,
  createdAt,
  employmentType,
  profiles,
  updatedAt,
} from "./internal";

const tz = { withTimezone: true } as const;

export const workModel = pgEnum("work_model", ["remote", "hybrid", "onsite", "flexible"]);

export const candidateTermKind = pgEnum("candidate_term_kind", [
  "skill",
  "keyword",
  "qualification",
  "industry",
]);

export const candidateTermSource = pgEnum("candidate_term_source", ["candidate", "recruiter"]);

export const publicationStatus = pgEnum("publication_status", [
  "not_ready",
  "in_review",
  "approved",
  "revoked",
]);

/** Portal submission / internal review workflow (separate from employer publication_status). */
export const portalProfileStatus = pgEnum("portal_profile_status", [
  "draft",
  "submitted",
  "in_review",
  "changes_requested",
  "approved",
  "rejected",
]);

export const candidatePortalProfiles = pgTable(
  "candidate_portal_profiles",
  {
    candidateId: uuid("candidate_id")
      .primaryKey()
      .references(() => candidates.id, { onDelete: "cascade" }),
    status: portalProfileStatus("status").notNull().default("draft"),
    summary: text("summary"),
    yearsExperience: integer("years_experience"),
    reviewNote: text("review_note"),
    submittedAt: timestamp("submitted_at", tz),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("idx_candidate_portal_profiles_status").on(table.status)]
);

export const candidateProfileReviewEvents = pgTable(
  "candidate_profile_review_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    actorProfileId: uuid("actor_profile_id").references(() => profiles.id),
    actorCandidateAccountId: uuid("actor_candidate_account_id"),
    fromStatus: portalProfileStatus("from_status"),
    toStatus: portalProfileStatus("to_status").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (table) => [index("idx_candidate_profile_review_events_candidate").on(table.candidateId)]
);

export const candidateSearchProfiles = pgTable("candidate_search_profiles", {
  candidateId: uuid("candidate_id")
    .primaryKey()
    .references(() => candidates.id, { onDelete: "cascade" }),
  desiredRole: text("desired_role"),
  desiredEmploymentType: employmentType("desired_employment_type"),
  workModel: workModel("work_model"),
  weeklyHours: integer("weekly_hours"),
  preferenceNotes: text("preference_notes"),
  city: text("city"),
  postalCode: text("postal_code"),
  country: text("country").default("Deutschland"),
  latitude: numeric("latitude", { precision: 9, scale: 6 }),
  longitude: numeric("longitude", { precision: 9, scale: 6 }),
  searchRadiusKm: integer("search_radius_km"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const candidateTerms = pgTable(
  "candidate_terms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    kind: candidateTermKind("kind").notNull(),
    term: text("term").notNull(),
    normalized: text("normalized").notNull(),
    source: candidateTermSource("source").notNull().default("candidate"),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("candidate_terms_candidate_kind_normalized").on(
      table.candidateId,
      table.kind,
      table.normalized
    ),
    index("idx_candidate_terms_normalized").on(table.normalized),
  ]
);

export const candidateExperiences = pgTable(
  "candidate_experiences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    period: text("period"),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("idx_candidate_experiences_candidate").on(table.candidateId)]
);

export const candidatePublications = pgTable("candidate_publications", {
  candidateId: uuid("candidate_id")
    .primaryKey()
    .references(() => candidates.id, { onDelete: "cascade" }),
  anonymizedTitle: text("anonymized_title"),
  anonymizedProfile: jsonb("anonymized_profile")
    .$type<Record<string, unknown>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  publicationStatus: publicationStatus("publication_status").notNull().default("not_ready"),
  approvedBy: uuid("approved_by").references(() => profiles.id),
  approvedAt: timestamp("approved_at", tz),
  approvalNote: text("approval_note"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const profileGrants = pgTable(
  "profile_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    grantedBy: uuid("granted_by").references(() => profiles.id),
    grantedAt: timestamp("granted_at", tz).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", tz),
  },
  (table) => [
    index("idx_profile_grants_candidate").on(table.candidateId),
    index("idx_profile_grants_company").on(table.companyId),
    uniqueIndex("profile_grants_active_unique")
      .on(table.candidateId, table.companyId)
      .where(sql`${table.revokedAt} is null`),
  ]
);
