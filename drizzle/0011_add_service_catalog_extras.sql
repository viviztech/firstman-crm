CREATE TYPE "public"."service_relation_type" AS ENUM('upsell', 'renewal', 'prerequisite');--> statement-breakpoint
CREATE TABLE "service_price_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"service_id" uuid NOT NULL,
	"base_price_paise" integer NOT NULL,
	"govt_fee_paise" integer
);
--> statement-breakpoint
CREATE TABLE "service_relations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"service_id" uuid NOT NULL,
	"related_service_id" uuid NOT NULL,
	"relation_type" "service_relation_type" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_price_history" ADD CONSTRAINT "service_price_history_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_relations" ADD CONSTRAINT "service_relations_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_relations" ADD CONSTRAINT "service_relations_related_service_id_services_id_fk" FOREIGN KEY ("related_service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_price_history_service_id_idx" ON "service_price_history" USING btree ("service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "service_relations_pair_idx" ON "service_relations" USING btree ("service_id","related_service_id");--> statement-breakpoint
CREATE INDEX "service_relations_service_id_idx" ON "service_relations" USING btree ("service_id");