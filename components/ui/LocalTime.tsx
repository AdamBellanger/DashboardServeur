"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/use-locale";

/** Current time in Paris, rendered client-side only to avoid hydration mismatches. */
export function LocalTime() {
  const { t } = useLocale();
  const numberLocale = t.numberLocale;
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const format = () =>
      new Intl.DateTimeFormat(numberLocale, {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Paris",
        timeZoneName: "short",
      }).format(new Date());
    const tick = () => setTime(format());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [numberLocale]);

  return <span suppressHydrationWarning>{time ?? "--:--"}</span>;
}
