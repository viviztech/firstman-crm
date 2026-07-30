CREATE TYPE "public"."message_channel" AS ENUM('whatsapp', 'email');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "message_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"channel" "message_channel" NOT NULL,
	"to" text NOT NULL,
	"template" text,
	"payload" jsonb,
	"status" "message_status" NOT NULL,
	"error" text,
	"entity_type" text,
	"entity_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "whatsapp_opted_out" boolean DEFAULT false NOT NULL;