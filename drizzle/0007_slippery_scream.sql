CREATE TYPE "public"."commission_type" AS ENUM('percentage', 'flat');--> statement-breakpoint
CREATE TYPE "public"."employee_type" AS ENUM('internal', 'franchise');--> statement-breakpoint
CREATE TABLE "referral_partners" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"commission_type" "commission_type",
	"commission_rate" integer,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_pincode_allocations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"staff_profile_id" uuid NOT NULL,
	"pincode" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"user_id" text NOT NULL,
	"employee_type" "employee_type" DEFAULT 'internal' NOT NULL,
	CONSTRAINT "staff_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "staff_service_assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"user_id" text NOT NULL,
	"service_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "referral_partner_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "pincode" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "referral_partner_id" uuid;--> statement-breakpoint
ALTER TABLE "staff_pincode_allocations" ADD CONSTRAINT "staff_pincode_allocations_staff_profile_id_staff_profiles_id_fk" FOREIGN KEY ("staff_profile_id") REFERENCES "public"."staff_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_service_assignments" ADD CONSTRAINT "staff_service_assignments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_service_assignments" ADD CONSTRAINT "staff_service_assignments_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "referral_partners_phone_idx" ON "referral_partners" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_pincode_allocations_profile_pincode_idx" ON "staff_pincode_allocations" USING btree ("staff_profile_id","pincode");--> statement-breakpoint
CREATE INDEX "staff_pincode_allocations_pincode_idx" ON "staff_pincode_allocations" USING btree ("pincode");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_service_assignments_user_service_idx" ON "staff_service_assignments" USING btree ("user_id","service_id");--> statement-breakpoint
CREATE INDEX "staff_service_assignments_user_id_idx" ON "staff_service_assignments" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_referral_partner_id_referral_partners_id_fk" FOREIGN KEY ("referral_partner_id") REFERENCES "public"."referral_partners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_referral_partner_id_referral_partners_id_fk" FOREIGN KEY ("referral_partner_id") REFERENCES "public"."referral_partners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clients_pincode_idx" ON "clients" USING btree ("pincode");--> statement-breakpoint
CREATE INDEX "leads_pincode_idx" ON "leads" USING btree ("pincode");