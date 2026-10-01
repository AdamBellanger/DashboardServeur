import { services } from "@/content/services";
import { getMonitors, type MonitorState } from "@/lib/uptime-kuma";

export type OverallState = "operational" | "degraded" | "outage" | "maintenance" | "unknown";

export type ServiceStatus = {
  key: string;
  state: MonitorState;
  ping: number | null;
  uptime24h: number | null;
};

/** What /api/status returns and the dashboard renders. */
export type StatusPayload = {
  state: OverallState;
  /** false when Uptime Kuma is unconfigured or didn't answer. */
  reachable: boolean;
  up: number;
  total: number;
  checkedAt: string;
  services: ServiceStatus[];
};

function overall(states: MonitorState[]): OverallState {
  const known = states.filter((s) => s !== "unknown");
  if (known.length === 0) return "unknown";
  if (known.every((s) => s === "down")) return "outage";
  if (known.some((s) => s === "down" || s === "pending")) return "degraded";
  if (known.some((s) => s === "maintenance")) return "maintenance";
  return "operational";
}

/** Live state of every public service in content/services.ts. */
export async function getStatus(): Promise<StatusPayload> {
  const monitors = await getMonitors();
  const list: ServiceStatus[] = services.map((service) => {
    const monitor = monitors?.get(service.monitor);
    return {
      key: service.key,
      state: monitor?.state ?? "unknown",
      ping: monitor?.ping ?? null,
      uptime24h: monitor?.uptime24h ?? null,
    };
  });

  return {
    state: monitors ? overall(list.map((s) => s.state)) : "unknown",
    reachable: monitors !== null,
    up: list.filter((s) => s.state === "up").length,
    total: list.length,
    checkedAt: new Date().toISOString(),
    services: list,
  };
}
