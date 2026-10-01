export type Tone = "ok" | "warn" | "down" | "muted" | "accent";

const TONE: Record<Tone, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  down: "bg-down",
  muted: "bg-muted",
  accent: "bg-accent",
};

/** The site's only status glyph: a dot, pulsing when something is live. */
export function StatusDot({
  tone,
  pulse = false,
  className = "h-2 w-2",
}: {
  tone: Tone;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span aria-hidden className={`relative inline-flex shrink-0 ${className}`}>
      {pulse && (
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping ${TONE[tone]}`}
        />
      )}
      <span className={`relative inline-flex h-full w-full rounded-full ${TONE[tone]}`} />
    </span>
  );
}

export const monitorTone = (state: string): Tone =>
  state === "up" ? "ok" : state === "down" ? "down" : state === "unknown" ? "muted" : "warn";

export const overallTone = (state: string): Tone =>
  state === "operational" ? "ok" : state === "outage" ? "down" : state === "unknown" ? "muted" : "warn";

export const severityTone = (severity: string): Tone =>
  severity === "critical" ? "down" : severity === "major" ? "warn" : "muted";
