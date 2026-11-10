"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { SplitText } from "@/components/ui/SplitText";
import { Sparkline } from "@/components/status/Sparkline";
import { UptimeBands } from "@/components/status/UptimeBands";
import { StatusDot, monitorTone, overallTone, severityTone } from "@/components/status/StatusDot";
import { usePolled, usePolledState } from "@/components/status/usePolled";
import { getDictionary } from "@/content/i18n/ui";
import { services } from "@/content/services";
import {
  formatBytes,
  formatDate,
  formatDuration,
  formatNumber,
  formatPercent,
  formatRate,
  formatTime,
} from "@/lib/format";
import { href, type Locale } from "@/lib/i18n";
import type { DashboardPayload } from "@/lib/dashboard";
import type { IncidentStats } from "@/lib/incident-stats";
import type { RangeKey } from "@/lib/metrics";
import type { StatusPayload } from "@/lib/status";

const label = "font-mono text-[10px] uppercase tracking-widest text-muted";
const RANGE_KEYS: RangeKey[] = ["24h", "7d", "30d"];
const MAX_CONTAINERS = 12;

/** Certificates: red in the last week (or invalid), amber in the last three. */
const certTone = (days: number, valid: boolean | null) =>
  valid === false || days <= 7 ? "down" : days <= 21 ? "warn" : "ok";
const TONE_TEXT = { down: "text-down", warn: "text-warn", ok: "" } as const;
const TONE_BG = { down: "bg-down", warn: "bg-warn", ok: "bg-accent" } as const;
const big = "font-display text-5xl tracking-tight sm:text-6xl";

function Tile({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <Reveal
      delay={delay}
      className={`relative flex flex-col gap-5 overflow-hidden rounded-3xl border border-foreground/10 bg-anthracite/50 p-6 transition-colors duration-500 hover:border-foreground/25 sm:p-7 ${className}`}
    >
      {children}
    </Reveal>
  );
}

function TileHead({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className={label}>{title}</p>
      {aside && <span className={label}>{aside}</span>}
    </div>
  );
}

function Meter({ value, tone = "bg-accent" }: { value: number | null; tone?: string }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/10">
      <div
        className={`h-full rounded-full ${tone} transition-[width] duration-700`}
        style={{ width: `${Math.round(Math.min(Math.max(value ?? 0, 0), 1) * 100)}%` }}
      />
    </div>
  );
}

/** Two series on one shared scale (inbound / outbound). */
function DualSparkline({ a, b, className = "" }: { a: (number | null)[]; b: (number | null)[]; className?: string }) {
  const max = Math.max(0, ...[...a, ...b].filter((v): v is number => v !== null));
  const domain: [number, number] = [0, max * 1.2 || 1];
  return (
    <div className={`relative h-24 w-full ${className}`}>
      <Sparkline values={b} domain={domain} className="absolute inset-0 h-full w-full text-foreground/40" />
      <Sparkline values={a} domain={domain} className="absolute inset-0 h-full w-full text-accent" />
    </div>
  );
}

const mean = (values: (number | null | undefined)[]) => {
  const known = values.filter((v): v is number => typeof v === "number");
  return known.length ? known.reduce((x, y) => x + y, 0) / known.length : null;
};

