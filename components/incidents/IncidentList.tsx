"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { IncidentRow, type IncidentSummary } from "@/components/incidents/IncidentRow";
import { getDictionary } from "@/content/i18n/ui";
import type { Locale } from "@/lib/i18n";

const ALL = "all";

/** The incident feed with category filters, same pattern as the portfolio's project list. */
export function IncidentList({ incidents, locale }: { incidents: IncidentSummary[]; locale: Locale }) {
  const dict = getDictionary(locale);
  const t = dict.incidents;
  const [filter, setFilter] = useState(ALL);
  const reducedMotion = useReducedMotion();
  const tags = [...new Set(incidents.flatMap((i) => i.tags))];
  const visible = filter === ALL ? incidents : incidents.filter((i) => i.tags.includes(filter));

  return (
    <>
      {tags.length > 1 && (
        <div role="group" aria-label={t.filterLabel} className="mt-4 flex flex-wrap gap-2">
          {[ALL, ...tags].map((f) => {
            const count = f === ALL ? incidents.length : incidents.filter((i) => i.tags.includes(f)).length;
            const active = f === filter;
            return (
              <button
                key={f}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(f)}
                className={`cursor-pointer rounded-full border px-5 py-2.5 text-sm transition-colors ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-foreground/15 hover:border-foreground/40"
                }`}
              >
                {f === ALL ? t.all : (dict.tags[f] ?? f)}
                <sup className="ml-1 font-mono text-[10px] opacity-60">{count}</sup>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-8 flex flex-col border-b border-foreground/10">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((incident, i) => (
            <motion.div
              key={incident.slug}
              layout={!reducedMotion}
              initial={reducedMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: Math.min(i, 6) * 0.05 }}
            >
              <IncidentRow incident={incident} locale={locale} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
