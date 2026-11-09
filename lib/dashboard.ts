import { DAY, getMetrics, node, ROOT_FS, SERIES_STEP, type MetricsPayload } from "@/lib/metrics";
import { isPrometheusConfigured, queryRange, queryValue } from "@/lib/prometheus";

// Extra Node Exporter figures for the bento dashboard (/dashboard), on top of
// what the home page already shows (lib/metrics.ts). Same rules: server-side
// only, cached 60 s by lib/prometheus.ts, null wherever there's no data.

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

export type DashboardPayload = { metrics: MetricsPayload; system: SystemStats };

// Physical/public interfaces only: loopback, Docker bridges/veths and VPN
// tunnels would count the same traffic twice.
const NIC = 'device!~"lo|veth.*|docker.*|br-.*|virbr.*|cali.*|flannel.*|cni.*|tun.*|wg.*"';

const rootFs = (metric: string) => `sum(${node(metric, ROOT_FS)})`;
const rx = `sum(rate(${node("node_network_receive_bytes_total", [NIC])}[5m]))`;
const tx = `sum(rate(${node("node_network_transmit_bytes_total", [NIC])}[5m]))`;
const diskUsed = `(${rootFs("node_filesystem_size_bytes")} - ${rootFs("node_filesystem_avail_bytes")})`;

const Q = {
  cores: `count(count by (cpu) (${node("node_cpu_seconds_total", ['mode="idle"'])}))`,
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

async function getSystemStats(): Promise<SystemStats> {
  if (!isPrometheusConfigured()) return EMPTY;
  const now = Math.floor(Date.now() / 1000);
  const end = Math.floor(now / SERIES_STEP) * SERIES_STEP;
  const range = { start: end - DAY, end, step: SERIES_STEP };

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
      queryRange(Q.rx, range),
      queryRange(Q.tx, range),
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

export async function getDashboard(): Promise<DashboardPayload> {
  const [metrics, system] = await Promise.all([getMetrics(), getSystemStats()]);
  return { metrics, system };
}
