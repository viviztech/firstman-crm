DROP INDEX "clients_phone_idx";--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "cin" text;--> statement-breakpoint
CREATE UNIQUE INDEX "clients_phone_unique_idx" ON "clients" USING btree ("phone") WHERE "clients"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "clients_email_unique_idx" ON "clients" USING btree ("email") WHERE "clients"."email" is not null and "clients"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "clients_cin_unique_idx" ON "clients" USING btree ("cin") WHERE "clients"."cin" is not null and "clients"."deleted_at" is null;