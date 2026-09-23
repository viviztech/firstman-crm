ALTER TYPE "public"."notification_type" ADD VALUE 'leave_submitted';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'leave_decided';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'leave_cancelled';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'leave_upcoming';--> statement-breakpoint
CREATE TABLE "leave_carry_forward_states" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"employee_user_id" text NOT NULL,
	"leave_type_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"granted_half_days" integer DEFAULT 0 NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_entitlement_states" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"policy_assignment_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"granted_half_days" integer DEFAULT 0 NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leave_carry_forward_states" ADD CONSTRAINT "leave_carry_forward_states_employee_user_id_user_id_fk" FOREIGN KEY ("employee_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_carry_forward_states" ADD CONSTRAINT "leave_carry_forward_states_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_entitlement_states" ADD CONSTRAINT "leave_entitlement_states_policy_assignment_id_leave_policy_assignments_id_fk" FOREIGN KEY ("policy_assignment_id") REFERENCES "public"."leave_policy_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "leave_carry_forward_states_employee_type_year_idx" ON "leave_carry_forward_states" USING btree ("employee_user_id","leave_type_id","year");--> statement-breakpoint
CREATE UNIQUE INDEX "leave_entitlement_states_policy_year_idx" ON "leave_entitlement_states" USING btree ("policy_assignment_id","year");