CREATE TABLE "districts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"state_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pincodes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"pincode" text NOT NULL,
	"district_id" uuid NOT NULL,
	"state_id" uuid NOT NULL,
	"city" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "states" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"name" text NOT NULL,
	"gst_code" text,
	"is_union_territory" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pincodes" ADD CONSTRAINT "pincodes_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pincodes" ADD CONSTRAINT "pincodes_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "districts_state_name_idx" ON "districts" USING btree ("state_id","name");--> statement-breakpoint
CREATE INDEX "districts_state_id_idx" ON "districts" USING btree ("state_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pincodes_pincode_idx" ON "pincodes" USING btree ("pincode");--> statement-breakpoint
CREATE INDEX "pincodes_district_id_idx" ON "pincodes" USING btree ("district_id");--> statement-breakpoint
CREATE INDEX "pincodes_state_id_idx" ON "pincodes" USING btree ("state_id");--> statement-breakpoint
CREATE UNIQUE INDEX "states_name_idx" ON "states" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "states_gst_code_idx" ON "states" USING btree ("gst_code");