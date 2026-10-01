import { getMetrics } from "@/lib/metrics";

/**
 * Availability bands and server metrics, proxied from Prometheus. Upstream
 * queries are cached 60 s (lib/prometheus.ts).
 */
export async function GET() {
  return Response.json(await getMetrics());
}
