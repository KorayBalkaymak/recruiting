import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  pgView,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const citext = customType<{ data: string }>({
  dataType() {
    return "citext";
  },
});

const tz = { withTimezone: true } as const;

export function createdAt() {
  return timestamp("created_at", tz).notNull().defaultNow();
}

export function updatedAt() {
  return timestamp("updated_at", tz).notNull().defaultNow();
}

export const userRole = pgEnum("user_role", ["recruiter", "kam", "geschaeftsleitung", "admin"]);

export const companyStatus = pgEnum("company_status", [
  "neukunde",
  "aktiv",
  "ohne_aktive_vakanz",
  "inaktiv",
]);

export const companyInactiveReason = pgEnum("company_inactive_reason", [
  "projekt_abgeschlossen",
  "kein_bedarf_mehr",
  "budget_gestoppt",
  "keine_rueckmeldung",
  "strategische_neuausrichtung",
]);

export const candidateStatus = pgEnum("candidate_status", [
  "neu_eingegangen",
  "in_bearbeitung",
  "profil_fertig",
  "in_einreichung",
  "inaktiv",
]);

export const vacancySource = pgEnum("vacancy_source", ["portal", "email", "telefon", "sonstige"]);

export const vacancyStatus = pgEnum("vacancy_status", [
  "neue_anfrage",
  "offen",
  "in_bearbeitung",
  "besetzt",
  "geschlossen",
]);

export const vacancyCloseReason = pgEnum("vacancy_close_reason", [
  "kunde_storniert",
  "position_intern_besetzt",
  "budget_gestrichen",
  "kein_geeigneter_kandidat",
  "sonstiges",
]);

export const employmentType = pgEnum("employment_type", [
  "festanstellung",
  "arbeitnehmerueberlassung",
  "freelance",
  "werkvertrag",
]);

export const submissionStatus = pgEnum("submission_status", [
  "vorgeschlagen",
  "angefragt",
  "in_pruefung",
  "verfuegbar",
  "abgelehnt",
  "vorstellungsgespraech",
  "besetzt",
]);

export const factorTier = pgEnum("factor_tier", ["basis", "standard", "spezialist", "premium"]);

export const calculationMode = pgEnum("calculation_mode", ["stundensatz", "gehalt"]);

export const offerStatus = pgEnum("offer_status", [
  "entwurf",
  "zur_freigabe",
  "in_pruefung",
  "freigegeben",
  "abgelehnt",
]);

export const activityType = pgEnum("activity_type", [
  "notiz",
  "anruf",
  "email",
  "statusaenderung",
  "meeting",
  "dokument",
]);

export const contractStatus = pgEnum("contract_status", ["entwurf", "aktiv", "beendet", "storniert"]);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fullName: text("full_name").notNull(),
    email: citext("email").notNull(),
    role: userRole("role").notNull().default("recruiter"),
    avatarUrl: text("avatar_url"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("profiles_email_unique").on(table.email)]
);

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    industry: text("industry"),
    website: text("website"),
    address: text("address"),
    city: text("city"),
    postalCode: text("postal_code"),
    country: text("country").default("Deutschland"),
    status: companyStatus("status").notNull().default("neukunde"),
    inactiveReason: companyInactiveReason("inactive_reason"),
    inactiveSince: date("inactive_since"),
    assignedKamId: uuid("assigned_kam_id").references(() => profiles.id),
    lastContactAt: timestamp("last_contact_at", tz),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("idx_companies_status").on(table.status),
    index("idx_companies_kam").on(table.assignedKamId),
    check(
      "chk_inactive_reason_only_if_inactive",
      sql`(
        (${table.status} = 'inaktiv' and ${table.inactiveReason} is not null)
        or (${table.status} <> 'inaktiv')
      )`
    ),
  ]
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    position: text("position"),
    email: citext("email"),
    phone: text("phone"),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("idx_contacts_company").on(table.companyId)]
);

