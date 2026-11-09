import { getDashboard } from "@/lib/dashboard";

/**
 * Everything the bento dashboard polls: the home page metrics plus extra
 * Node Exporter figures. Upstream queries are cached 60 s (lib/prometheus.ts).
 */
export async function GET() {
  return Response.json(await getDashboard());
}
