CREATE TYPE "public"."franchise_level" AS ENUM('state', 'parliamentary', 'assembly', 'area');
--> statement-breakpoint
CREATE TABLE "parliamentary_constituencies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"state_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"source_url" text,
	"source_version" text
);
--> statement-breakpoint
CREATE TABLE "assembly_constituencies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"state_id" uuid NOT NULL,
	"parliamentary_constituency_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"source_url" text,
	"source_version" text
);
--> statement-breakpoint
CREATE TABLE "pincode_constituencies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"pincode" text NOT NULL,
	"assembly_constituency_id" uuid NOT NULL,
	"source_url" text,
	"source_version" text,
	"is_manual_override" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "franchise_territories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"user_id" text NOT NULL,
	"level" "franchise_level" NOT NULL,
	"territory_key" text NOT NULL,
	"state_id" uuid NOT NULL,
	"parliamentary_constituency_id" uuid,
	"assembly_constituency_id" uuid,
	"pincode" text,
	"basic_rate_bps" integer NOT NULL,
	"additional_rate_bps" integer DEFAULT 1000 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "franchise_territories_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "franchise_territories_territory_key_unique" UNIQUE("territory_key"),
	CONSTRAINT "franchise_territory_shape_check" CHECK (
		("level" = 'state' AND "parliamentary_constituency_id" IS NULL AND "assembly_constituency_id" IS NULL AND "pincode" IS NULL) OR
		("level" = 'parliamentary' AND "parliamentary_constituency_id" IS NOT NULL AND "assembly_constituency_id" IS NULL AND "pincode" IS NULL) OR
		("level" = 'assembly' AND "parliamentary_constituency_id" IS NULL AND "assembly_constituency_id" IS NOT NULL AND "pincode" IS NULL) OR
		("level" = 'area' AND "parliamentary_constituency_id" IS NULL AND "assembly_constituency_id" IS NULL AND "pincode" ~ '^[0-9]{6}$')
	),
	CONSTRAINT "franchise_rates_check" CHECK ("basic_rate_bps" BETWEEN 0 AND 10000 AND "additional_rate_bps" BETWEEN 0 AND 10000)
);
--> statement-breakpoint
ALTER TABLE "parliamentary_constituencies" ADD CONSTRAINT "parliamentary_constituencies_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE restrict;
ALTER TABLE "assembly_constituencies" ADD CONSTRAINT "assembly_constituencies_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE restrict;
ALTER TABLE "assembly_constituencies" ADD CONSTRAINT "assembly_constituencies_pc_id_fk" FOREIGN KEY ("parliamentary_constituency_id") REFERENCES "public"."parliamentary_constituencies"("id") ON DELETE restrict;
ALTER TABLE "pincode_constituencies" ADD CONSTRAINT "pincode_constituencies_ac_id_fk" FOREIGN KEY ("assembly_constituency_id") REFERENCES "public"."assembly_constituencies"("id") ON DELETE restrict;
ALTER TABLE "franchise_territories" ADD CONSTRAINT "franchise_territories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict;
ALTER TABLE "franchise_territories" ADD CONSTRAINT "franchise_territories_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE restrict;
ALTER TABLE "franchise_territories" ADD CONSTRAINT "franchise_territories_pc_id_fk" FOREIGN KEY ("parliamentary_constituency_id") REFERENCES "public"."parliamentary_constituencies"("id") ON DELETE restrict;
ALTER TABLE "franchise_territories" ADD CONSTRAINT "franchise_territories_ac_id_fk" FOREIGN KEY ("assembly_constituency_id") REFERENCES "public"."assembly_constituencies"("id") ON DELETE restrict;
CREATE UNIQUE INDEX "parliamentary_constituencies_state_code_idx" ON "parliamentary_constituencies" USING btree ("state_id", "code");
CREATE UNIQUE INDEX "parliamentary_constituencies_state_name_idx" ON "parliamentary_constituencies" USING btree ("state_id", "name");
CREATE UNIQUE INDEX "assembly_constituencies_state_code_idx" ON "assembly_constituencies" USING btree ("state_id", "code");
CREATE UNIQUE INDEX "assembly_constituencies_state_name_idx" ON "assembly_constituencies" USING btree ("state_id", "name");
CREATE INDEX "assembly_constituencies_pc_idx" ON "assembly_constituencies" USING btree ("parliamentary_constituency_id");
CREATE UNIQUE INDEX "pincode_constituencies_pincode_idx" ON "pincode_constituencies" USING btree ("pincode");
CREATE INDEX "pincode_constituencies_assembly_idx" ON "pincode_constituencies" USING btree ("assembly_constituency_id");
CREATE INDEX "franchise_territories_state_idx" ON "franchise_territories" USING btree ("state_id");
CREATE INDEX "franchise_territories_pc_idx" ON "franchise_territories" USING btree ("parliamentary_constituency_id");
CREATE INDEX "franchise_territories_ac_idx" ON "franchise_territories" USING btree ("assembly_constituency_id");
CREATE INDEX "franchise_territories_pincode_idx" ON "franchise_territories" USING btree ("pincode");
