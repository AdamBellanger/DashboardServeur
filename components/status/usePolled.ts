"use client";

import { useEffect, useState } from "react";

/**
 * Starts from server-rendered data, then refreshes it from one of this app's
 * own API routes (never from Uptime Kuma or Prometheus directly). Pauses while
 * the tab is hidden.
 */
export function usePolled<T>(url: string, initial: T, intervalMs: number): T {
  const [data, setData] = useState(initial);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (document.hidden) return;
      const res = await fetch(url, { cache: "no-store" }).catch(() => null);
      if (!res?.ok) return;
      const json = (await res.json().catch(() => null)) as T | null;
      if (json && !cancelled) setData(json);
    };
    const id = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [url, intervalMs]);

  return data;
}