export const candidates = pgTable(
  "candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: citext("email"),
    phone: text("phone"),
    anonymizedTitle: text("anonymized_title"),
    anonymizedProfile: jsonb("anonymized_profile")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    status: candidateStatus("status").notNull().default("neu_eingegangen"),
    desiredSalaryMin: numeric("desired_salary_min", { precision: 10, scale: 2 }),
    desiredSalaryMax: numeric("desired_salary_max", { precision: 10, scale: 2 }),
    hourlyRateNet: numeric("hourly_rate_net", { precision: 10, scale: 2 }),
    availabilityDate: date("availability_date"),
    location: text("location"),
    assignedRecruiterId: uuid("assigned_recruiter_id").references(() => profiles.id),
    cvFilePath: text("cv_file_path"),
    exposeFilePath: text("exposé_file_path"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("idx_candidates_status").on(table.status),
    index("idx_candidates_recruiter").on(table.assignedRecruiterId),
  ]
);

export const vacancies = pgTable(
  "vacancies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id),
    title: text("title").notNull(),
    source: vacancySource("source").notNull().default("sonstige"),
    status: vacancyStatus("status").notNull().default("neue_anfrage"),
    employmentType: employmentType("employment_type").notNull().default("festanstellung"),
    requirements: text("requirements"),
    budgetMin: numeric("budget_min", { precision: 10, scale: 2 }),
    budgetMax: numeric("budget_max", { precision: 10, scale: 2 }),
    currency: text("currency").notNull().default("EUR"),
    location: text("location"),
    startDate: date("start_date"),
    assignedRecruiterId: uuid("assigned_recruiter_id").references(() => profiles.id),
    filledCandidateId: uuid("filled_candidate_id").references(() => candidates.id),
    filledStartDate: date("filled_start_date"),
    filledFee: numeric("filled_fee", { precision: 10, scale: 2 }),
    closeReason: vacancyCloseReason("close_reason"),
    closeNotes: text("close_notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("idx_vacancies_company").on(table.companyId),
    index("idx_vacancies_status").on(table.status),
    index("idx_vacancies_recruiter").on(table.assignedRecruiterId),
  ]
);

export const vacancySubmissions = pgTable(
  "vacancy_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vacancyId: uuid("vacancy_id")
      .notNull()
      .references(() => vacancies.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    matchScore: numeric("match_score", { precision: 5, scale: 2 }),
    status: submissionStatus("status").notNull().default("vorgeschlagen"),
    submittedAt: timestamp("submitted_at", tz),
    feedback: text("feedback"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("vacancy_submissions_vacancy_candidate").on(table.vacancyId, table.candidateId),
    index("idx_submissions_vacancy").on(table.vacancyId),
    index("idx_submissions_candidate").on(table.candidateId),
    check(
      "vacancy_submissions_match_score_range",
      sql`${table.matchScore} is null or (${table.matchScore} >= 0 and ${table.matchScore} <= 100)`
    ),
  ]
);

export const offersCalculations = pgTable(
  "offers_calculations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vacancyId: uuid("vacancy_id").references(() => vacancies.id, { onDelete: "set null" }),
    candidateId: uuid("candidate_id").references(() => candidates.id, { onDelete: "set null" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    createdBy: uuid("created_by").references(() => profiles.id),
    mode: calculationMode("mode").notNull().default("stundensatz"),
    candidateHourlyRateNet: numeric("candidate_hourly_rate_net", { precision: 10, scale: 2 }),
    candidateMonthlySalary: numeric("candidate_monthly_salary", { precision: 10, scale: 2 }),
    currency: text("currency").notNull().default("EUR"),
    assignmentDurationMonths: integer("assignment_duration_months"),
    assignmentLocation: text("assignment_location"),
    factorTier: factorTier("factor_tier").notNull().default("standard"),
    factorValue: numeric("factor_value", { precision: 4, scale: 2 }).notNull().default("2.2"),
    recommendedHourlyRate: numeric("recommended_hourly_rate", { precision: 10, scale: 2 }),
    monthlyRevenue: numeric("monthly_revenue", { precision: 12, scale: 2 }),
    marginPerHour: numeric("margin_per_hour", { precision: 10, scale: 2 }),
    marginPerMonth: numeric("margin_per_month", { precision: 12, scale: 2 }),
    marginPerYear: numeric("margin_per_year", { precision: 12, scale: 2 }),
    status: offerStatus("status").notNull().default("entwurf"),
    reviewedBy: uuid("reviewed_by").references(() => profiles.id),
    reviewNotes: text("review_notes"),
    pdfFilePath: text("pdf_file_path"),
    sentAt: timestamp("sent_at", tz),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("idx_offers_vacancy").on(table.vacancyId),
    index("idx_offers_status").on(table.status),
  ]
);

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    type: activityType("type").notNull().default("notiz"),
    content: text("content").notNull(),
    createdBy: uuid("created_by").references(() => profiles.id),
    createdAt: createdAt(),
  },
  (table) => [
    index("idx_activity_entity").on(table.entityType, table.entityId),
    index("idx_activity_created_at").on(table.createdAt),
    check(
      "activity_logs_entity_type",
      sql`${table.entityType} in ('company', 'candidate', 'vacancy', 'offer')`
    ),
  ]
);

