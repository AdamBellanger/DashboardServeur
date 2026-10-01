import { getStatus } from "@/lib/status";

/**
 * Live service states, proxied from Uptime Kuma. The upstream call is cached
 * 30 s (lib/uptime-kuma.ts), so polling clients never reach Uptime Kuma more
 * often than that.
 */
export async function GET() {
  return Response.json(await getStatus());
}
