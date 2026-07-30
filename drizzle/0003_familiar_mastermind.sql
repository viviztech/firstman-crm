CREATE TYPE "public"."document_kind" AS ENUM('pan_card', 'aadhaar', 'photo', 'address_proof', 'moa_aoa', 'certificate', 'other');--> statement-breakpoint
CREATE TYPE "public"."document_owner_type" AS ENUM('client', 'order');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('pending', 'received', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'docs_awaited', 'in_progress', 'govt_processing', 'on_hold', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."order_task_status" AS ENUM('pending', 'in_progress', 'done', 'blocked');--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"owner_type" "document_owner_type" NOT NULL,
	"owner_id" uuid NOT NULL,
	"kind" "document_kind" NOT NULL,
	"label" text NOT NULL,
	"file_name" text,
	"path" text,
	"mime_type" text,
	"size_bytes" integer,
	"status" "document_status" DEFAULT 'pending' NOT NULL,
	"reject_reason" text,
	"uploaded_by" text
);
--> statement-breakpoint
CREATE TABLE "order_tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"order_id" uuid NOT NULL,
	"title" text NOT NULL,
	"assigned_to" text,
	"due_at" timestamp with time zone,
	"status" "order_task_status" DEFAULT 'pending' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"order_no" text NOT NULL,
	"client_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"quoted_price_paise" integer NOT NULL,
	"govt_fee_paise" integer,
	"assigned_to" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_tasks" ADD CONSTRAINT "order_tasks_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_tasks" ADD CONSTRAINT "order_tasks_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "documents_owner_idx" ON "documents" USING btree ("owner_type","owner_id");--> statement-breakpoint
CREATE INDEX "documents_status_idx" ON "documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "order_tasks_order_id_idx" ON "order_tasks" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_order_no_idx" ON "orders" USING btree ("order_no");--> statement-breakpoint
CREATE INDEX "orders_client_id_idx" ON "orders" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "orders_assigned_to_idx" ON "orders" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_due_at_idx" ON "orders" USING btree ("due_at");