ALTER TABLE "quotes" ADD COLUMN "subtotal_paise" integer;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "gst_rate" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "gst_amount_paise" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Backfill existing rows: pre-GST quotes charged no GST, so their old total_paise *was* the
-- subtotal — preserves what was actually quoted to clients rather than rewriting history.
UPDATE "quotes" SET "subtotal_paise" = "total_paise" WHERE "subtotal_paise" IS NULL;--> statement-breakpoint
ALTER TABLE "quotes" ALTER COLUMN "subtotal_paise" SET NOT NULL;