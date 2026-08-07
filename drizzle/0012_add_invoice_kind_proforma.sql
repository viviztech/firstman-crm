CREATE TYPE "public"."invoice_kind" AS ENUM('proforma', 'tax');--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "kind" "invoice_kind" DEFAULT 'tax' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "proforma_invoice_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_proforma_invoice_id_invoices_id_fk" FOREIGN KEY ("proforma_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoices_kind_idx" ON "invoices" USING btree ("kind");