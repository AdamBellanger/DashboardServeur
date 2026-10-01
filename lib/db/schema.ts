import { sql } from "drizzle-orm";
import { index, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const severity = pgEnum("incident_severity", ["minor", "major", "critical"]);
export const incidentStatus = pgEnum("incident_status", ["investigating", "monitoring", "resolved"]);
export const locale = pgEnum("locale", ["fr", "en"]);

export const incidents = pgTable(
  "incidents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    severity: severity("severity").notNull(),
    status: incidentStatus("status").notNull().default("investigating"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    /** null while the incident is open, or when the end date is unknown. */
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    /** Keys from content/services.ts (or infra components: server, ssh…). */
    services: text("services").array().notNull().default(sql`'{}'::text[]`),
    /** network | security | application | hardware */
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    /**
     * Uptime Kuma monitor that opened this incident through the webhook
     * (app/api/webhooks/uptime-kuma); null for incidents written by hand.
     */
    kumaMonitor: text("kuma_monitor"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("incidents_started_at_idx").on(t.startedAt),
    // At most one open automatic incident per monitor, even if Uptime Kuma
    // sends the same DOWN notification twice.
    uniqueIndex("incidents_open_kuma_monitor_idx")
      .on(t.kumaMonitor)
      .where(sql`${t.kumaMonitor} is not null and ${t.status} <> 'resolved'`),
  ],
);

// One row per language: adding a language needs no migration, and a missing
// translation falls back to French (see queries.ts).
export const incidentTranslations = pgTable(
  "incident_translations",
  {
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    locale: locale("locale").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    /** Detailed timeline, in Markdown (GFM). */
    bodyMd: text("body_md").notNull(),
  },
  (t) => [primaryKey({ columns: [t.incidentId, t.locale] })],
);
