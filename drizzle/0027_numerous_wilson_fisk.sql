CREATE TYPE "public"."hr_capability" AS ENUM('hr_admin', 'payroll_admin');--> statement-breakpoint
CREATE TYPE "public"."employment_category" AS ENUM('permanent', 'probationer', 'contract', 'intern', 'consultant');--> statement-breakpoint
CREATE TYPE "public"."employment_status" AS ENUM('draft', 'active', 'probation', 'notice', 'exited');--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"head_user_id" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "designations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_capability_assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"user_id" text NOT NULL,
	"capability" "hr_capability" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_locations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"address" text,
	"state" text,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD COLUMN "employee_code" text;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD COLUMN "legal_name" text;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD COLUMN "personal_email" text;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD COLUMN "department_id" uuid;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD COLUMN "designation_id" uuid;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD COLUMN "manager_user_id" text;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD COLUMN "work_location_id" uuid;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD COLUMN "employment_status" "employment_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD COLUMN "employment_category" "employment_category";--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD COLUMN "join_date" date;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD COLUMN "confirmation_date" date;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD COLUMN "notice_start_date" date;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD COLUMN "last_working_date" date;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD COLUMN "payroll_eligible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Existing staff profiles predate HR lifecycle fields. Preserve their current working access as
-- active employment, and make only internal employees payroll-eligible by default. Franchise and
-- associate records remain explicitly excluded until HR reviews them.
UPDATE "staff_profiles"
SET "employment_status" = 'active',
    "payroll_eligible" = ("employee_type" = 'internal');--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_head_user_id_user_id_fk" FOREIGN KEY ("head_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_capability_assignments" ADD CONSTRAINT "hr_capability_assignments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "departments_code_idx" ON "departments" USING btree ("code");--> statement-breakpoint
CREATE INDEX "departments_active_idx" ON "departments" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "designations_code_idx" ON "designations" USING btree ("code");--> statement-breakpoint
CREATE INDEX "designations_active_idx" ON "designations" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_capability_assignments_user_capability_idx" ON "hr_capability_assignments" USING btree ("user_id","capability");--> statement-breakpoint
CREATE INDEX "hr_capability_assignments_user_idx" ON "hr_capability_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "work_locations_code_idx" ON "work_locations" USING btree ("code");--> statement-breakpoint
CREATE INDEX "work_locations_active_idx" ON "work_locations" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_designation_id_designations_id_fk" FOREIGN KEY ("designation_id") REFERENCES "public"."designations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_manager_user_id_user_id_fk" FOREIGN KEY ("manager_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_work_location_id_work_locations_id_fk" FOREIGN KEY ("work_location_id") REFERENCES "public"."work_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "staff_profiles_department_idx" ON "staff_profiles" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "staff_profiles_manager_idx" ON "staff_profiles" USING btree ("manager_user_id");--> statement-breakpoint
CREATE INDEX "staff_profiles_employment_status_idx" ON "staff_profiles" USING btree ("employment_status");--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_employee_code_unique" UNIQUE("employee_code");
