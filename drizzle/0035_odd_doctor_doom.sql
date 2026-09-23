CREATE TYPE "public"."leave_day_portion" AS ENUM('full_day', 'first_half', 'second_half');--> statement-breakpoint
CREATE TYPE "public"."leave_history_event" AS ENUM('submitted', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."leave_ledger_kind" AS ENUM('entitlement', 'adjustment', 'request', 'reversal');--> statement-breakpoint
CREATE TYPE "public"."leave_request_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."leave_unit" AS ENUM('day', 'half_day');--> statement-breakpoint
CREATE TABLE "holiday_calendars" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"name" text NOT NULL,
	"work_location_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"calendar_id" uuid NOT NULL,
	"holiday_date" date NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_ledger" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"employee_user_id" text NOT NULL,
	"leave_type_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"amount_half_days" integer NOT NULL,
	"kind" "leave_ledger_kind" NOT NULL,
	"reference" text NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "leave_policy_assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"employee_user_id" text NOT NULL,
	"leave_type_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"annual_entitlement_half_days" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_request_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"request_id" uuid NOT NULL,
	"event" "leave_history_event" NOT NULL,
	"actor_user_id" text NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"employee_user_id" text NOT NULL,
	"leave_type_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"day_portion" "leave_day_portion" DEFAULT 'full_day' NOT NULL,
	"requested_half_days" integer NOT NULL,
	"reason" text NOT NULL,
	"status" "leave_request_status" DEFAULT 'pending' NOT NULL,
	"current_approver_user_id" text,
	"decided_at" timestamp with time zone,
	"decided_by" text,
	"decision_note" text
);
--> statement-breakpoint
CREATE TABLE "leave_types" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_paid" boolean DEFAULT true NOT NULL,
	"unit" "leave_unit" DEFAULT 'day' NOT NULL,
	"allow_carry_forward" boolean DEFAULT false NOT NULL,
	"max_carry_forward_half_days" integer,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "holiday_calendars" ADD CONSTRAINT "holiday_calendars_work_location_id_work_locations_id_fk" FOREIGN KEY ("work_location_id") REFERENCES "public"."work_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_calendar_id_holiday_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."holiday_calendars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_ledger" ADD CONSTRAINT "leave_ledger_employee_user_id_user_id_fk" FOREIGN KEY ("employee_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_ledger" ADD CONSTRAINT "leave_ledger_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_policy_assignments" ADD CONSTRAINT "leave_policy_assignments_employee_user_id_user_id_fk" FOREIGN KEY ("employee_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_policy_assignments" ADD CONSTRAINT "leave_policy_assignments_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_request_history" ADD CONSTRAINT "leave_request_history_request_id_leave_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."leave_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_request_history" ADD CONSTRAINT "leave_request_history_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_user_id_user_id_fk" FOREIGN KEY ("employee_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_current_approver_user_id_user_id_fk" FOREIGN KEY ("current_approver_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "holiday_calendars_location_idx" ON "holiday_calendars" USING btree ("work_location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "holidays_calendar_date_idx" ON "holidays" USING btree ("calendar_id","holiday_date");--> statement-breakpoint
CREATE INDEX "holidays_date_idx" ON "holidays" USING btree ("holiday_date");--> statement-breakpoint
CREATE UNIQUE INDEX "leave_ledger_reference_idx" ON "leave_ledger" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "leave_ledger_employee_type_year_idx" ON "leave_ledger" USING btree ("employee_user_id","leave_type_id","year");--> statement-breakpoint
CREATE UNIQUE INDEX "leave_policy_employee_type_from_idx" ON "leave_policy_assignments" USING btree ("employee_user_id","leave_type_id","effective_from");--> statement-breakpoint
CREATE INDEX "leave_request_history_request_idx" ON "leave_request_history" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE INDEX "leave_requests_employee_status_dates_idx" ON "leave_requests" USING btree ("employee_user_id","status","start_date","end_date");--> statement-breakpoint
CREATE INDEX "leave_requests_approver_status_idx" ON "leave_requests" USING btree ("current_approver_user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "leave_types_code_idx" ON "leave_types" USING btree ("code");--> statement-breakpoint
CREATE INDEX "leave_types_active_idx" ON "leave_types" USING btree ("is_active");