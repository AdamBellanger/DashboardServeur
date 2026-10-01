"use client";

import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { SplitText } from "@/components/ui/SplitText";
import { Sparkline } from "@/components/status/Sparkline";
import { UptimeBands } from "@/components/status/UptimeBands";
import { StatusDot, monitorTone, overallTone } from "@/components/status/StatusDot";
import { usePolled } from "@/components/status/usePolled";
import { getDictionary } from "@/content/i18n/ui";
import { services } from "@/content/services";
import { formatDuration, formatNumber, formatPercent, formatTime } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import type { MetricsPayload } from "@/lib/metrics";
import type { StatusPayload } from "@/lib/status";

// Hero glow follows the overall state, very faintly.
const GLOW: Record<string, string> = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  down: "var(--down)",
  muted: "var(--accent)",
  accent: "var(--accent)",
};

const label = "font-mono text-[10px] uppercase tracking-widest text-muted";

export function Dashboard({
  locale,
  initialStatus,
  initialMetrics,
  ongoing,
}: {
  locale: Locale;
  initialStatus: StatusPayload;
  initialMetrics: MetricsPayload;
  /** Unresolved incidents from the database. */
  ongoing: { title: string; href: string }[];
}) {
  const dict = getDictionary(locale);
  const t = dict.home;
  const status = usePolled("/api/status", initialStatus, 30_000);
  const metrics = usePolled("/api/metrics", initialMetrics, 60_000);
  const tone = overallTone(status.state);
  const pct = (v: number | null, digits = 2) => (v === null ? "—" : formatPercent(v, locale, digits));
  const ms = (v: number | null) => (v === null ? "—" : `${formatNumber(v, locale)} ms`);
  const latencyNow = metrics.server.latencySeries.findLast((v) => v !== null) ?? null;

  return (
    <>
      {/* ---- Verdict ---- */}
      <section className="relative flex min-h-[88vh] flex-col justify-end overflow-hidden px-6 pb-14 pt-40 sm:px-10">
        <div
          aria-hidden
          className="absolute inset-0 transition-[background] duration-1000"
          style={{
            background: `radial-gradient(ellipse 60% 55% at 50% 45%, color-mix(in srgb, ${GLOW[tone]} 16%, transparent), transparent 70%)`,
          }}
        />

        <Reveal delay={0.35} className="absolute right-6 top-32 z-10 sm:right-10">
          <div className="flex flex-col items-end gap-4 text-right">
            <span aria-hidden className="font-display text-2xl text-accent">
              ↘
            </span>
            <p className="font-display text-xl leading-tight sm:text-2xl">
              {t.aside[0]}
              <br />
              {t.aside[1]}
            </p>
          </div>
        </Reveal>

        <div className="relative z-10 mx-auto w-full max-w-6xl">
          <Reveal>
            <p className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-muted">
              <StatusDot tone={tone} pulse={status.reachable} />
              {t.eyebrow} · {t.checkedAt} {formatTime(status.checkedAt, locale)}
            </p>
          </Reveal>
          <SplitText
            key={status.state}
            text={dict.verdict[status.state]}
            className="mt-6 font-display text-[16vw] font-medium leading-[0.95] tracking-tight sm:text-[10vw]"
          />
          <Reveal delay={0.5}>
            <div className="mt-10 flex flex-col gap-4 border-t border-foreground/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted">
                {status.reachable ? t.servicesUp(status.up, status.total) : t.kumaDown}
              </p>
              {ongoing.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {ongoing.map((incident) => (
                    <li key={incident.href}>
                      <Link
                        href={incident.href}
                        data-cursor={dict.incidents.read}
                        className="group flex items-center gap-3 text-sm transition-colors hover:text-accent"
                      >
                        <StatusDot tone="warn" pulse />
                        <span className="font-mono text-[10px] uppercase tracking-widest text-warn">
                          {t.ongoing}
                        </span>
                        <span className="transition-transform duration-300 group-hover:translate-x-1">
                          {incident.title} →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <div className="theme-light">
        {/* ---- Services ---- */}
        <section className="mx-auto w-full max-w-6xl px-6 pt-28 sm:px-10 sm:pt-36">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SplitText as="h2" inView delay={0} text={t.services} className="font-display text-6xl sm:text-8xl" />
            <p className={label}>{t.availability}</p>
          </div>

          <ul className="mt-12 flex flex-col border-b border-foreground/10">
            {services.map((service, i) => {
              const live = status.services.find((s) => s.key === service.key);
              const state = live?.state ?? "unknown";
              const availability = metrics.availability[service.key];
              const bands = availability?.bands ?? [];
              return (
                <Reveal as="li" key={service.key} delay={Math.min(i, 6) * 0.05} className="border-t border-foreground/10 py-8">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <div className="flex items-center gap-4">
                        <StatusDot tone={monitorTone(state)} pulse={state === "up"} className="h-2.5 w-2.5" />
                        <h3 className="font-display text-3xl sm:text-4xl">{service.name}</h3>
                      </div>
                      <p className="mt-2 pl-[26px] text-sm text-muted">
                        {service.host && <span className="font-mono">{service.host}</span>}
                        {service.host && " · "}
                        {service.description[locale]}
                      </p>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 pl-[26px] text-sm sm:grid-cols-4 lg:pl-0">
                      {[
                        { term: t.state, value: dict.monitor[state] },
                        { term: t.uptime30, value: pct(availability?.uptime30 ?? null) },
                        { term: t.uptime90, value: pct(availability?.uptime90 ?? null) },
                        { term: t.latency, value: ms(availability?.latency24h ?? live?.ping ?? null) },
                      ].map(({ term, value }) => (
                        <div key={term} className="min-w-[5rem]">
                          <dt className={label}>{term}</dt>
                          <dd className="mt-1 whitespace-nowrap">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  {bands.length > 0 && (
                    <div className="mt-6">
                      <UptimeBands
                        bands={bands}
                        end={metrics.bandsEnd}
                        label={t.bandsLabel(service.name)}
                        noData={t.noData}
                        locale={locale}
                      />
                      <div className={`mt-2 flex justify-between ${label}`}>
                        <span>
                          <span className="hidden sm:inline">{t.bandsStart90}</span>
                          <span className="sm:hidden">{t.bandsStart30}</span>
                        </span>
                        {availability && availability.days < bands.length && (
                          <span>{availability.days > 0 ? t.coverage(availability.days) : t.noData}</span>
                        )}
                        <span>{t.bandsToday}</span>
                      </div>
                    </div>
                  )}
                </Reveal>
              );
            })}
          </ul>
        </section>

        {/* ---- Server ---- */}
        <section className="mx-auto w-full max-w-6xl px-6 pt-28 sm:px-10 sm:pt-36">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SplitText as="h2" inView delay={0} text={t.server} className="font-display text-6xl sm:text-8xl" />
            <p className={label}>{t.last24h}</p>
          </div>
          <Reveal>
            <p className="mt-6 max-w-lg text-lg text-muted">{t.serverIntro}</p>
          </Reveal>

          {!metrics.reachable ? (
            <Reveal>
              <p className="mt-12 border-t border-foreground/10 pt-8 text-muted">{t.metricsDown}</p>
            </Reveal>
          ) : (
            <>
              <div className="mt-12 grid grid-cols-2 gap-x-8 lg:grid-cols-4">
                {[
                  { name: t.cpu, value: pct(metrics.server.cpu, 0), series: metrics.server.cpuSeries },
                  { name: t.ram, value: pct(metrics.server.ram, 0), series: metrics.server.ramSeries },
                  { name: t.disk, value: pct(metrics.server.disk, 0), meter: metrics.server.disk },
                  {
                    name: t.uptime,
                    value:
                      metrics.server.uptimeSeconds !== null
                        ? formatDuration(metrics.server.uptimeSeconds * 1000, locale)
                        : "—",
                  },
                ].map((tile, i) => (
                  <Reveal
                    key={tile.name}
                    delay={i * 0.05}
                    className="flex flex-col gap-4 border-t border-foreground/10 py-8"
                  >
                    <p className={label}>{tile.name}</p>
                    <p className="font-display text-5xl tracking-tight sm:text-6xl">{tile.value}</p>
                    {"series" in tile && tile.series && <Sparkline values={tile.series} domain={[0, 1]} />}
                    {"meter" in tile && (
                      <div className="mt-auto h-10 pt-6">
                        <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/10">
                          <div
                            className="h-full rounded-full bg-accent transition-[width] duration-700"
                            style={{ width: `${Math.round((tile.meter ?? 0) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </Reveal>
                ))}
              </div>

              <Reveal className="border-t border-foreground/10 py-8">
                <div className="flex items-baseline justify-between gap-4">
                  <p className={label}>{t.latency}</p>
                  <p className="font-mono text-sm">{ms(latencyNow)}</p>
                </div>
                <Sparkline values={metrics.server.latencySeries} className="mt-4 h-20 w-full text-accent" />
              </Reveal>
            </>
          )}
        </section>
      </div>
    </>
  );
}
