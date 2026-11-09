import type { Incident } from "@/lib/db/queries";

// Figures for the dashboard, computed from the incident log itself: nothing
// here is typed in by hand.

export type IncidentStats = {
  total: number;
  open: number;
  last90: number;
  /** Mean start → end time of resolved incidents with a known end, in ms. */
  meanTimeToResolve: number | null;
  resolvedWithEnd: number;
  /** ISO date since which nothing has been broken; null while one is open or when there's no history. */
  quietSince: string | null;
  bySeverity: Record<Incident["severity"], number>;
};

const DAY_MS = 86_400_000;

export function incidentStats(incidents: Incident[], now = Date.now()): IncidentStats {
  const open = incidents.filter((i) => i.status !== "resolved");
  const resolved = incidents.filter((i) => i.status === "resolved" && i.resolvedAt);
  const durations = resolved.map((i) => i.resolvedAt!.getTime() - i.startedAt.getTime()).filter((d) => d >= 0);

  // Last time something was broken: the latest end (or start, when the end
  // is unknown) among closed incidents.
  const lastEnd = incidents.reduce<number | null>((latest, i) => {
    const t = (i.resolvedAt ?? i.startedAt).getTime();
    return latest === null || t > latest ? t : latest;
  }, null);

  const bySeverity = { minor: 0, major: 0, critical: 0 };
  for (const i of incidents) bySeverity[i.severity]++;

  return {
    total: incidents.length,
    open: open.length,
    last90: incidents.filter((i) => now - i.startedAt.getTime() <= 90 * DAY_MS).length,
    meanTimeToResolve: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
    resolvedWithEnd: durations.length,
    quietSince: open.length === 0 && lastEnd !== null ? new Date(lastEnd).toISOString() : null,
    bySeverity,
  };
}
