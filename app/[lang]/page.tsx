import Link from "next/link";
import { connection } from "next/server";
import { Dashboard } from "@/components/status/Dashboard";
import { IncidentRow } from "@/components/incidents/IncidentRow";
import { Reveal } from "@/components/ui/Reveal";
import { SplitText } from "@/components/ui/SplitText";
import { Magnetic } from "@/components/ui/Magnetic";
import { getDictionary } from "@/content/i18n/ui";
import { listIncidents, toSummary } from "@/lib/db/queries";
import { getMetrics } from "@/lib/metrics";
import { getStatus } from "@/lib/status";
import { href, type Locale } from "@/lib/i18n";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  // Live data: never prerendered at build time (no database or monitoring there).
  await connection();
  const locale = (await params).lang as Locale;
  const t = getDictionary(locale);
  const [status, metrics, incidents] = await Promise.all([getStatus(), getMetrics(), listIncidents(locale)]);
  const ongoing = (incidents ?? [])
    .filter((i) => i.status !== "resolved")
    .map((i) => ({ title: i.title, href: href(locale, "incidents", i.slug) }));

  return (
    <>
      <Dashboard locale={locale} initialStatus={status} initialMetrics={metrics} ongoing={ongoing} />

      <div className="theme-light">
        <section className="mx-auto w-full max-w-6xl px-6 pb-32 pt-28 sm:px-10 sm:pt-36">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SplitText as="h2" inView delay={0} text={t.home.recent} className="font-display text-6xl sm:text-8xl" />
          </div>

          {incidents === null ? (
            <p className="mt-12 border-t border-foreground/10 pt-8 text-muted">{t.incidents.unavailable}</p>
          ) : incidents.length === 0 ? (
            <p className="mt-12 border-t border-foreground/10 pt-8 text-muted">{t.incidents.empty}</p>
          ) : (
            <div className="mt-12 flex flex-col border-b border-foreground/10">
              {incidents.slice(0, 3).map((incident, i) => (
                <Reveal key={incident.slug} delay={i * 0.05}>
                  <IncidentRow incident={toSummary(incident)} locale={locale} />
                </Reveal>
              ))}
            </div>
          )}

          <Reveal className="mt-12">
            <Magnetic strength={0.25} className="inline-block">
              <Link
                href={href(locale, "incidents")}
                className="inline-flex rounded-full border border-foreground/20 px-8 py-4 transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
              >
                {t.home.allIncidents} →
              </Link>
            </Magnetic>
          </Reveal>
        </section>
      </div>
    </>
  );
}
