CREATE TYPE "public"."staff_team" AS ENUM('sales', 'operations');--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD COLUMN "team" "staff_team";