CREATE TYPE "public"."payroll_period_status" AS ENUM('draft', 'calculated', 'approved', 'posted', 'paid');--> statement-breakpoint
CREATE TYPE "public"."payroll_validation_status" AS ENUM('valid', 'warning');--> statement-breakpoint
CREATE TYPE "public"."salary_calculation_mode" AS ENUM('fixed', 'percent_of_basic');--> statement-breakpoint
CREATE TYPE "public"."salary_component_type" AS ENUM('earning', 'deduction', 'reimbursement', 'employer_contribution');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'payslip_published';--> statement-breakpoint
CREATE TABLE "employee_salary_assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"employee_user_id" text NOT NULL,
	"structure_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date
);
--> statement-breakpoint
CREATE TABLE "payroll_adjustments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"period_id" uuid NOT NULL,
	"employee_user_id" text NOT NULL,
	"component_id" uuid NOT NULL,
	"amount_paise" integer NOT NULL,
	"reason" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"period_id" uuid NOT NULL,
	"employee_user_id" text NOT NULL,
	"employee_code" text NOT NULL,
	"employee_name" text NOT NULL,
	"designation_name" text,
	"structure_name" text NOT NULL,
	"eligible_half_days" integer NOT NULL,
	"paid_half_days" integer NOT NULL,
	"gross_paise" integer NOT NULL,
	"deductions_paise" integer NOT NULL,
	"reimbursements_paise" integer NOT NULL,
	"net_pay_paise" integer NOT NULL,
	"employer_contributions_paise" integer NOT NULL,
	"total_cost_paise" integer NOT NULL,
	"validation_status" "payroll_validation_status" DEFAULT 'valid' NOT NULL,
	"validation_messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"input_snapshot" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_entry_lines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"entry_id" uuid NOT NULL,
	"component_code" text NOT NULL,
	"component_name" text NOT NULL,
	"component_type" "salary_component_type" NOT NULL,
	"amount_paise" integer NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_periods" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"period_month" date NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" "payroll_period_status" DEFAULT 'draft' NOT NULL,
	"calculation_version" integer DEFAULT 1 NOT NULL,
	"calculated_at" timestamp with time zone,
	"calculated_by" text,
	"approved_at" timestamp with time zone,
	"approved_by" text,
	"posted_at" timestamp with time zone,
	"posted_by" text,
	"paid_at" timestamp with time zone,
	"paid_by" text,
	"finance_expense_id" uuid
);
--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"entry_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"sha256" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_components" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" "salary_component_type" NOT NULL,
	"calculation_mode" "salary_calculation_mode" DEFAULT 'fixed' NOT NULL,
	"taxable" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_structure_lines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"structure_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"amount_paise" integer,
	"rate_basis_points" integer
);
--> statement-breakpoint
CREATE TABLE "salary_structures" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employee_salary_assignments" ADD CONSTRAINT "employee_salary_assignments_employee_user_id_user_id_fk" FOREIGN KEY ("employee_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_salary_assignments" ADD CONSTRAINT "employee_salary_assignments_structure_id_salary_structures_id_fk" FOREIGN KEY ("structure_id") REFERENCES "public"."salary_structures"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_period_id_payroll_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."payroll_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_employee_user_id_user_id_fk" FOREIGN KEY ("employee_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_component_id_salary_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."salary_components"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_period_id_payroll_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."payroll_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_employee_user_id_user_id_fk" FOREIGN KEY ("employee_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entry_lines" ADD CONSTRAINT "payroll_entry_lines_entry_id_payroll_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."payroll_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_calculated_by_user_id_fk" FOREIGN KEY ("calculated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_posted_by_user_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_paid_by_user_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_finance_expense_id_expenses_id_fk" FOREIGN KEY ("finance_expense_id") REFERENCES "public"."expenses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_entry_id_payroll_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."payroll_entries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_structure_lines" ADD CONSTRAINT "salary_structure_lines_structure_id_salary_structures_id_fk" FOREIGN KEY ("structure_id") REFERENCES "public"."salary_structures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_structure_lines" ADD CONSTRAINT "salary_structure_lines_component_id_salary_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."salary_components"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "employee_salary_assignments_employee_from_idx" ON "employee_salary_assignments" USING btree ("employee_user_id","effective_from");--> statement-breakpoint
CREATE INDEX "employee_salary_assignments_structure_idx" ON "employee_salary_assignments" USING btree ("structure_id");--> statement-breakpoint
CREATE INDEX "payroll_adjustments_period_employee_idx" ON "payroll_adjustments" USING btree ("period_id","employee_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_entries_period_employee_idx" ON "payroll_entries" USING btree ("period_id","employee_user_id");--> statement-breakpoint
CREATE INDEX "payroll_entry_lines_entry_idx" ON "payroll_entry_lines" USING btree ("entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_periods_month_idx" ON "payroll_periods" USING btree ("period_month");--> statement-breakpoint
CREATE UNIQUE INDEX "payslips_entry_idx" ON "payslips" USING btree ("entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "salary_components_code_idx" ON "salary_components" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "salary_structure_lines_structure_component_idx" ON "salary_structure_lines" USING btree ("structure_id","component_id");--> statement-breakpoint
CREATE UNIQUE INDEX "salary_structures_code_idx" ON "salary_structures" USING btree ("code");