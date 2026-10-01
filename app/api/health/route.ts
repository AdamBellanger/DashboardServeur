// Docker healthcheck target: answers as long as the Next.js server runs,
// whatever the state of Uptime Kuma, Prometheus or PostgreSQL. Otherwise an
// outage of a monitored tool would get this container restarted for nothing.
export function GET() {
  return Response.json({ ok: true });
}
