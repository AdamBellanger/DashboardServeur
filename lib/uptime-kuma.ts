// Server-side client for Uptime Kuma's public status page API. It needs no
// token: it reads the same JSON as the public page /status/<slug>, so only the
// monitors placed on that status page are visible.
//
//   GET /api/status-page/<slug>            → groups and their monitors
//   GET /api/status-page/heartbeat/<slug>  → recent heartbeats + 24 h uptime

export type MonitorState = "up" | "down" | "pending" | "maintenance" | "unknown";

export type Monitor = {
  id: number;
  name: string;
  state: MonitorState;
  /** Response time of the latest heartbeat, in ms. */
  ping: number | null;
  /** 0–1 ratio over the last 24 h, as computed by Uptime Kuma. */
  uptime24h: number | null;
  lastCheck: string | null;
};

type StatusPageResponse = {
  publicGroupList?: { name: string; monitorList?: { id: number; name: string }[] }[];
};

type HeartbeatResponse = {
  heartbeatList?: Record<string, { status: number; time: string; ping: number | null }[]>;
  uptimeList?: Record<string, number>;
};

const STATES: Record<number, MonitorState> = { 0: "down", 1: "up", 2: "pending", 3: "maintenance" };

/** Uptime Kuma is polled at most every 30 s, whatever the traffic. */
const REVALIDATE = 30;

async function getJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, {
    next: { revalidate: REVALIDATE },
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json().catch(() => null)) as T | null;
}

/**
 * Every monitor on the status page, keyed by name. null when Uptime Kuma is
 * not configured or doesn't answer, so callers can say "unknown" instead of
 * pretending everything is fine.
 */
export async function getMonitors(): Promise<Map<string, Monitor> | null> {
  const base = process.env.UPTIME_KUMA_URL?.replace(/\/+$/, "");
  const slug = process.env.UPTIME_KUMA_STATUS_SLUG;
  if (!base || !slug) return null;

  const [page, beats] = await Promise.all([
    getJson<StatusPageResponse>(`${base}/api/status-page/${encodeURIComponent(slug)}`),
    getJson<HeartbeatResponse>(`${base}/api/status-page/heartbeat/${encodeURIComponent(slug)}`),
  ]);
  if (!page?.publicGroupList || !beats) return null;

  const monitors = new Map<string, Monitor>();
  for (const group of page.publicGroupList) {
    for (const { id, name } of group.monitorList ?? []) {
      // Heartbeats come oldest first.
      const latest = beats.heartbeatList?.[String(id)]?.at(-1);
      monitors.set(name, {
        id,
        name,
        state: latest ? (STATES[latest.status] ?? "unknown") : "unknown",
        ping: latest?.ping ?? null,
        uptime24h: beats.uptimeList?.[`${id}_24`] ?? null,
        lastCheck: latest?.time ?? null,
      });
    }
  }
  return monitors;
}
