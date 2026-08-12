CREATE TABLE "service_verticals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"name" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_categories" ADD COLUMN "vertical_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_vertical_id_service_verticals_id_fk" FOREIGN KEY ("vertical_id") REFERENCES "public"."service_verticals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_categories_vertical_id_idx" ON "service_categories" USING btree ("vertical_id");