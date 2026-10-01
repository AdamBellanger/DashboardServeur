import type { Metadata } from "next";
import { connection } from "next/server";
import { IncidentList } from "@/components/incidents/IncidentList";
import { Reveal } from "@/components/ui/Reveal";
import { SplitText } from "@/components/ui/SplitText";
import { getDictionary } from "@/content/i18n/ui";
import { listIncidents, toSummary } from "@/lib/db/queries";
import { alternates, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/incidents">): Promise<Metadata> {
  const locale = (await params).lang as Locale;
  const t = getDictionary(locale);
  return {
    title: `${t.meta.incidents} — Status`,
    description: t.incidents.intro,
    alternates: alternates(locale, "incidents"),
  };
}

export default async function IncidentsPage({ params }: PageProps<"/[lang]/incidents">) {
  await connection();
  const locale = (await params).lang as Locale;
  const t = getDictionary(locale).incidents;
  const incidents = await listIncidents(locale);

  return (
    <div className="theme-light flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 pb-32 pt-40 sm:px-10 sm:pt-48">
        <SplitText text={t.title} className="font-display text-6xl sm:text-8xl" />
        <Reveal delay={0.3}>
          <p className="max-w-xl text-lg text-muted">{t.intro}</p>
        </Reveal>

        {incidents === null ? (
          <p className="mt-8 border-t border-foreground/10 pt-8 text-muted">{t.unavailable}</p>
        ) : incidents.length === 0 ? (
          <p className="mt-8 border-t border-foreground/10 pt-8 text-muted">{t.empty}</p>
        ) : (
          <IncidentList incidents={incidents.map(toSummary)} locale={locale} />
        )}
      </section>
    </div>
  );
}
