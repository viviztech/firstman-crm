CREATE TYPE "public"."attendance_import_status" AS ENUM('prepared', 'committed');--> statement-breakpoint
CREATE TYPE "public"."attendance_source" AS ENUM('manual', 'csv', 'derived', 'regularization');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'half_day', 'leave', 'half_day_leave', 'holiday', 'week_off', 'missing_punch');--> statement-breakpoint
CREATE TYPE "public"."attendance_regularization_event" AS ENUM('submitted', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."attendance_regularization_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TABLE "attendance_import_batches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"file_sha256" text NOT NULL,
	"row_count" integer NOT NULL,
	"status" "attendance_import_status" DEFAULT 'prepared' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"committed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "attendance_period_locks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"reason" text NOT NULL,
	"payroll_period_reference" text,
	"locked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"employee_user_id" text NOT NULL,
	"work_date" date NOT NULL,
	"shift_id" uuid,
	"first_in" timestamp with time zone,
	"last_out" timestamp with time zone,
	"work_minutes" integer DEFAULT 0 NOT NULL,
	"status" "attendance_status" NOT NULL,
	"source" "attendance_source" NOT NULL,
	"note" text,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"lock_reason" text
);
--> statement-breakpoint
CREATE TABLE "attendance_regularization_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"request_id" uuid NOT NULL,
	"event" "attendance_regularization_event" NOT NULL,
	"actor_user_id" text NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "attendance_regularizations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"employee_user_id" text NOT NULL,
	"work_date" date NOT NULL,
	"requested_first_in" timestamp with time zone,
	"requested_last_out" timestamp with time zone,
	"requested_status" "attendance_status" NOT NULL,
	"reason" text NOT NULL,
	"status" "attendance_regularization_status" DEFAULT 'pending' NOT NULL,
	"current_approver_user_id" text,
	"decided_at" timestamp with time zone,
	"decided_by" text,
	"decision_note" text
);
--> statement-breakpoint
CREATE TABLE "shift_assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"employee_user_id" text NOT NULL,
	"shift_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"break_minutes" integer DEFAULT 0 NOT NULL,
	"full_day_minutes" integer NOT NULL,
	"half_day_minutes" integer NOT NULL,
	"crosses_midnight" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_import_batches" ADD CONSTRAINT "attendance_import_batches_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_period_locks" ADD CONSTRAINT "attendance_period_locks_locked_by_user_id_fk" FOREIGN KEY ("locked_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employee_user_id_user_id_fk" FOREIGN KEY ("employee_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_locked_by_user_id_fk" FOREIGN KEY ("locked_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_regularization_history" ADD CONSTRAINT "attendance_regularization_history_request_id_attendance_regularizations_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."attendance_regularizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_regularization_history" ADD CONSTRAINT "attendance_regularization_history_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_regularizations" ADD CONSTRAINT "attendance_regularizations_employee_user_id_user_id_fk" FOREIGN KEY ("employee_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_regularizations" ADD CONSTRAINT "attendance_regularizations_current_approver_user_id_user_id_fk" FOREIGN KEY ("current_approver_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_regularizations" ADD CONSTRAINT "attendance_regularizations_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_employee_user_id_user_id_fk" FOREIGN KEY ("employee_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_period_locks_range_idx" ON "attendance_period_locks" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_records_employee_date_idx" ON "attendance_records" USING btree ("employee_user_id","work_date");--> statement-breakpoint
CREATE INDEX "attendance_records_date_status_idx" ON "attendance_records" USING btree ("work_date","status");--> statement-breakpoint
CREATE INDEX "attendance_regularization_history_request_idx" ON "attendance_regularization_history" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "attendance_regularizations_employee_status_idx" ON "attendance_regularizations" USING btree ("employee_user_id","status");--> statement-breakpoint
CREATE INDEX "attendance_regularizations_approver_status_idx" ON "attendance_regularizations" USING btree ("current_approver_user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "shift_assignments_employee_from_idx" ON "shift_assignments" USING btree ("employee_user_id","effective_from");--> statement-breakpoint
CREATE INDEX "shift_assignments_shift_idx" ON "shift_assignments" USING btree ("shift_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shifts_code_idx" ON "shifts" USING btree ("code");--> statement-breakpoint
CREATE INDEX "shifts_active_idx" ON "shifts" USING btree ("is_active");