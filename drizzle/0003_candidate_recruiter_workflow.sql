ALTER TABLE "candidates" ADD COLUMN "last_recruiter_action_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "claimed_by_profile_id" uuid;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "claimed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_claimed_by_profile_id_profiles_id_fk" FOREIGN KEY ("claimed_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_candidates_claimed_by" ON "candidates" USING btree ("claimed_by_profile_id");--> statement-breakpoint
CREATE INDEX "idx_candidates_last_recruiter_action" ON "candidates" USING btree ("last_recruiter_action_at");
