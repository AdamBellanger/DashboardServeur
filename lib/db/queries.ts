import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { incidents, incidentTranslations } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n";

export type Incident = {
  slug: string;
  severity: "minor" | "major" | "critical";
  status: "investigating" | "monitoring" | "resolved";
  startedAt: Date;
  resolvedAt: Date | null;
  services: string[];
  tags: string[];
  title: string;
  summary: string;
  bodyMd: string;
};

/**
 * Every incident, newest first, in the requested language (French when a
 * translation is missing). Throws when the database is unavailable.
 */
async function loadAll(locale: Locale): Promise<Incident[]> {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not set");

  const rows = await db
    .select({ incident: incidents, translation: incidentTranslations })
    .from(incidents)
    .innerJoin(incidentTranslations, eq(incidentTranslations.incidentId, incidents.id))
    .where(inArray(incidentTranslations.locale, [locale, "fr"]))
    .orderBy(desc(incidents.startedAt));

  const bySlug = new Map<string, Incident>();
  for (const { incident, translation } of rows) {
    const existing = bySlug.get(incident.slug);
    if (existing && translation.locale !== locale) continue;
    bySlug.set(incident.slug, {
      slug: incident.slug,
      severity: incident.severity,
      status: incident.status,
      startedAt: incident.startedAt,
      resolvedAt: incident.resolvedAt,
      services: incident.services,
      tags: incident.tags,
      title: translation.title,
      summary: translation.summary,
      bodyMd: translation.bodyMd,
    });
  }
  // Map keeps first-insertion order, which is the newest-first SQL order.
  return [...bySlug.values()];
}

/** Plain-data version for lists rendered by client components. */
export function toSummary(incident: Incident) {
  return {
    slug: incident.slug,
    severity: incident.severity,
    status: incident.status,
    startedAt: incident.startedAt.toISOString(),
    tags: incident.tags,
    title: incident.title,
    summary: incident.summary,
  };
}

/** All incidents, or null when the database can't be reached. */
export async function listIncidents(locale: Locale): Promise<Incident[] | null> {
  try {
    return await loadAll(locale);
  } catch (error) {
    console.error("[db] listIncidents failed:", error);
    return null;
  }
}

/**
 * One incident with its neighbours in the timeline. Errors propagate to the
 * error boundary: a detail page can't render anything useful without the DB.
 */
export async function getIncident(slug: string, locale: Locale) {
  const all = await loadAll(locale);
  const index = all.findIndex((i) => i.slug === slug);
  if (index === -1) return null;
  return {
    incident: all[index],
    newer: all[index - 1] ?? null,
    older: all[index + 1] ?? null,
  };
}
