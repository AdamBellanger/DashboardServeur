import { services } from "@/content/services";
import {
  charted,
  DAY,
  DEFAULT_RANGE,
  getMetrics,
  node,
  ROOT_FS,
  seriesWindow,
  type MetricsPayload,
  type RangeKey,
} from "@/lib/metrics";
import { exactAlternation, isPrometheusConfigured, queryByLabel, queryRange, queryValue } from "@/lib/prometheus";

// Extra figures for the bento dashboard (/dashboard), on top of what the home
// page already shows (lib/metrics.ts): Node Exporter, the TLS certificates
// seen by Uptime Kuma, and cAdvisor's per-container usage. Same rules:
// server-side only, cached 60 s by lib/prometheus.ts, null or empty wherever
// there's no data.

export type SystemStats = {
  cores: number | null;
  load1: number | null;
  load5: number | null;
  load15: number | null;
  memUsedBytes: number | null;
  memTotalBytes: number | null;
  diskUsedBytes: number | null;
  diskTotalBytes: number | null;
  /** Disk filling speed over the last 3 days, bytes per day; null under a day of history. */
  diskGrowthPerDay: number | null;
  /** Bytes per second, now (5 min average). */
  netRx: number | null;
  netTx: number | null;
  /** Bytes transferred over the last 24 h. */
  netRx24h: number | null;
  netTx24h: number | null;
  rxSeries: (number | null)[];
  txSeries: (number | null)[];
  tcpConnections: number | null;
};

/** TLS certificate of a public service, as checked by its Uptime Kuma monitor. */
export type Certificate = {
  /** Key from content/services.ts. */
  key: string;
  daysRemaining: number;
  /** null when Uptime Kuma doesn't say. */
  valid: boolean | null;
};

export type ContainerUsage = {
  name: string;
  /** Share of the whole machine's CPU, 0–1 (5 min average). */
  cpu: number | null;
  memBytes: number | null;
};

export type DashboardPayload = {
  range: RangeKey;
  metrics: MetricsPayload;
  system: SystemStats;
  /** Only the services whose monitor checks a certificate; empty without data. */
  certificates: Certificate[];
  /** Biggest memory users first; empty when cAdvisor isn't scraped. */
  containers: ContainerUsage[];
};

// Physical/public interfaces only: loopback, Docker bridges/veths and VPN
// tunnels would count the same traffic twice.
const NIC = 'device!~"lo|veth.*|docker.*|br-.*|virbr.*|cali.*|flannel.*|cni.*|tun.*|wg.*"';

const rootFs = (metric: string) => `sum(${node(metric, ROOT_FS)})`;
const rx = `sum(rate(${node("node_network_receive_bytes_total", [NIC])}[5m]))`;
const tx = `sum(rate(${node("node_network_transmit_bytes_total", [NIC])}[5m]))`;
const diskUsed = `(${rootFs("node_filesystem_size_bytes")} - ${rootFs("node_filesystem_avail_bytes")})`;
const coreCount = `count(count by (cpu) (${node("node_cpu_seconds_total", ['mode="idle"'])}))`;

// cAdvisor selector: Docker containers only (name!=""), plus optional extra
// matchers to choose which ones are public, e.g. name=~"status|portfolio".
function container(metric: string) {
  const extra = process.env.PROMETHEUS_CONTAINER_SELECTOR?.trim();
  return `${metric}{${['name!=""', ...(extra ? [extra] : [])].join(",")}}`;
}

const Q = {
  cores: coreCount,
  load1: `max(${node("node_load1")})`,
  load5: `max(${node("node_load5")})`,
  load15: `max(${node("node_load15")})`,
  memTotal: `sum(${node("node_memory_MemTotal_bytes")})`,
  memUsed: `sum(${node("node_memory_MemTotal_bytes")}) - sum(${node("node_memory_MemAvailable_bytes")})`,
  diskTotal: rootFs("node_filesystem_size_bytes"),
  diskUsed,
  // Slope of the used space over 3 days (hourly points), only once there are
  // at least 24 of them: a few minutes of history would give a wild figure.
  diskGrowth: `(deriv(${diskUsed}[3d:1h]) * ${DAY}) and on() (count_over_time(${diskUsed}[3d:1h]) >= 24)`,
  rx,
  tx,
  rx24h: `sum(increase(${node("node_network_receive_bytes_total", [NIC])}[24h]))`,
  tx24h: `sum(increase(${node("node_network_transmit_bytes_total", [NIC])}[24h]))`,
  tcp: `sum(${node("node_netstat_Tcp_CurrEstab")})`,
  // Cores used by each container, divided by the machine's core count.
  containerCpu: `sum by (name) (rate(${container("container_cpu_usage_seconds_total")}[5m])) / scalar(${coreCount})`,
  containerMem: `sum by (name) (${container("container_memory_working_set_bytes")})`,
};

