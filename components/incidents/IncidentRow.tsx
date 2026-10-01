import Link from "next/link";
import { StatusDot, severityTone } from "@/components/status/StatusDot";
import { getDictionary } from "@/content/i18n/ui";
import { formatShortDate } from "@/lib/format";
import { href, type Locale } from "@/lib/i18n";

/** Serializable subset of an incident, for lists (client components included). */
export type IncidentSummary = {
  slug: string;
  severity: string;
  status: string;
  startedAt: string;
  tags: string[];
  title: string;
  summary: string;
};

/** One entry of the changelog-style feed: date, title + summary, severity. */
export function IncidentRow({ incident, locale }: { incident: IncidentSummary; locale: Locale }) {
  const t = getDictionary(locale);
  const ongoing = incident.status !== "resolved";
  return (
    <Link
      href={href(locale, "incidents", incident.slug)}
      data-cursor={t.incidents.read}
      className="group grid grid-cols-1 gap-3 border-t border-foreground/10 py-8 sm:grid-cols-[9rem_1fr_auto] sm:gap-8"
    >
      <time dateTime={incident.startedAt} className="pt-2 font-mono text-xs text-muted">
        {formatShortDate(incident.startedAt, locale)}
      </time>
      <div>
        <h3 className="font-display text-3xl transition-all duration-300 group-hover:translate-x-2 group-hover:text-accent sm:text-4xl">
          {incident.title}
        </h3>
        <p className="mt-3 max-w-2xl text-foreground/80">{incident.summary}</p>
        {incident.tags.length > 0 && (
          <p className="mt-4 flex flex-wrap gap-2">
            {incident.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-foreground/15 px-3 py-1 text-xs text-muted">
                {t.tags[tag] ?? tag}
              </span>
            ))}
          </p>
        )}
      </div>
      <div className="flex flex-row gap-6 pt-2 font-mono text-[10px] uppercase tracking-widest sm:flex-col sm:items-end sm:gap-2">
        <span className="flex items-center gap-2">
          <StatusDot tone={severityTone(incident.severity)} />
          {t.severity[incident.severity] ?? incident.severity}
        </span>
        <span className={`flex items-center gap-2 ${ongoing ? "text-warn" : "text-muted"}`}>
          {ongoing && <StatusDot tone="warn" pulse />}
          {t.incidentStatus[incident.status] ?? incident.status}
        </span>
      </div>
    </Link>
  );
}
