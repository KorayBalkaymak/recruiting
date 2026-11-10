import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { candidateAccounts } from "./accounts";
import { candidates, companies, createdAt, profiles, updatedAt } from "./internal";

const tz = { withTimezone: true } as const;

export const documentKind = pgEnum("document_kind", ["cv", "certificate", "other", "expose"]);

export const documentSensitivity = pgEnum("document_sensitivity", ["original", "redacted"]);

export const documentReviewStatus = pgEnum("document_review_status", [
  "uploaded",
  "in_review",
  "rejected",
  "redacted_ready",
  "approved",
]);

export const documentReviewAction = pgEnum("document_review_action", [
  "uploaded",
  "review_started",
  "rejected",
  "redacted_uploaded",
  "approved",
  "released",
  "release_revoked",
]);

export const candidateDocuments = pgTable(
  "candidate_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    parentDocumentId: uuid("parent_document_id").references((): AnyPgColumn => candidateDocuments.id, {
      onDelete: "cascade",
    }),
    kind: documentKind("kind").notNull(),
    sensitivity: documentSensitivity("sensitivity").notNull(),
    storageBucket: text("storage_bucket").notNull(),
    storagePath: text("storage_path").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    checksum: text("checksum"),
    reviewStatus: documentReviewStatus("review_status").notNull().default("uploaded"),
    uploadedByProfileId: uuid("uploaded_by_profile_id").references(() => profiles.id),
    uploadedByCandidateAccountId: uuid("uploaded_by_candidate_account_id").references(
      () => candidateAccounts.id
    ),
    reviewedBy: uuid("reviewed_by").references(() => profiles.id),
    reviewedAt: timestamp("reviewed_at", tz),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("candidate_documents_bucket_path").on(table.storageBucket, table.storagePath),
    index("idx_candidate_documents_candidate").on(table.candidateId),
    index("idx_candidate_documents_parent").on(table.parentDocumentId),
    check(
      "candidate_documents_original_has_no_parent",
      sql`(
        (${table.sensitivity} = 'original' and ${table.parentDocumentId} is null)
        or (${table.sensitivity} = 'redacted' and ${table.parentDocumentId} is not null)
      )`
    ),
    check(
      "candidate_documents_one_uploader",
      sql`(
        (${table.uploadedByProfileId} is not null and ${table.uploadedByCandidateAccountId} is null)
        or (${table.uploadedByProfileId} is null and ${table.uploadedByCandidateAccountId} is not null)
      )`
    ),
  ]
);

export const documentReviewEvents = pgTable(
  "document_review_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => candidateDocuments.id, { onDelete: "cascade" }),
    actorProfileId: uuid("actor_profile_id").references(() => profiles.id),
    action: documentReviewAction("action").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (table) => [index("idx_document_review_events_document").on(table.documentId)]
);

export const documentGrants = pgTable(
  "document_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => candidateDocuments.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    grantedBy: uuid("granted_by").references(() => profiles.id),
    grantedAt: timestamp("granted_at", tz).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", tz),
  },
  (table) => [
    index("idx_document_grants_document").on(table.documentId),
    index("idx_document_grants_company").on(table.companyId),
    uniqueIndex("document_grants_active_unique")
      .on(table.documentId, table.companyId)
      .where(sql`${table.revokedAt} is null`),
  ]
);
