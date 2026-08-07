CREATE TYPE "public"."enquiry_followup_channel" AS ENUM('call', 'whatsapp', 'email', 'meeting');--> statement-breakpoint
CREATE TYPE "public"."enquiry_followup_handoff" AS ENUM('self', 'one_time', 'permanent');--> statement-breakpoint
CREATE TYPE "public"."enquiry_source" AS ENUM('whatsapp', 'website', 'meta_ads', 'google', 'referral', 'walk_in', 'other');--> statement-breakpoint
CREATE TYPE "public"."enquiry_status" AS ENUM('new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost');--> statement-breakpoint
CREATE TABLE "enquiries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"address" text,
	"city" text,
	"pincode" text,
	"source" "enquiry_source" NOT NULL,
	"service_interested_id" uuid,
	"status" "enquiry_status" DEFAULT 'new' NOT NULL,
	"lost_reason" text,
	"assigned_to" text,
	"referral_partner_id" uuid,
	"next_follow_up_at" timestamp with time zone,
	"next_follow_up_assigned_to" text,
	"notes" text,
	"converted_client_id" uuid,
	"converted_order_id" uuid
);
--> statement-breakpoint
CREATE TABLE "enquiry_followups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"enquiry_id" uuid NOT NULL,
	"user_id" text,
	"channel" "enquiry_followup_channel" NOT NULL,
	"summary" text NOT NULL,
	"followed_up_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_follow_up_at" timestamp with time zone,
	"handoff_type" "enquiry_followup_handoff" DEFAULT 'self' NOT NULL,
	"handoff_to" text
);
--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_service_interested_id_services_id_fk" FOREIGN KEY ("service_interested_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_referral_partner_id_referral_partners_id_fk" FOREIGN KEY ("referral_partner_id") REFERENCES "public"."referral_partners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_next_follow_up_assigned_to_user_id_fk" FOREIGN KEY ("next_follow_up_assigned_to") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_converted_client_id_clients_id_fk" FOREIGN KEY ("converted_client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_converted_order_id_orders_id_fk" FOREIGN KEY ("converted_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiry_followups" ADD CONSTRAINT "enquiry_followups_enquiry_id_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiry_followups" ADD CONSTRAINT "enquiry_followups_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiry_followups" ADD CONSTRAINT "enquiry_followups_handoff_to_user_id_fk" FOREIGN KEY ("handoff_to") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "enquiries_phone_idx" ON "enquiries" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "enquiries_assigned_to_idx" ON "enquiries" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "enquiries_next_follow_up_assigned_to_idx" ON "enquiries" USING btree ("next_follow_up_assigned_to");--> statement-breakpoint
CREATE INDEX "enquiries_status_idx" ON "enquiries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "enquiries_next_follow_up_at_idx" ON "enquiries" USING btree ("next_follow_up_at");--> statement-breakpoint
CREATE INDEX "enquiries_pincode_idx" ON "enquiries" USING btree ("pincode");--> statement-breakpoint
CREATE INDEX "enquiry_followups_enquiry_id_idx" ON "enquiry_followups" USING btree ("enquiry_id");