// Server-side client for the Prometheus HTTP API (PromQL). Results are cached
// for a minute, so the dashboard never hits Prometheus more often than that.

type Sample = [number, string];
type VectorResult = { metric: Record<string, string>; value: Sample }[];
type MatrixResult = { metric: Record<string, string>; values: Sample[] }[];
type ApiResponse<T> = { status: "success" | "error"; data?: { result: T } };

const REVALIDATE = 60;

export const isPrometheusConfigured = () => Boolean(process.env.PROMETHEUS_URL);

async function call<T>(path: string, params: Record<string, string>): Promise<T | null> {
  const base = process.env.PROMETHEUS_URL?.replace(/\/+$/, "");
  if (!base) return null;
  const url = `${base}/api/v1/${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, {
    next: { revalidate: REVALIDATE },
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!res?.ok) return null;
  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  return body?.status === "success" && body.data ? body.data.result : null;
}

const toNumber = (raw: string) => {
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

/** First value of an instant query, or null (no data, error, NaN). */
export async function queryValue(query: string): Promise<number | null> {
  const result = await call<VectorResult>("query", { query });
  const first = result?.[0];
  return first ? toNumber(first.value[1]) : null;
}

/** Instant query grouped by one label, e.g. one value per monitor_name. */
export async function queryByLabel(query: string, label: string): Promise<Map<string, number> | null> {
  const result = await call<VectorResult>("query", { query });
  if (!result) return null;
  const out = new Map<string, number>();
  for (const series of result) {
    const key = series.metric[label];
    const value = toNumber(series.value[1]);
    if (key !== undefined && value !== null) out.set(key, value);
  }
  return out;
}

export type RangeOptions = { start: number; end: number; step: number };

/** Range query aligned on the step grid: one slot per step, null where Prometheus has no point. */
function align(values: Sample[], { start, end, step }: RangeOptions): (number | null)[] {
  const slots = Math.floor((end - start) / step) + 1;
  const out: (number | null)[] = Array.from({ length: slots }, () => null);
  for (const [ts, raw] of values) {
    const i = Math.round((ts - start) / step);
    if (i >= 0 && i < slots) out[i] = toNumber(raw);
  }
  return out;
}

export async function queryRange(query: string, range: RangeOptions): Promise<(number | null)[] | null> {
  const result = await call<MatrixResult>("query_range", {
    query,
    start: String(range.start),
    end: String(range.end),
    step: String(range.step),
  });
  if (!result) return null;
  return align(result[0]?.values ?? [], range);
}

export async function queryRangeByLabel(
  query: string,
  label: string,
  range: RangeOptions,
): Promise<Map<string, (number | null)[]> | null> {
  const result = await call<MatrixResult>("query_range", {
    query,
    start: String(range.start),
    end: String(range.end),
    step: String(range.step),
  });
  if (!result) return null;
  const out = new Map<string, (number | null)[]>();
  for (const series of result) {
    const key = series.metric[label];
    if (key !== undefined) out.set(key, align(series.values, range));
  }
  return out;
}

/** Regex alternation matching exactly these label values, safe inside a PromQL string. */
export function exactAlternation(values: string[]) {
  return values
    .map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}
