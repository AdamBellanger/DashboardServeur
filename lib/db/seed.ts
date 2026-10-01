// Loads lib/db/seed-data.ts into the database.
//
//   npm run db:seed            insert new incidents, leave existing ones alone
//   npm run db:seed -- --sync  also overwrite existing ones from seed-data.ts
//
// Relative imports only: this runs under plain Node + tsx, outside Next.js.
import { eq, sql } from "drizzle-orm";
import { getDb } from "./index";
import { incidents, incidentTranslations } from "./schema";
import { seedIncidents } from "./seed-data";

const sync = process.argv.includes("--sync");

async function main() {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not set");

  for (const item of seedIncidents) {
    if (!item.startedAt) {
      console.warn(`! ${item.slug}: no startedAt yet, skipped`);
      continue;
    }

    const values = {
      slug: item.slug,
      severity: item.severity,
      status: item.status,
      startedAt: new Date(item.startedAt),
      resolvedAt: item.resolvedAt ? new Date(item.resolvedAt) : null,
      services: item.services,
      tags: item.tags,
    };

    const [inserted] = await db
      .insert(incidents)
      .values(values)
      .onConflictDoNothing({ target: incidents.slug })
      .returning({ id: incidents.id });

    let id = inserted?.id;
    if (!id) {
      if (!sync) {
        console.log(`= ${item.slug}: already in the database (use --sync to overwrite)`);
        continue;
      }
      const [updated] = await db
        .update(incidents)
        .set(values)
        .where(eq(incidents.slug, item.slug))
        .returning({ id: incidents.id });
      id = updated.id;
    }

    await db
      .insert(incidentTranslations)
      .values(
        (["fr", "en"] as const).map((locale) => ({
          incidentId: id,
          locale,
          title: item[locale].title,
          summary: item[locale].summary,
          bodyMd: item[locale].body,
        })),
      )
      .onConflictDoUpdate({
        target: [incidentTranslations.incidentId, incidentTranslations.locale],
        set: {
          title: sql`excluded.title`,
          summary: sql`excluded.summary`,
          bodyMd: sql`excluded.body_md`,
        },
      });

    console.log(`${inserted ? "+" : "~"} ${item.slug}`);
  }

  await db.$client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
