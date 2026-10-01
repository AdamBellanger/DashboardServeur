import { formatPercent, formatShortDate } from "@/lib/format";
import type { Locale } from "@/lib/i18n";

const DAY_MS = 86_400_000;

function bandClass(value: number | null) {
  if (value === null) return "bg-foreground/10";
  if (value >= 0.999) return "bg-ok";
  if (value >= 0.99) return "bg-ok/60";
  if (value >= 0.95) return "bg-warn";
  return "bg-down";
}

/**
 * One thin bar per day, GitHub-contributions style. Phones only show the last
 * 30 days: 90 bars don't fit at a readable width.
 */
export function UptimeBands({
  bands,
  end,
  label,
  noData,
  locale,
}: {
  bands: (number | null)[];
  /** Unix seconds of the last band. */
  end: number;
  label: string;
  noData: string;
  locale: Locale;
}) {
  const hiddenOnPhone = bands.length - 30;
  return (
    <div role="img" aria-label={label} className="flex h-9 gap-[2px] sm:gap-[3px]">
      {bands.map((value, i) => {
        const date = formatShortDate(new Date(end * 1000 - (bands.length - 1 - i) * DAY_MS), locale);
        return (
          <span
            key={i}
            title={`${date} · ${value === null ? noData : formatPercent(value, locale)}`}
            className={`flex-1 rounded-[2px] transition-opacity duration-200 hover:opacity-60 ${bandClass(value)} ${
              i < hiddenOnPhone ? "hidden sm:block" : ""
            }`}
          />
        );
      })}
    </div>
  );
}
