CREATE TABLE "employee_statutory_details" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"staff_profile_id" uuid NOT NULL,
	"ciphertext" text NOT NULL,
	"key_version" integer DEFAULT 2 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employee_statutory_details" ADD CONSTRAINT "employee_statutory_details_staff_profile_id_staff_profiles_id_fk" FOREIGN KEY ("staff_profile_id") REFERENCES "public"."staff_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "employee_statutory_details_profile_idx" ON "employee_statutory_details" USING btree ("staff_profile_id");