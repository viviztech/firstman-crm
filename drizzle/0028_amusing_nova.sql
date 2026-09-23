CREATE TABLE "employee_status_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"staff_profile_id" uuid NOT NULL,
	"from_status" "employment_status" NOT NULL,
	"to_status" "employment_status" NOT NULL,
	"effective_date" date NOT NULL,
	"reason" text NOT NULL,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employee_status_history" ADD CONSTRAINT "employee_status_history_staff_profile_id_staff_profiles_id_fk" FOREIGN KEY ("staff_profile_id") REFERENCES "public"."staff_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_history" ADD CONSTRAINT "employee_status_history_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employee_status_history_profile_created_idx" ON "employee_status_history" USING btree ("staff_profile_id","created_at");