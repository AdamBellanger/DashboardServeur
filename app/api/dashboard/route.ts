import { getDashboard } from "@/lib/dashboard";
import { DEFAULT_RANGE, isRangeKey } from "@/lib/metrics";

/**
 * Everything the bento dashboard polls: the home page metrics plus extra
 * Node Exporter figures, certificates and containers. `?range=24h|7d|30d`
 * picks the period of the charts (anything else falls back to 24 h).
 * Upstream queries are cached 60 s (lib/prometheus.ts).
 */
export async function GET(request: Request) {
  const range = new URL(request.url).searchParams.get("range");
  return Response.json(await getDashboard(isRangeKey(range) ? range : DEFAULT_RANGE));
}
