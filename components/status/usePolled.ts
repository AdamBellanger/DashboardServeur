"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Starts from server-rendered data, then refreshes it from one of this app's
 * own API routes (never from Uptime Kuma or Prometheus directly). Pauses while
 * the tab is hidden.
 *
 * When `url` changes (e.g. another chart period), the new one is fetched at
 * once; `stale` is true until its answer arrives, the previous data staying
 * on screen meanwhile.
 */
export function usePolledState<T>(url: string, initial: T, intervalMs: number): { data: T; stale: boolean } {
  const [state, setState] = useState({ data: initial, url });
  // URL the data on screen was fetched from; the first one came server-rendered.
  const loadedUrl = useRef(url);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (document.hidden) return;
      const res = await fetch(url, { cache: "no-store" }).catch(() => null);
      if (!res?.ok) return;
      const json = (await res.json().catch(() => null)) as T | null;
      if (!json || cancelled) return;
      loadedUrl.current = url;
      setState({ data: json, url });
    };
    if (loadedUrl.current !== url) void tick();
    const id = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [url, intervalMs]);

  return { data: state.data, stale: state.url !== url };
}

export function usePolled<T>(url: string, initial: T, intervalMs: number): T {
  return usePolledState(url, initial, intervalMs).data;
}