const EMPTY: SystemStats = {
  cores: null,
  load1: null,
  load5: null,
  load15: null,
  memUsedBytes: null,
  memTotalBytes: null,
  diskUsedBytes: null,
  diskTotalBytes: null,
  diskGrowthPerDay: null,
  netRx: null,
  netTx: null,
  netRx24h: null,
  netTx24h: null,
  rxSeries: [],
  txSeries: [],
  tcpConnections: null,
};

async function getSystemStats(range: RangeKey): Promise<SystemStats> {
  if (!isPrometheusConfigured()) return EMPTY;
  const window = seriesWindow(range);

  const [cores, load1, load5, load15, memTotal, memUsed, diskTotal, diskUsedNow, diskGrowth, rxNow, txNow, rx24h, tx24h, tcp, rxSeries, txSeries] =
    await Promise.all([
      queryValue(Q.cores),
      queryValue(Q.load1),
      queryValue(Q.load5),
      queryValue(Q.load15),
      queryValue(Q.memTotal),
      queryValue(Q.memUsed),
      queryValue(Q.diskTotal),
      queryValue(Q.diskUsed),
      queryValue(Q.diskGrowth),
      queryValue(Q.rx),
      queryValue(Q.tx),
      queryValue(Q.rx24h),
      queryValue(Q.tx24h),
      queryValue(Q.tcp),
      queryRange(charted(Q.rx, range), window),
      queryRange(charted(Q.tx, range), window),
    ]);

  return {
    cores,
    load1,
    load5,
    load15,
    memUsedBytes: memUsed,
    memTotalBytes: memTotal,
    diskUsedBytes: diskUsedNow,
    diskTotalBytes: diskTotal,
    diskGrowthPerDay: diskGrowth,
    netRx: rxNow,
    netTx: txNow,
    netRx24h: rx24h,
    netTx24h: tx24h,
    rxSeries: rxSeries ?? [],
    txSeries: txSeries ?? [],
    tcpConnections: tcp,
  };
}

// Uptime Kuma's /metrics: monitor_cert_days_remaining and monitor_cert_is_valid
// exist for HTTPS monitors with certificate expiry checks on (the default).
async function getCertificates(): Promise<Certificate[]> {
  if (!isPrometheusConfigured()) return [];
  const monitors = `monitor_name=~"${exactAlternation(services.map((s) => s.monitor))}"`;
  const [days, valid] = await Promise.all([
    queryByLabel(`min by (monitor_name) (monitor_cert_days_remaining{${monitors}})`, "monitor_name"),
    queryByLabel(`min by (monitor_name) (monitor_cert_is_valid{${monitors}})`, "monitor_name"),
  ]);
  if (!days) return [];
  return services.flatMap((service) => {
    const daysRemaining = days.get(service.monitor);
    if (daysRemaining === undefined) return [];
    const ok = valid?.get(service.monitor);
    return [{ key: service.key, daysRemaining, valid: ok === undefined ? null : ok === 1 }];
  });
}

async function getContainers(): Promise<ContainerUsage[]> {
  if (!isPrometheusConfigured()) return [];
  const [cpu, mem] = await Promise.all([queryByLabel(Q.containerCpu, "name"), queryByLabel(Q.containerMem, "name")]);
  const names = new Set([...(mem?.keys() ?? []), ...(cpu?.keys() ?? [])]);
  return [...names]
    .map((name) => ({ name, cpu: cpu?.get(name) ?? null, memBytes: mem?.get(name) ?? null }))
    .sort((a, b) => (b.memBytes ?? 0) - (a.memBytes ?? 0) || a.name.localeCompare(b.name));
}

export async function getDashboard(range: RangeKey = DEFAULT_RANGE): Promise<DashboardPayload> {
  const [metrics, system, certificates, containers] = await Promise.all([
    getMetrics(range),
    getSystemStats(range),
    getCertificates(),
    getContainers(),
  ]);
  return { range, metrics, system, certificates, containers };
}
