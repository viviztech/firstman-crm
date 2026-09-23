CREATE TYPE "public"."employee_document_type" AS ENUM('offer_letter', 'appointment_letter', 'employment_contract', 'identity_proof', 'address_proof', 'certificate', 'other');--> statement-breakpoint
CREATE TABLE "employee_documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"staff_profile_id" uuid NOT NULL,
	"type" "employee_document_type" NOT NULL,
	"label" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"expiry_date" date
);
--> statement-breakpoint
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_staff_profile_id_staff_profiles_id_fk" FOREIGN KEY ("staff_profile_id") REFERENCES "public"."staff_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employee_documents_profile_idx" ON "employee_documents" USING btree ("staff_profile_id");