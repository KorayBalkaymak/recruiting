CREATE TYPE "public"."portal_profile_status" AS ENUM('draft', 'submitted', 'in_review', 'changes_requested', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "candidate_portal_profiles" (
	"candidate_id" uuid PRIMARY KEY NOT NULL,
	"status" "portal_profile_status" DEFAULT 'draft' NOT NULL,
	"summary" text,
	"years_experience" integer,
	"review_note" text,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_profile_review_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"actor_profile_id" uuid,
	"actor_candidate_account_id" uuid,
	"from_status" "portal_profile_status",
	"to_status" "portal_profile_status" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candidate_portal_profiles" ADD CONSTRAINT "candidate_portal_profiles_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_profile_review_events" ADD CONSTRAINT "candidate_profile_review_events_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_profile_review_events" ADD CONSTRAINT "candidate_profile_review_events_actor_profile_id_profiles_id_fk" FOREIGN KEY ("actor_profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_candidate_portal_profiles_status" ON "candidate_portal_profiles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_candidate_profile_review_events_candidate" ON "candidate_profile_review_events" USING btree ("candidate_id");