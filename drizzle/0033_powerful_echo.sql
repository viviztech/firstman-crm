CREATE TYPE "public"."employee_import_status" AS ENUM('prepared', 'committed');--> statement-breakpoint
CREATE TABLE "employee_import_batches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"file_sha256" text NOT NULL,
	"row_count" integer NOT NULL,
	"status" "employee_import_status" DEFAULT 'prepared' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"committed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "employee_import_batches" ADD CONSTRAINT "employee_import_batches_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;