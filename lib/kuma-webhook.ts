import { and, eq, ne } from "drizzle-orm";
import { services } from "@/content/services";
import { getDb } from "@/lib/db";
import { incidents, incidentTranslations } from "@/lib/db/schema";

// Automatic incidents from Uptime Kuma's "Webhook" notification: a DOWN opens
// an incident for the service, the next UP resolves it. The write-up stays
// generic on purpose; the analysis is added by hand afterwards.

/** Body of Uptime Kuma's webhook (application/json preset). */
export type KumaWebhookPayload = {
  heartbeat?: { status?: number; time?: string } | null;
  monitor?: { name?: string } | null;
  msg?: string;
};

export type WebhookResult =
  | { action: "test" | "ignored" | "already-open" | "nothing-open" }
  | { action: "opened" | "resolved"; slug: string };

const DOWN = 0;
const UP = 1;
const MAX_CLOCK_SKEW_MS = 10 * 60_000;

/**
 * Heartbeat time. Uptime Kuma sends "YYYY-MM-DD HH:mm:ss.SSS" in UTC; the
 * webhook fires right away, so anything far from now (other format, other
 * timezone) falls back to the reception time.
 */
function eventTime(raw: string | undefined): Date {
  const now = new Date();
  if (!raw) return now;
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(raw) ? raw : `${raw.replace(" ", "T")}Z`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) || Math.abs(parsed.getTime() - now.getTime()) > MAX_CLOCK_SKEW_MS
    ? now
    : parsed;
}

/** 2026-10-01-polytrack-0907 (Paris time). */
function slugFor(key: string, at: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}-${key}-${parts.hour}${parts.minute}`;
}

function texts(name: string) {
  return {
    fr: {
      title: `${name} injoignable`,
      summary: `Les sondes Uptime Kuma ont détecté que ${name} ne répondait plus. Incident ouvert automatiquement.`,
      bodyMd: `## Détection

Les sondes Uptime Kuma ont détecté que **${name}** ne répondait plus. Cet incident a été ouvert automatiquement, sans intervention humaine.

## Suivi

Le début et la fin sont relevés par les sondes. L'analyse (cause, correctifs) est ajoutée à la main ensuite.`,
    },
    en: {
      title: `${name} unreachable`,
      summary: `Uptime Kuma probes detected that ${name} stopped responding. Incident opened automatically.`,
      bodyMd: `## Detection

Uptime Kuma probes detected that **${name}** stopped responding. This incident was opened automatically, without human intervention.

## Follow-up

Start and end times are recorded by the probes. The analysis (cause, fixes) is added by hand afterwards.`,
    },
  };
}

export async function handleKumaEvent(payload: KumaWebhookPayload): Promise<WebhookResult> {
  // "Test" button in Uptime Kuma: no monitor, no heartbeat.
  if (!payload.monitor || !payload.heartbeat) return { action: "test" };

  // Only public services get public incidents: an internal monitor wired to
  // the same notification must not show up on the status page.
  const service = services.find((s) => s.monitor === payload.monitor?.name);
  const status = payload.heartbeat.status;
  if (!service || (status !== DOWN && status !== UP)) return { action: "ignored" };

  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not set");
  const at = eventTime(payload.heartbeat.time);
  const open = and(eq(incidents.kumaMonitor, service.monitor), ne(incidents.status, "resolved"));

  if (status === UP) {
    const [resolved] = await db
      .update(incidents)
      .set({ status: "resolved", resolvedAt: at })
      .where(open)
      .returning({ slug: incidents.slug });
    return resolved ? { action: "resolved", slug: resolved.slug } : { action: "nothing-open" };
  }

  return db.transaction(async (tx) => {
    // Repeated DOWN while an incident is already open: nothing to do. The
    // partial unique index backs this up against concurrent notifications.
    const [existing] = await tx.select({ id: incidents.id }).from(incidents).where(open).limit(1);
    if (existing) return { action: "already-open" as const };

    // Down → up → down within the same minute would reuse the slug: suffix it.
    const base = slugFor(service.key, at);
    let created: { id: string; slug: string } | undefined;
    for (let attempt = 1; !created && attempt <= 5; attempt++) {
      [created] = await tx
        .insert(incidents)
        .values({
          slug: attempt === 1 ? base : `${base}-${attempt}`,
          severity: "major",
          status: "investigating",
          startedAt: at,
          services: [service.key],
          tags: [],
          kumaMonitor: service.monitor,
        })
        .onConflictDoNothing()
        .returning({ id: incidents.id, slug: incidents.slug });
    }
    if (!created) return { action: "already-open" as const };
    const { slug } = created;

    const t = texts(service.name);
    await tx.insert(incidentTranslations).values([
      { incidentId: created.id, locale: "fr", ...t.fr },
      { incidentId: created.id, locale: "en", ...t.en },
    ]);
    return { action: "opened" as const, slug };
  });
}
