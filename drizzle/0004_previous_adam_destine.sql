CREATE TYPE "public"."compliance_recurrence" AS ENUM('none', 'monthly', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."compliance_status" AS ENUM('upcoming', 'due_soon', 'filed', 'overdue', 'na');--> statement-breakpoint
CREATE TABLE "compliance_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"client_id" uuid NOT NULL,
	"service_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"due_date" timestamp with time zone NOT NULL,
	"recurrence" "compliance_recurrence" DEFAULT 'none' NOT NULL,
	"status" "compliance_status" DEFAULT 'upcoming' NOT NULL,
	"filed_at" timestamp with time zone,
	"order_id" uuid
);
--> statement-breakpoint
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "compliance_items_client_id_idx" ON "compliance_items" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "compliance_items_due_date_idx" ON "compliance_items" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "compliance_items_status_idx" ON "compliance_items" USING btree ("status");