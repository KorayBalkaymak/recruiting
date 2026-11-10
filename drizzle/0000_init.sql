CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS citext;--> statement-breakpoint
CREATE TYPE "public"."activity_type" AS ENUM('notiz', 'anruf', 'email', 'statusaenderung', 'meeting', 'dokument');--> statement-breakpoint
CREATE TYPE "public"."calculation_mode" AS ENUM('stundensatz', 'gehalt');--> statement-breakpoint
CREATE TYPE "public"."candidate_status" AS ENUM('neu_eingegangen', 'in_bearbeitung', 'profil_fertig', 'in_einreichung', 'inaktiv');--> statement-breakpoint
CREATE TYPE "public"."company_inactive_reason" AS ENUM('projekt_abgeschlossen', 'kein_bedarf_mehr', 'budget_gestoppt', 'keine_rueckmeldung', 'strategische_neuausrichtung');--> statement-breakpoint
CREATE TYPE "public"."company_status" AS ENUM('neukunde', 'aktiv', 'ohne_aktive_vakanz', 'inaktiv');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('entwurf', 'aktiv', 'beendet', 'storniert');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('festanstellung', 'arbeitnehmerueberlassung', 'freelance', 'werkvertrag');--> statement-breakpoint
CREATE TYPE "public"."factor_tier" AS ENUM('basis', 'standard', 'spezialist', 'premium');--> statement-breakpoint
CREATE TYPE "public"."offer_status" AS ENUM('entwurf', 'zur_freigabe', 'in_pruefung', 'freigegeben', 'abgelehnt');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('vorgeschlagen', 'angefragt', 'in_pruefung', 'verfuegbar', 'abgelehnt', 'vorstellungsgespraech', 'besetzt');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('recruiter', 'kam', 'geschaeftsleitung', 'admin');--> statement-breakpoint
CREATE TYPE "public"."vacancy_close_reason" AS ENUM('kunde_storniert', 'position_intern_besetzt', 'budget_gestrichen', 'kein_geeigneter_kandidat', 'sonstiges');--> statement-breakpoint
CREATE TYPE "public"."vacancy_source" AS ENUM('portal', 'email', 'telefon', 'sonstige');--> statement-breakpoint
CREATE TYPE "public"."vacancy_status" AS ENUM('neue_anfrage', 'offen', 'in_bearbeitung', 'besetzt', 'geschlossen');--> statement-breakpoint
CREATE TYPE "public"."employer_membership_role" AS ENUM('employer_admin', 'employer_member');--> statement-breakpoint
CREATE TYPE "public"."employer_membership_status" AS ENUM('invited', 'active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."candidate_term_kind" AS ENUM('skill', 'keyword', 'qualification', 'industry');--> statement-breakpoint
CREATE TYPE "public"."candidate_term_source" AS ENUM('candidate', 'recruiter');--> statement-breakpoint
CREATE TYPE "public"."publication_status" AS ENUM('not_ready', 'in_review', 'approved', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."work_model" AS ENUM('remote', 'hybrid', 'onsite', 'flexible');--> statement-breakpoint
CREATE TYPE "public"."document_kind" AS ENUM('cv', 'certificate', 'other', 'expose');--> statement-breakpoint
CREATE TYPE "public"."document_review_action" AS ENUM('uploaded', 'review_started', 'rejected', 'redacted_uploaded', 'approved', 'released', 'release_revoked');--> statement-breakpoint
CREATE TYPE "public"."document_review_status" AS ENUM('uploaded', 'in_review', 'rejected', 'redacted_ready', 'approved');--> statement-breakpoint
CREATE TYPE "public"."document_sensitivity" AS ENUM('original', 'redacted');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"type" "activity_type" DEFAULT 'notiz' NOT NULL,
	"content" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_logs_entity_type" CHECK ("activity_logs"."entity_type" in ('company', 'candidate', 'vacancy', 'offer'))
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" "citext",
	"phone" text,
	"anonymized_title" text,
	"anonymized_profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "candidate_status" DEFAULT 'neu_eingegangen' NOT NULL,
	"desired_salary_min" numeric(10, 2),
	"desired_salary_max" numeric(10, 2),
	"hourly_rate_net" numeric(10, 2),
	"availability_date" date,
	"location" text,
	"assigned_recruiter_id" uuid,
	"cv_file_path" text,
	"exposé_file_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"industry" text,
	"website" text,
	"address" text,
	"city" text,
	"postal_code" text,
	"country" text DEFAULT 'Deutschland',
	"status" "company_status" DEFAULT 'neukunde' NOT NULL,
	"inactive_reason" "company_inactive_reason",
	"inactive_since" date,
	"assigned_kam_id" uuid,
	"last_contact_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_inactive_reason_only_if_inactive" CHECK ((
        ("companies"."status" = 'inaktiv' and "companies"."inactive_reason" is not null)
        or ("companies"."status" <> 'inaktiv')
      ))
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"position" text,
	"email" "citext",
	"phone" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vacancy_id" uuid,
	"candidate_id" uuid,
	"company_id" uuid,
	"contract_number" text NOT NULL,
	"status" "contract_status" DEFAULT 'entwurf' NOT NULL,
	"start_date" date,
	"end_date" date,
	"hourly_rate" numeric(10, 2),
	"fee" numeric(10, 2),
	"currency" text DEFAULT 'EUR' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers_calculations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vacancy_id" uuid,
	"candidate_id" uuid,
	"company_id" uuid,
	"created_by" uuid,
	"mode" "calculation_mode" DEFAULT 'stundensatz' NOT NULL,
	"candidate_hourly_rate_net" numeric(10, 2),
	"candidate_monthly_salary" numeric(10, 2),
	"currency" text DEFAULT 'EUR' NOT NULL,
	"assignment_duration_months" integer,
	"assignment_location" text,
	"factor_tier" "factor_tier" DEFAULT 'standard' NOT NULL,
	"factor_value" numeric(4, 2) DEFAULT '2.2' NOT NULL,
	"recommended_hourly_rate" numeric(10, 2),
	"monthly_revenue" numeric(12, 2),
	"margin_per_hour" numeric(10, 2),
	"margin_per_month" numeric(12, 2),
	"margin_per_year" numeric(12, 2),
	"status" "offer_status" DEFAULT 'entwurf' NOT NULL,
	"reviewed_by" uuid,
	"review_notes" text,
	"pdf_file_path" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"email" "citext" NOT NULL,
	"role" "user_role" DEFAULT 'recruiter' NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vacancies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"contact_id" uuid,
	"title" text NOT NULL,
	"source" "vacancy_source" DEFAULT 'sonstige' NOT NULL,
	"status" "vacancy_status" DEFAULT 'neue_anfrage' NOT NULL,
	"employment_type" "employment_type" DEFAULT 'festanstellung' NOT NULL,
	"requirements" text,
	"budget_min" numeric(10, 2),
	"budget_max" numeric(10, 2),
	"currency" text DEFAULT 'EUR' NOT NULL,
	"location" text,
	"start_date" date,
	"assigned_recruiter_id" uuid,
	"filled_candidate_id" uuid,
	"filled_start_date" date,
	"filled_fee" numeric(10, 2),
	"close_reason" "vacancy_close_reason",
	"close_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vacancy_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vacancy_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"match_score" numeric(5, 2),
	"status" "submission_status" DEFAULT 'vorgeschlagen' NOT NULL,
	"submitted_at" timestamp with time zone,
	"feedback" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vacancy_submissions_match_score_range" CHECK ("vacancy_submissions"."match_score" is null or ("vacancy_submissions"."match_score" >= 0 and "vacancy_submissions"."match_score" <= 100))
);
--> statement-breakpoint
CREATE TABLE "candidate_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"candidate_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employer_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" "citext" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employer_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_account_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"role" "employer_membership_role" DEFAULT 'employer_member' NOT NULL,
	"status" "employer_membership_status" DEFAULT 'invited' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_experiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"role" text NOT NULL,
	"period" text,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_publications" (
	"candidate_id" uuid PRIMARY KEY NOT NULL,
	"anonymized_title" text,
	"anonymized_profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"publication_status" "publication_status" DEFAULT 'not_ready' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"approval_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_search_profiles" (
	"candidate_id" uuid PRIMARY KEY NOT NULL,
	"desired_role" text,
	"desired_employment_type" "employment_type",
	"work_model" "work_model",
	"weekly_hours" integer,
	"preference_notes" text,
	"city" text,
	"postal_code" text,
	"country" text DEFAULT 'Deutschland',
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"search_radius_km" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"kind" "candidate_term_kind" NOT NULL,
	"term" text NOT NULL,
	"normalized" text NOT NULL,
	"source" "candidate_term_source" DEFAULT 'candidate' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"granted_by" uuid,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "candidate_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"parent_document_id" uuid,
	"kind" "document_kind" NOT NULL,
	"sensitivity" "document_sensitivity" NOT NULL,
	"storage_bucket" text NOT NULL,
	"storage_path" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"checksum" text,
	"review_status" "document_review_status" DEFAULT 'uploaded' NOT NULL,
	"uploaded_by_profile_id" uuid,
	"uploaded_by_candidate_account_id" uuid,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_documents_original_has_no_parent" CHECK ((
        ("candidate_documents"."sensitivity" = 'original' and "candidate_documents"."parent_document_id" is null)
        or ("candidate_documents"."sensitivity" = 'redacted' and "candidate_documents"."parent_document_id" is not null)
      )),
	CONSTRAINT "candidate_documents_one_uploader" CHECK ((
        ("candidate_documents"."uploaded_by_profile_id" is not null and "candidate_documents"."uploaded_by_candidate_account_id" is null)
        or ("candidate_documents"."uploaded_by_profile_id" is null and "candidate_documents"."uploaded_by_candidate_account_id" is not null)
      ))
);
--> statement-breakpoint
CREATE TABLE "document_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"granted_by" uuid,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "document_review_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"actor_profile_id" uuid,
	"action" "document_review_action" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_assigned_recruiter_id_profiles_id_fk" FOREIGN KEY ("assigned_recruiter_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_assigned_kam_id_profiles_id_fk" FOREIGN KEY ("assigned_kam_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_vacancy_id_vacancies_id_fk" FOREIGN KEY ("vacancy_id") REFERENCES "public"."vacancies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers_calculations" ADD CONSTRAINT "offers_calculations_vacancy_id_vacancies_id_fk" FOREIGN KEY ("vacancy_id") REFERENCES "public"."vacancies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers_calculations" ADD CONSTRAINT "offers_calculations_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers_calculations" ADD CONSTRAINT "offers_calculations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers_calculations" ADD CONSTRAINT "offers_calculations_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers_calculations" ADD CONSTRAINT "offers_calculations_reviewed_by_profiles_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_assigned_recruiter_id_profiles_id_fk" FOREIGN KEY ("assigned_recruiter_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_filled_candidate_id_candidates_id_fk" FOREIGN KEY ("filled_candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacancy_submissions" ADD CONSTRAINT "vacancy_submissions_vacancy_id_vacancies_id_fk" FOREIGN KEY ("vacancy_id") REFERENCES "public"."vacancies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacancy_submissions" ADD CONSTRAINT "vacancy_submissions_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_accounts" ADD CONSTRAINT "candidate_accounts_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employer_memberships" ADD CONSTRAINT "employer_memberships_employer_account_id_employer_accounts_id_fk" FOREIGN KEY ("employer_account_id") REFERENCES "public"."employer_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employer_memberships" ADD CONSTRAINT "employer_memberships_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_experiences" ADD CONSTRAINT "candidate_experiences_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_publications" ADD CONSTRAINT "candidate_publications_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_publications" ADD CONSTRAINT "candidate_publications_approved_by_profiles_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_search_profiles" ADD CONSTRAINT "candidate_search_profiles_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_terms" ADD CONSTRAINT "candidate_terms_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_grants" ADD CONSTRAINT "profile_grants_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_grants" ADD CONSTRAINT "profile_grants_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_grants" ADD CONSTRAINT "profile_grants_granted_by_profiles_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_documents" ADD CONSTRAINT "candidate_documents_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_documents" ADD CONSTRAINT "candidate_documents_parent_document_id_candidate_documents_id_fk" FOREIGN KEY ("parent_document_id") REFERENCES "public"."candidate_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_documents" ADD CONSTRAINT "candidate_documents_uploaded_by_profile_id_profiles_id_fk" FOREIGN KEY ("uploaded_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_documents" ADD CONSTRAINT "candidate_documents_uploaded_by_candidate_account_id_candidate_accounts_id_fk" FOREIGN KEY ("uploaded_by_candidate_account_id") REFERENCES "public"."candidate_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_documents" ADD CONSTRAINT "candidate_documents_reviewed_by_profiles_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_grants" ADD CONSTRAINT "document_grants_document_id_candidate_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."candidate_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_grants" ADD CONSTRAINT "document_grants_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_grants" ADD CONSTRAINT "document_grants_granted_by_profiles_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_review_events" ADD CONSTRAINT "document_review_events_document_id_candidate_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."candidate_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_review_events" ADD CONSTRAINT "document_review_events_actor_profile_id_profiles_id_fk" FOREIGN KEY ("actor_profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activity_entity" ON "activity_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_activity_created_at" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_candidates_status" ON "candidates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_candidates_recruiter" ON "candidates" USING btree ("assigned_recruiter_id");--> statement-breakpoint
