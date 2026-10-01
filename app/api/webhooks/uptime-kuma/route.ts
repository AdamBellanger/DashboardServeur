import { timingSafeEqual } from "node:crypto";
import { handleKumaEvent, type KumaWebhookPayload } from "@/lib/kuma-webhook";

/**
 * Target of Uptime Kuma's "Webhook" notification. Opens an incident when a
 * public service goes DOWN, resolves it when it comes back UP.
 *
 * Auth: Uptime Kuma sends `Authorization: Bearer <UPTIME_KUMA_WEBHOOK_SECRET>`
 * (notification → Additional Headers). Without the variable the endpoint is off.
 */
export async function POST(request: Request) {
  const secret = process.env.UPTIME_KUMA_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "not found" }, { status: 404 });

  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as KumaWebhookPayload | null;
  if (!payload || typeof payload !== "object") {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  try {
    return Response.json(await handleKumaEvent(payload));
  } catch (error) {
    console.error("[webhook] uptime-kuma failed:", error);
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
