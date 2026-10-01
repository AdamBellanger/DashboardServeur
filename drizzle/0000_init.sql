CREATE TYPE "public"."incident_status" AS ENUM('investigating', 'monitoring', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('fr', 'en');--> statement-breakpoint
CREATE TYPE "public"."incident_severity" AS ENUM('minor', 'major', 'critical');--> statement-breakpoint
CREATE TABLE "incident_translations" (
	"incident_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"body_md" text NOT NULL,
	CONSTRAINT "incident_translations_incident_id_locale_pk" PRIMARY KEY("incident_id","locale")
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"severity" "incident_severity" NOT NULL,
	"status" "incident_status" DEFAULT 'investigating' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone,
	"services" text[] DEFAULT '{}'::text[] NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"kuma_monitor" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "incidents_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "incident_translations" ADD CONSTRAINT "incident_translations_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "incidents_started_at_idx" ON "incidents" USING btree ("started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "incidents_open_kuma_monitor_idx" ON "incidents" USING btree ("kuma_monitor") WHERE "incidents"."kuma_monitor" is not null and "incidents"."status" <> 'resolved';