export const contracts = pgTable(
  "contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vacancyId: uuid("vacancy_id").references(() => vacancies.id, { onDelete: "set null" }),
    candidateId: uuid("candidate_id").references(() => candidates.id, { onDelete: "set null" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    contractNumber: text("contract_number").notNull(),
    status: contractStatus("status").notNull().default("entwurf"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }),
    fee: numeric("fee", { precision: 10, scale: 2 }),
    currency: text("currency").notNull().default("EUR"),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => profiles.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("contracts_contract_number_unique").on(table.contractNumber),
    index("idx_contracts_vacancy").on(table.vacancyId),
    index("idx_contracts_status").on(table.status),
  ]
);

function companyViewColumns() {
  return {
    id: uuid("id").notNull(),
    name: text("name").notNull(),
    industry: text("industry"),
    website: text("website"),
    address: text("address"),
    city: text("city"),
    postalCode: text("postal_code"),
    country: text("country"),
    status: companyStatus("status").notNull(),
    inactiveReason: companyInactiveReason("inactive_reason"),
    inactiveSince: date("inactive_since"),
    assignedKamId: uuid("assigned_kam_id"),
    lastContactAt: timestamp("last_contact_at", tz),
    notes: text("notes"),
    createdAt: timestamp("created_at", tz).notNull(),
    updatedAt: timestamp("updated_at", tz).notNull(),
  };
}

export const companiesActive = pgView("v_companies_active", companyViewColumns()).as(sql`
  select c.*
  from companies c
  where c.status <> 'inaktiv'
    and (
      exists (
        select 1 from vacancies v
        where v.company_id = c.id
          and v.status in ('neue_anfrage', 'offen', 'in_bearbeitung')
      )
      or c.last_contact_at >= now() - interval '6 months'
    )
`);

export const companiesWithoutActiveVacancy = pgView("v_companies_without_active_vacancy", {
  ...companyViewColumns(),
  lastVacancyActivity: timestamp("last_vacancy_activity", tz),
  monthsWithoutVacancy: integer("months_without_vacancy"),
}).as(sql`
  select
    c.*,
    (select max(v.updated_at) from vacancies v where v.company_id = c.id) as last_vacancy_activity,
    extract(month from age(now(), (select max(v.updated_at) from vacancies v where v.company_id = c.id)))::int
      as months_without_vacancy
  from companies c
  where c.status <> 'inaktiv'
    and not exists (
      select 1 from vacancies v
      where v.company_id = c.id
        and v.status in ('neue_anfrage', 'offen', 'in_bearbeitung')
    )
    and exists (
      select 1 from vacancies v where v.company_id = c.id
    )
`);
