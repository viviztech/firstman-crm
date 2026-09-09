CREATE TYPE "public"."quote_client_response" AS ENUM('pending', 'approved', 'negotiating');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'quote_responded';--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "client_response" "quote_client_response" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "client_response_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "client_response_note" text;