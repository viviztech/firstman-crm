CREATE TABLE "payroll_opening_balances" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"year" integer NOT NULL,
	"employee_user_id" text NOT NULL,
	"component_id" uuid NOT NULL,
	"amount_paise" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payroll_opening_balances" ADD CONSTRAINT "payroll_opening_balances_employee_user_id_user_id_fk" FOREIGN KEY ("employee_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_opening_balances" ADD CONSTRAINT "payroll_opening_balances_component_id_salary_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."salary_components"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_opening_balances_employee_component_year_idx" ON "payroll_opening_balances" USING btree ("employee_user_id","component_id","year");--> statement-breakpoint
CREATE INDEX "payroll_opening_balances_year_idx" ON "payroll_opening_balances" USING btree ("year");