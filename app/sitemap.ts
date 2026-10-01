import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { site } from "@/content/site";
import { listIncidents } from "@/lib/db/queries";
import { href, locales, type Route } from "@/lib/i18n";

// Every page in both languages, each entry listing its translations
// (hreflang). Built per request: incidents live in the database, which isn't
// reachable at build time.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const entry = (route: Route, slug: string | undefined, priority: number, changeFrequency: "daily" | "weekly" | "monthly") =>
    locales.map((locale) => ({
      url: `${site.url}${href(locale, route, slug)}`,
      changeFrequency,
      priority,
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [l, `${site.url}${href(l, route, slug)}`])),
      },
    }));

  const incidents = (await listIncidents("fr")) ?? [];
  return [
    ...entry("home", undefined, 1, "daily"),
    ...entry("incidents", undefined, 0.8, "weekly"),
    ...entry("about", undefined, 0.6, "monthly"),
    ...incidents.flatMap((incident) => entry("incidents", incident.slug, 0.7, "monthly")),
  ];
}
