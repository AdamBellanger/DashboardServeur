import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { Markdown } from "@/components/incidents/Markdown";
import { StatusDot, severityTone } from "@/components/status/StatusDot";
import { Reveal } from "@/components/ui/Reveal";
import { SplitText } from "@/components/ui/SplitText";
import { getDictionary } from "@/content/i18n/ui";
import { componentLabel } from "@/content/services";
import { getIncident, type Incident } from "@/lib/db/queries";
import { formatAge, formatDate, formatDuration } from "@/lib/format";
import { alternates, href, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/incidents/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const locale = lang as Locale;
  const found = await getIncident(slug, locale).catch(() => null);
  if (!found) return {};
  return {
    title: `${found.incident.title} — Status`,
    description: found.incident.summary,
    alternates: alternates(locale, "incidents", slug),
  };
}

function NeighbourLink({ incident, label, locale }: { incident: Incident; label: string; locale: Locale }) {
  return (
    <Link
      href={href(locale, "incidents", incident.slug)}
      data-cursor={getDictionary(locale).incidents.read}
      className="group flex flex-col gap-2 border-t border-foreground/10 pt-10"
    >
      <span className="font-mono text-xs uppercase tracking-widest text-muted">{label}</span>
      <span className="font-display text-4xl transition-all duration-300 group-hover:translate-x-2 group-hover:text-accent sm:text-5xl">
        {incident.title} →
      </span>
    </Link>
  );
}

export default async function IncidentPage({ params }: PageProps<"/[lang]/incidents/[slug]">) {
  await connection();
  const { lang, slug } = await params;
  const locale = lang as Locale;
  const dict = getDictionary(locale);
  const t = dict.incidents;
  const found = await getIncident(slug, locale);
  if (!found) notFound();
  const { incident, older, newer } = found;
  const resolved = incident.status === "resolved";

  // Duration only when both ends are known; an open incident shows its age.
  const meta: { term: string; value: string }[] = [
    { term: t.started, value: formatDate(incident.startedAt, locale) },
    ...(incident.resolvedAt ? [{ term: t.ended, value: formatDate(incident.resolvedAt, locale) }] : []),
    ...(incident.resolvedAt
      ? [{ term: t.duration, value: formatDuration(incident.resolvedAt.getTime() - incident.startedAt.getTime(), locale) }]
      : !resolved
        ? [{ term: t.duration, value: `${t.ongoingFor} ${formatAge(incident.startedAt, locale)}` }]
        : []),
    { term: t.status, value: dict.incidentStatus[incident.status] },
    ...(incident.services.length
      ? [{ term: t.impact, value: incident.services.map((s) => componentLabel(s, locale)).join(", ") }]
      : []),
    ...(incident.tags.length ? [{ term: t.tags, value: incident.tags.map((tag) => dict.tags[tag] ?? tag).join(", ") }] : []),
  ];

  return (
    <div className="theme-light flex flex-1 flex-col">
      <article className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-6 pb-32 pt-40 sm:px-10">
        <Reveal>
          <div className="flex items-center justify-between font-mono text-xs uppercase tracking-widest text-muted">
            <Link href={href(locale, "incidents")} className="hover:text-accent">
              {t.back}
            </Link>
            <span className="flex items-center gap-2 text-foreground">
              <StatusDot tone={severityTone(incident.severity)} pulse={!resolved} />
              {dict.severity[incident.severity]}
            </span>
          </div>
          <SplitText text={incident.title} className="mt-4 font-display text-5xl sm:text-7xl" />
          <p className="mt-4 max-w-lg text-lg text-muted">{incident.summary}</p>
        </Reveal>

        <Reveal>
          <dl className="grid grid-cols-1 border-b border-foreground/10 sm:grid-cols-2 sm:gap-x-10">
            {meta.map(({ term, value }) => (
              <div key={term} className="flex items-baseline justify-between gap-6 border-t border-foreground/10 py-3">
                <dt className="font-mono text-[11px] uppercase tracking-widest text-muted">{term}</dt>
                <dd className={`text-right ${term === t.status && !resolved ? "text-warn" : ""}`}>{value}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <Reveal>
          <Markdown>{incident.bodyMd}</Markdown>
        </Reveal>

        {(older || newer) && (
          <Reveal className="mt-8 flex flex-col gap-10">
            {older && <NeighbourLink incident={older} label={t.older} locale={locale} />}
            {newer && <NeighbourLink incident={newer} label={t.newer} locale={locale} />}
          </Reveal>
        )}
      </article>
    </div>
  );
}
