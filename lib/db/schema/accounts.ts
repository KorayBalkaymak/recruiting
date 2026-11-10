import { index, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { candidates, citext, companies, createdAt, updatedAt } from "./internal";

export const employerMembershipRole = pgEnum("employer_membership_role", [
  "employer_admin",
  "employer_member",
]);

export const employerMembershipStatus = pgEnum("employer_membership_status", [
  "invited",
  "active",
  "disabled",
]);

/** Identität für spätere Better-Auth-Nutzer. Die ID wird dann die User-ID. */
export const candidateAccounts = pgTable("candidate_accounts", {
  id: uuid("id").primaryKey(),
  candidateId: uuid("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
}, (table) => [uniqueIndex("candidate_accounts_candidate_unique").on(table.candidateId)]);

export const employerAccounts = pgTable(
  "employer_accounts",
  {
    id: uuid("id").primaryKey(),
    fullName: text("full_name").notNull(),
    email: citext("email").notNull(),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("employer_accounts_email_unique").on(table.email)]
);

export const employerMemberships = pgTable(
  "employer_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employerAccountId: uuid("employer_account_id")
      .notNull()
      .references(() => employerAccounts.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    role: employerMembershipRole("role").notNull().default("employer_member"),
    status: employerMembershipStatus("status").notNull().default("invited"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("employer_memberships_account_company").on(table.employerAccountId, table.companyId),
    index("idx_employer_memberships_company").on(table.companyId),
  ]
);
