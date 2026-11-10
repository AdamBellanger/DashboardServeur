import { services } from "@/content/services";
import {
  exactAlternation,
  isPrometheusConfigured,
  queryByLabel,
  queryRange,
  queryRangeByLabel,
  queryValue,
} from "@/lib/prometheus";

export const BAND_DAYS = 90;
export const DAY = 86_400;

const ALIGN = 900;

// Periods the charts can cover. Each one draws 85 to 97 points, so a curve
// looks the same whatever the period.
export const RANGES = {
  "24h": { seconds: DAY, step: 900, resolution: "5m" },
  "7d": { seconds: 7 * DAY, step: 7200, resolution: "5m" },
  "30d": { seconds: 30 * DAY, step: 28_800, resolution: "15m" },
} as const;
export type RangeKey = keyof typeof RANGES;
export const DEFAULT_RANGE: RangeKey = "24h";
export const isRangeKey = (value: string | null | undefined): value is RangeKey =>
  value != null && Object.hasOwn(RANGES, value);

/** Aligned start/end/step of a period, ending now. */
export function seriesWindow(range: RangeKey, now = Math.floor(Date.now() / 1000)) {
  const { seconds, step } = RANGES[range];
  // Aligned timestamps keep the query URLs, hence the fetch cache, stable.
  // Always on 15 min, whatever the step: a 30-day chart still ends "now", not
  // up to 8 hours ago.
  const end = Math.floor(now / ALIGN) * ALIGN;
  return { start: end - seconds, end, step };
}

/**
 * Expression to chart over a period. Beyond 24 h a point stands for hours:
 * it gets the mean over its whole step, not a sample taken at its timestamp.
 */
export function charted(expr: string, range: RangeKey) {
  const { step, resolution } = RANGES[range];
  return range === "24h" ? expr : `avg_over_time((${expr})[${step}s:${resolution}])`;
}

export type ServiceAvailability = {
  /** One 0–1 ratio per day, oldest first; null where Prometheus has no data. */
  bands: (number | null)[];
  uptime30: number | null;
  uptime90: number | null;
  /** Days with data among the 90 (Prometheus retention, monitor age). */
  days: number;
  /** Mean response time over 24 h, in ms. */
  latency24h: number | null;
};

export type ServerMetrics = {
  cpu: number | null;
  ram: number | null;
  disk: number | null;
  uptimeSeconds: number | null;
  cpuSeries: (number | null)[];
  ramSeries: (number | null)[];
  latencySeries: (number | null)[];
};

/** What /api/metrics returns and the dashboard renders. */
export type MetricsPayload = {
  /** false when Prometheus is unconfigured or didn't answer. */
  reachable: boolean;
  /** Unix seconds of the last daily band (each band covers the 24 h before it). */
  bandsEnd: number;
  availability: Record<string, ServiceAvailability>;
  server: ServerMetrics;
};

// Node Exporter selector: optional extra matchers from the environment, for
// a Prometheus that scrapes several hosts.
export function node(metric: string, matchers: string[] = []) {
  const extra = process.env.PROMETHEUS_NODE_SELECTOR?.trim();
  const all = [...matchers, ...(extra ? [extra] : [])];
  return all.length ? `${metric}{${all.join(",")}}` : metric;
}

export const ROOT_FS = ['mountpoint="/"', 'fstype!~"tmpfs|overlay"'];

const Q = {
  cpu: `1 - avg(rate(${node("node_cpu_seconds_total", ['mode="idle"'])}[5m]))`,
  ram: `1 - sum(${node("node_memory_MemAvailable_bytes")}) / sum(${node("node_memory_MemTotal_bytes")})`,
  disk: `1 - sum(${node("node_filesystem_avail_bytes", ROOT_FS)}) / sum(${node("node_filesystem_size_bytes", ROOT_FS)})`,
  uptime: `time() - max(${node("node_boot_time_seconds")})`,
};

const mean = (values: (number | null)[]) => {
  const known = values.filter((v): v is number => v !== null);
  return known.length ? known.reduce((a, b) => a + b, 0) / known.length : null;
};

/** `range` only changes the three series; everything else is "now" or fixed (bands, 24 h latency). */
export async function getMetrics(range: RangeKey = DEFAULT_RANGE): Promise<MetricsPayload> {
  const now = Math.floor(Date.now() / 1000);
  // Aligned timestamps keep the query URLs, hence the fetch cache, stable.
  const bandsEnd = Math.floor(now / 3600) * 3600;
  const bandsRange = { start: bandsEnd - (BAND_DAYS - 1) * DAY, end: bandsEnd, step: DAY };
  const seriesRange = seriesWindow(range, now);

  const empty: MetricsPayload = {
    reachable: false,
    bandsEnd,
    availability: {},
    server: { cpu: null, ram: null, disk: null, uptimeSeconds: null, cpuSeries: [], ramSeries: [], latencySeries: [] },
  };
  if (!isPrometheusConfigured()) return empty;

  // Uptime Kuma's /metrics: monitor_status is 1 up, 0 down, 2 pending,
  // 3 maintenance. Only "down" counts against availability.
  const monitors = `monitor_name=~"${exactAlternation(services.map((s) => s.monitor))}"`;

  const [bands, latency, latencySeries, cpu, ram, disk, uptime, cpuSeries, ramSeries] = await Promise.all([
    queryRangeByLabel(
      `avg by (monitor_name) (avg_over_time((monitor_status{${monitors}} != bool 0)[1d:5m]))`,
      "monitor_name",
      bandsRange,
    ),
    queryByLabel(
      `avg by (monitor_name) (avg_over_time((monitor_response_time{${monitors}} > 0)[24h:5m]))`,
      "monitor_name",
    ),
    queryRange(charted(`avg(monitor_response_time{${monitors}} > 0)`, range), seriesRange),
    queryValue(Q.cpu),
    queryValue(Q.ram),
    queryValue(Q.disk),
    queryValue(Q.uptime),
    queryRange(charted(Q.cpu, range), seriesRange),
    queryRange(charted(Q.ram, range), seriesRange),
  ]);

  const availability: Record<string, ServiceAvailability> = {};
  for (const service of services) {
    const days = bands?.get(service.monitor) ?? Array.from({ length: BAND_DAYS }, () => null);
    availability[service.key] = {
      bands: days,
      uptime30: mean(days.slice(-30)),
      uptime90: mean(days),
      days: days.filter((d) => d !== null).length,
      latency24h: latency?.get(service.monitor) ?? null,
    };
  }

  return {
    // Range/label queries return an empty result, not null, when Prometheus
    // answers without data: null on all of them means it's unreachable.
    reachable: [bands, latency, latencySeries, cpuSeries, ramSeries].some((r) => r !== null),
    bandsEnd,
    availability,
    server: {
      cpu,
      ram,
      disk,
      uptimeSeconds: uptime,
      cpuSeries: cpuSeries ?? [],
      ramSeries: ramSeries ?? [],
      latencySeries: latencySeries ?? [],
    },
  };
}
