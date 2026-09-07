CREATE TABLE "service_state_prices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"service_id" uuid NOT NULL,
	"state_id" uuid NOT NULL,
	"fee_components" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"quote_no" text NOT NULL,
	"enquiry_id" uuid NOT NULL,
	"client_name" text NOT NULL,
	"client_phone" text NOT NULL,
	"client_email" text,
	"service_id" uuid,
	"service_name" text NOT NULL,
	"state_name" text,
	"line_items" jsonb NOT NULL,
	"total_paise" integer NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "service_state_prices" ADD CONSTRAINT "service_state_prices_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_state_prices" ADD CONSTRAINT "service_state_prices_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_enquiry_id_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "service_state_prices_service_state_idx" ON "service_state_prices" USING btree ("service_id","state_id");--> statement-breakpoint
CREATE INDEX "service_state_prices_service_id_idx" ON "service_state_prices" USING btree ("service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_quote_no_idx" ON "quotes" USING btree ("quote_no");--> statement-breakpoint
CREATE INDEX "quotes_enquiry_id_idx" ON "quotes" USING btree ("enquiry_id");