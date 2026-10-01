const W = 100;
const H = 32;

/**
 * Minimal line chart: no axes, no grid, just the shape of the last 24 h.
 * Gaps (null) break the line instead of being interpolated over.
 */
export function Sparkline({
  values,
  domain,
  className = "h-10 w-full text-accent",
}: {
  values: (number | null)[];
  /** Fixed [min, max]; defaults to 0 → 120 % of the max. */
  domain?: [number, number];
  className?: string;
}) {
  const known = values.filter((v): v is number => v !== null);
  if (known.length < 2) {
    return <div className={`${className} border-b border-dashed border-foreground/15`} />;
  }

  const [min, max] = domain ?? [0, Math.max(...known) * 1.2 || 1];
  const x = (i: number) => (i / (values.length - 1)) * W;
  const y = (v: number) => H - ((Math.min(Math.max(v, min), max) - min) / (max - min)) * H;

  let line = "";
  let area = "";
  let segmentStart: number | null = null;
  values.forEach((v, i) => {
    if (v === null) {
      if (segmentStart !== null) area += `L${x(i - 1)},${H}L${x(segmentStart)},${H}Z`;
      segmentStart = null;
      return;
    }
    const cmd = segmentStart === null ? "M" : "L";
    line += `${cmd}${x(i)},${y(v)}`;
    area += `${cmd}${x(i)},${y(v)}`;
    if (segmentStart === null) segmentStart = i;
  });
  if (segmentStart !== null) area += `L${x(values.length - 1)},${H}L${x(segmentStart)},${H}Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden className={className}>
      <path d={area} fill="currentColor" opacity={0.08} />
      <path
        d={line}
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className="animate-draw"
      />
    </svg>
  );
}