CREATE INDEX "idx_companies_status" ON "companies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_companies_kam" ON "companies" USING btree ("assigned_kam_id");--> statement-breakpoint
CREATE INDEX "idx_contacts_company" ON "contacts" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contracts_contract_number_unique" ON "contracts" USING btree ("contract_number");--> statement-breakpoint
CREATE INDEX "idx_contracts_vacancy" ON "contracts" USING btree ("vacancy_id");--> statement-breakpoint
CREATE INDEX "idx_contracts_status" ON "contracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_offers_vacancy" ON "offers_calculations" USING btree ("vacancy_id");--> statement-breakpoint
CREATE INDEX "idx_offers_status" ON "offers_calculations" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_email_unique" ON "profiles" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_vacancies_company" ON "vacancies" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_vacancies_status" ON "vacancies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_vacancies_recruiter" ON "vacancies" USING btree ("assigned_recruiter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vacancy_submissions_vacancy_candidate" ON "vacancy_submissions" USING btree ("vacancy_id","candidate_id");--> statement-breakpoint
CREATE INDEX "idx_submissions_vacancy" ON "vacancy_submissions" USING btree ("vacancy_id");--> statement-breakpoint
CREATE INDEX "idx_submissions_candidate" ON "vacancy_submissions" USING btree ("candidate_id");--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_accounts_candidate_unique" ON "candidate_accounts" USING btree ("candidate_id");--> statement-breakpoint
CREATE UNIQUE INDEX "employer_accounts_email_unique" ON "employer_accounts" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "employer_memberships_account_company" ON "employer_memberships" USING btree ("employer_account_id","company_id");--> statement-breakpoint
CREATE INDEX "idx_employer_memberships_company" ON "employer_memberships" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_candidate_experiences_candidate" ON "candidate_experiences" USING btree ("candidate_id");--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_terms_candidate_kind_normalized" ON "candidate_terms" USING btree ("candidate_id","kind","normalized");--> statement-breakpoint
CREATE INDEX "idx_candidate_terms_normalized" ON "candidate_terms" USING btree ("normalized");--> statement-breakpoint
CREATE INDEX "idx_profile_grants_candidate" ON "profile_grants" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "idx_profile_grants_company" ON "profile_grants" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_grants_active_unique" ON "profile_grants" USING btree ("candidate_id","company_id") WHERE "profile_grants"."revoked_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_documents_bucket_path" ON "candidate_documents" USING btree ("storage_bucket","storage_path");--> statement-breakpoint
CREATE INDEX "idx_candidate_documents_candidate" ON "candidate_documents" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "idx_candidate_documents_parent" ON "candidate_documents" USING btree ("parent_document_id");--> statement-breakpoint
CREATE INDEX "idx_document_grants_document" ON "document_grants" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_document_grants_company" ON "document_grants" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "document_grants_active_unique" ON "document_grants" USING btree ("document_id","company_id") WHERE "document_grants"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "idx_document_review_events_document" ON "document_review_events" USING btree ("document_id");--> statement-breakpoint
CREATE VIEW "public"."v_companies_active" AS (
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
);--> statement-breakpoint
CREATE VIEW "public"."v_companies_without_active_vacancy" AS (
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
);--> statement-breakpoint
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER trg_candidates_updated_at BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER trg_vacancies_updated_at BEFORE UPDATE ON vacancies FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER trg_submissions_updated_at BEFORE UPDATE ON vacancy_submissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER trg_offers_updated_at BEFORE UPDATE ON offers_calculations FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER trg_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER trg_employer_memberships_updated_at BEFORE UPDATE ON employer_memberships FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER trg_candidate_search_profiles_updated_at BEFORE UPDATE ON candidate_search_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER trg_candidate_experiences_updated_at BEFORE UPDATE ON candidate_experiences FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER trg_candidate_publications_updated_at BEFORE UPDATE ON candidate_publications FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER trg_candidate_documents_updated_at BEFORE UPDATE ON candidate_documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE OR REPLACE FUNCTION reject_overlapping_account()
RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME <> 'profiles' AND EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
    RAISE EXCEPTION 'account id already used by an internal profile';
  END IF;
  IF TG_TABLE_NAME <> 'candidate_accounts' AND EXISTS (SELECT 1 FROM candidate_accounts WHERE id = NEW.id) THEN
    RAISE EXCEPTION 'account id already used by a candidate account';
  END IF;
  IF TG_TABLE_NAME <> 'employer_accounts' AND EXISTS (SELECT 1 FROM employer_accounts WHERE id = NEW.id) THEN
    RAISE EXCEPTION 'account id already used by an employer account';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER trg_profiles_account_exclusive BEFORE INSERT OR UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION reject_overlapping_account();--> statement-breakpoint
CREATE TRIGGER trg_candidate_accounts_exclusive BEFORE INSERT OR UPDATE ON candidate_accounts FOR EACH ROW EXECUTE FUNCTION reject_overlapping_account();--> statement-breakpoint
CREATE TRIGGER trg_employer_accounts_exclusive BEFORE INSERT OR UPDATE ON employer_accounts FOR EACH ROW EXECUTE FUNCTION reject_overlapping_account();--> statement-breakpoint
CREATE OR REPLACE FUNCTION reject_document_grant_on_original()
RETURNS trigger AS $$
DECLARE
  doc_sensitivity document_sensitivity;
BEGIN
  SELECT sensitivity INTO doc_sensitivity FROM candidate_documents WHERE id = NEW.document_id;
  IF doc_sensitivity IS DISTINCT FROM 'redacted' THEN
    RAISE EXCEPTION 'document grants are only allowed for redacted documents';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER trg_document_grants_redacted_only BEFORE INSERT OR UPDATE ON document_grants FOR EACH ROW EXECUTE FUNCTION reject_document_grant_on_original();