export function Bento({
  locale,
  initialStatus,
  initialDashboard,
  stats,
}: {
  locale: Locale;
  initialStatus: StatusPayload;
  initialDashboard: DashboardPayload;
  /** null when the incident database can't be reached. */
  stats: IncidentStats | null;
}) {
  const dict = getDictionary(locale);
  const t = dict.dashboard;
  const status = usePolled("/api/status", initialStatus, 30_000);
  const [range, setRange] = useState<RangeKey>(initialDashboard.range);
  const { data, stale } = usePolledState(`/api/dashboard?range=${range}`, initialDashboard, 60_000);
  const { metrics, system, certificates, containers } = data;
  // Label of the period the charts on screen cover (the previous one while loading).
  const rangeLabel = t.ranges[data.range];
  const chart = `transition-opacity duration-300 ${stale ? "opacity-30" : ""}`;
  const server = metrics.server;
  const up = metrics.reachable;

  const dash = "—";
  const pct = (v: number | null, digits = 0) => (v === null ? dash : formatPercent(v, locale, digits));
  const bytes = (v: number | null) => (v === null ? dash : formatBytes(v, locale));
  const rate = (v: number | null) => (v === null ? dash : formatRate(v, locale));
  const ms = (v: number | null) => (v === null ? dash : `${formatNumber(v, locale)} ms`);
  const num = (v: number | null, digits = 0) => (v === null ? dash : formatNumber(v, locale, digits));

  // Availability: mean of the services' 30-day uptime; the bands show, for
  // each day, the worst service, so a single bad day stands out.
  const availability = services.map((s) => metrics.availability[s.key]);
  const uptime30 = mean(availability.map((a) => a?.uptime30));
  const days = Math.max(0, ...availability.map((a) => a?.bands.length ?? 0));
  const worstBands = Array.from({ length: days }, (_, i) =>
    availability.reduce<number | null>((worst, a) => {
      const v = a?.bands[i] ?? null;
      return v === null ? worst : worst === null ? v : Math.min(worst, v);
    }, null),
  );

  const latencyNow = server.latencySeries.findLast((v) => v !== null) ?? null;
  const memRatio =
    system.memUsedBytes !== null && system.memTotalBytes ? system.memUsedBytes / system.memTotalBytes : server.ram;
  const diskRatio =
    system.diskUsedBytes !== null && system.diskTotalBytes ? system.diskUsedBytes / system.diskTotalBytes : server.disk;
  const loadRatio = system.load1 !== null && system.cores ? system.load1 / system.cores : null;
  const growth = system.diskGrowthPerDay;
  const bootedAt = server.uptimeSeconds !== null ? Date.parse(status.checkedAt) - server.uptimeSeconds * 1000 : null;
  const severityTotal = stats ? stats.bySeverity.minor + stats.bySeverity.major + stats.bySeverity.critical : 0;

  const nextCert = certificates.reduce<(typeof certificates)[number] | null>(
    (soonest, c) => (soonest === null || c.daysRemaining < soonest.daysRemaining ? c : soonest),
    null,
  );
  const certScale = Math.max(90, ...certificates.map((c) => c.daysRemaining));
  const certText = (c: (typeof certificates)[number]) =>
    c.valid === false ? t.certInvalid : c.daysRemaining < 0 ? t.certExpired : t.days(Math.floor(c.daysRemaining));
  const serviceName = (key: string) => services.find((s) => s.key === key)?.name ?? key;

  const shownContainers = containers.slice(0, MAX_CONTAINERS);
  const maxContainerMem = Math.max(0, ...containers.map((c) => c.memBytes ?? 0));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-32 pt-40 sm:px-10 sm:pt-48">
      <header className="flex flex-col gap-6 px-2 sm:px-0">
        <Reveal>
          <p className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-muted">
            <StatusDot tone={overallTone(status.state)} pulse={status.reachable} />
            {t.live} · {t.updated} {formatTime(status.checkedAt, locale)}
          </p>
        </Reveal>
        <SplitText text={t.title} className="font-display text-6xl font-medium tracking-tight sm:text-8xl" />
        <Reveal delay={0.2}>
          <p className="max-w-2xl text-xl leading-relaxed text-muted sm:text-2xl">{t.intro}</p>
        </Reveal>
        {!up && (
          <Reveal delay={0.3}>
            <p className="rounded-2xl border border-warn/30 px-5 py-4 text-sm text-warn">{t.metricsDown}</p>
          </Reveal>
        )}
      </header>

      <Reveal delay={0.3} className="mt-14 flex items-center justify-between gap-4 px-2 sm:justify-end sm:px-0">
        <p id="range-label" className={label}>
          {t.rangeLabel}
        </p>
        <div role="group" aria-labelledby="range-label" className="flex rounded-full border border-foreground/15 p-1">
          {RANGE_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={range === key}
              onClick={() => setRange(key)}
              className={`rounded-full px-4 py-1.5 font-mono text-xs transition-colors duration-300 ${
                range === key ? "bg-foreground text-background" : "text-muted hover:text-foreground"
              }`}
            >
              {t.ranges[key]}
            </button>
          ))}
        </div>
      </Reveal>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
        {/* ---- Availability ---- */}
        <Tile className="sm:col-span-2 lg:col-span-7 lg:row-span-2">
          <TileHead title={t.availability} />
          <div>
            <p className="font-display text-7xl tracking-tight sm:text-8xl">{pct(uptime30, 2)}</p>
            <p className="mt-2 text-sm text-muted">{t.availabilityHint(services.length)}</p>
          </div>
          <ul className="flex flex-col border-b border-foreground/10">
            {services.map((service) => {
              const live = status.services.find((s) => s.key === service.key);
              const state = live?.state ?? "unknown";
              const a = metrics.availability[service.key];
              return (
                <li
                  key={service.key}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-t border-foreground/10 py-3 text-sm"
                >
                  <span className="flex items-center gap-3">
                    <StatusDot tone={monitorTone(state)} pulse={state === "up"} />
                    <span>{service.name}</span>
                    <span className="hidden text-muted sm:inline">{dict.monitor[state]}</span>
                  </span>
                  <span className="font-mono text-xs text-muted">{ms(a?.latency24h ?? live?.ping ?? null)}</span>
                  <span className="w-16 text-right font-mono text-xs">{pct(a?.uptime30 ?? null, 2)}</span>
                </li>
              );
            })}
          </ul>
          {worstBands.length > 0 && (
            <div className="mt-auto">
              <UptimeBands
                bands={worstBands}
                end={metrics.bandsEnd}
                label={t.worstDay}
                noData={t.noData}
                locale={locale}
              />
              <p className={`mt-2 ${label}`}>{t.worstDay}</p>
            </div>
          )}
        </Tile>

        {/* ---- CPU ---- */}
        <Tile className="lg:col-span-5" delay={0.05}>
          <TileHead
            title={t.cpu}
            aside={system.cores !== null ? `${t.cores(system.cores)} · ${rangeLabel}` : rangeLabel}
          />
          <div className="flex items-end justify-between gap-4">
            <p className={big}>{pct(server.cpu)}</p>
            <div className="text-right">
              <p className={label}>{t.load}</p>
              <p className="mt-1 font-mono text-sm">
                {num(system.load1, 2)} · {num(system.load5, 2)} · {num(system.load15, 2)}
              </p>
            </div>
          </div>
          <Sparkline key={data.range} values={server.cpuSeries} domain={[0, 1]} className={`h-12 w-full text-accent ${chart}`} />
          <Meter value={loadRatio} tone={loadRatio !== null && loadRatio > 1 ? "bg-warn" : "bg-accent"} />
        </Tile>

        {/* ---- Memory ---- */}
        <Tile className="lg:col-span-5" delay={0.1}>
          <TileHead title={t.memory} aside={rangeLabel} />
          <div className="flex items-end justify-between gap-4">
            <p className={big}>{pct(memRatio)}</p>
            <p className="text-right font-mono text-sm">
              {bytes(system.memUsedBytes)}
              <span className="block text-xs text-muted">{t.of(bytes(system.memTotalBytes))}</span>
            </p>
          </div>
          <Sparkline key={data.range} values={server.ramSeries} domain={[0, 1]} className={`h-12 w-full text-accent ${chart}`} />
        </Tile>

        {/* ---- Disk ---- */}
        <Tile className="lg:col-span-4" delay={0.05}>
          <TileHead title={t.disk} aside={t.diskTrend} />
          <p className={big}>{pct(diskRatio)}</p>
          <p className="font-mono text-sm">
            {bytes(system.diskUsedBytes)} <span className="text-muted">{t.of(bytes(system.diskTotalBytes))}</span>
          </p>
          <div className="mt-auto flex flex-col gap-3">
            <Meter value={diskRatio} tone={diskRatio !== null && diskRatio > 0.85 ? "bg-warn" : "bg-accent"} />
            <p className="text-sm text-muted">
              {growth === null
                ? t.diskTrendPending
                : growth >= 0
                  ? t.diskGrowth(formatBytes(growth, locale))
                  : t.diskShrink(formatBytes(-growth, locale))}
            </p>
          </div>
        </Tile>

        {/* ---- Server uptime ---- */}
        <Tile className="lg:col-span-4" delay={0.1}>
          <TileHead title={t.uptime} />
          <p className={big}>
            {server.uptimeSeconds !== null ? formatDuration(server.uptimeSeconds * 1000, locale) : dash}
          </p>
          <p className="mt-auto text-sm text-muted">{bootedAt !== null ? t.bootedOn(formatDate(new Date(bootedAt), locale)) : t.noData}</p>
        </Tile>

        {/* ---- Latency ---- */}
        <Tile className="sm:col-span-2 lg:col-span-4" delay={0.15}>
          <TileHead title={t.latency} aside={rangeLabel} />
          <p className={big}>{ms(latencyNow)}</p>
          <Sparkline key={data.range} values={server.latencySeries} className={`mt-auto h-14 w-full text-accent ${chart}`} />
        </Tile>

        {/* ---- Network ---- */}
        <Tile className="sm:col-span-2 lg:col-span-7" delay={0.05}>
          <TileHead title={t.network} aside={rangeLabel} />
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { name: t.inbound, value: rate(system.netRx), dot: "bg-accent" },
              { name: t.outbound, value: rate(system.netTx), dot: "bg-foreground/40" },
              {
                name: t.volume24h,
                value: (
                  <>
                    <span className="block">{bytes(system.netRx24h)} ↓</span>
                    <span className="block text-foreground/60">{bytes(system.netTx24h)} ↑</span>
                  </>
                ),
              },
              { name: t.tcp, value: num(system.tcpConnections) },
            ].map((item) => (
              <div key={item.name}>
                <p className={`flex items-center gap-2 ${label}`}>
                  {"dot" in item && <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />}
                  {item.name}
                </p>
                <p className="mt-2 font-display text-2xl">{item.value}</p>
              </div>
            ))}
          </div>
          <DualSparkline key={data.range} a={system.rxSeries} b={system.txSeries} className={chart} />
        </Tile>

        {/* ---- Incidents ---- */}
        <Tile className="sm:col-span-2 lg:col-span-5 lg:row-span-2" delay={0.1}>
          <TileHead title={t.incidents} />
          {stats === null ? (
            <p className="text-muted">{t.dbDown}</p>
          ) : (
            <>
              {stats.open > 0 ? (
                <div>
                  <p className={`flex items-center gap-2 ${label} text-warn`}>
                    <StatusDot tone="warn" pulse /> {t.ongoing}
                  </p>
                  <p className={`mt-2 ${big} text-warn`}>{t.ongoingCount(stats.open)}</p>
                </div>
              ) : (
                <div>
                  <p className={label}>{stats.quietSince ? t.quiet : t.noHistory}</p>
                  {stats.quietSince && (
                    <p className={`mt-2 ${big}`} suppressHydrationWarning>
                      {formatDuration(Date.parse(status.checkedAt) - Date.parse(stats.quietSince), locale)}
                    </p>
                  )}
                </div>
              )}

              <dl className="grid grid-cols-3 gap-4 border-t border-foreground/10 pt-5">
                {[
                  { term: t.total, value: stats.total },
                  { term: t.last90, value: stats.last90 },
                  { term: t.open, value: stats.open },
                ].map(({ term, value }) => (
                  <div key={term}>
                    <dt className={label}>{term}</dt>
                    <dd className="mt-1 font-display text-3xl">{value}</dd>
                  </div>
                ))}
              </dl>

              {severityTotal > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex h-2 w-full gap-[2px] overflow-hidden rounded-full">
                    {(["critical", "major", "minor"] as const).map((s) =>
                      stats.bySeverity[s] > 0 ? (
                        <span
                          key={s}
                          className={`h-full ${{ down: "bg-down", warn: "bg-warn", muted: "bg-muted", ok: "bg-ok", accent: "bg-accent" }[severityTone(s)]}`}
                          style={{ width: `${(stats.bySeverity[s] / severityTotal) * 100}%` }}
                        />
                      ) : null,
                    )}
                  </div>
                  <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
                    {(["critical", "major", "minor"] as const).map((s) => (
                      <li key={s} className="flex items-center gap-2">
                        <StatusDot tone={severityTone(s)} className="h-1.5 w-1.5" />
                        {dict.severity[s]} · {stats.bySeverity[s]}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-auto flex items-end justify-between gap-4 border-t border-foreground/10 pt-5">
                <div>
                  <p className={label}>{t.mttr}</p>
                  <p className="mt-1 font-display text-2xl">
                    {stats.meanTimeToResolve !== null ? formatDuration(stats.meanTimeToResolve, locale) : dash}
                  </p>
                  {stats.resolvedWithEnd > 0 && <p className="text-xs text-muted">{t.mttrHint(stats.resolvedWithEnd)}</p>}
                </div>
                <Link
                  href={href(locale, "incidents")}
                  className="shrink-0 rounded-full border border-foreground/20 px-5 py-2.5 text-sm transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
                >
                  {t.allIncidents} →
                </Link>
              </div>
            </>
          )}
        </Tile>

        {/* ---- TLS certificates ---- */}
        <Tile className="sm:col-span-2 lg:col-span-7" delay={0.05}>
          <TileHead title={t.certificates} aside={certificates.length > 0 ? t.certSource : undefined} />
          {nextCert === null ? (
            <p className="text-muted">{t.certNoData}</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-end sm:gap-10">
              <div>
                <p className={label}>{t.certNext}</p>
                <p className={`mt-2 ${big} ${TONE_TEXT[certTone(nextCert.daysRemaining, nextCert.valid)]}`}>
                  {certText(nextCert)}
                </p>
                <p className="mt-2 text-sm text-muted">{serviceName(nextCert.key)}</p>
              </div>
              <ul className="flex flex-col border-b border-foreground/10">
                {certificates.map((cert) => {
                  const tone = certTone(cert.daysRemaining, cert.valid);
                  return (
                    <li
                      key={cert.key}
                      className="grid grid-cols-[6rem_1fr_auto] items-center gap-4 border-t border-foreground/10 py-3 text-sm"
                    >
                      <span className="truncate">{serviceName(cert.key)}</span>
                      <Meter value={cert.daysRemaining / certScale} tone={TONE_BG[tone]} />
                      <span className={`w-16 text-right font-mono text-xs ${TONE_TEXT[tone]}`}>{certText(cert)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </Tile>

        {/* ---- Containers (only when cAdvisor is scraped) ---- */}
        {containers.length > 0 && (
          <Tile className="sm:col-span-2 lg:col-span-12" delay={0.05}>
            <TileHead title={t.containers} aside={t.containersRunning(containers.length)} />
            <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
              {shownContainers.map((c) => (
                <li key={c.name} className="flex flex-col gap-2.5 border-t border-foreground/10 py-3.5">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="truncate font-mono text-sm">{c.name}</span>
                    <span className="shrink-0 font-mono text-xs text-muted">
                      {t.containerCpu(pct(c.cpu, 1))} · {bytes(c.memBytes)}
                    </span>
                  </div>
                  <Meter value={maxContainerMem > 0 && c.memBytes !== null ? c.memBytes / maxContainerMem : null} />
                </li>
              ))}
            </ul>
            <p className={label}>
              {t.containersHint}
              {containers.length > shownContainers.length &&
                ` · ${t.containersMore(containers.length - shownContainers.length)}`}
            </p>
          </Tile>
        )}
      </div>
    </div>
  );
}
