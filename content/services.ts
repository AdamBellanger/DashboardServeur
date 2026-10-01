import type { Locale } from "@/lib/i18n";

export type Service = {
  /** Stable key, also used in incidents.services. */
  key: string;
  name: string;
  /** Public hostname shown under the name; null hides it. */
  host: string | null;
  /**
   * Monitor name, exactly as it appears in Uptime Kuma (it is both the label on
   * the public status page and the monitor_name label in Prometheus).
   */
  monitor: string;
  description: Record<Locale, string>;
};

// Public services listed on the dashboard, in display order. Each one must be
// on the Uptime Kuma status page (UPTIME_KUMA_STATUS_SLUG) to get a live state;
// an unmatched monitor name simply shows as "no data".
export const services: Service[] = [
  {
    key: "portfolio",
    name: "Portfolio",
    host: "adambellanger.pro",
    monitor: "Portfolio",
    description: {
      fr: "Site personnel, Next.js en conteneur Docker.",
      en: "Personal site, Next.js in a Docker container.",
    },
  },
  {
    key: "status",
    name: "Status",
    host: "status.adambellanger.pro",
    monitor: "Status",
    description: {
      fr: "Cette page.",
      en: "This page.",
    },
  },
  {
    key: "polytrack",
    name: "Polytrack",
    host: "polytrack.cloud",
    monitor: "Polytrack",
    description: {
      fr: "Application web polytrack.cloud.",
      en: "polytrack.cloud web app.",
    },
  },
  {
    key: "mail",
    name: "Mail",
    host: null,
    monitor: "Mail",
    description: {
      fr: "Serveur de messagerie.",
      en: "Mail server.",
    },
  },
];

// Parts of the infrastructure an incident can affect without being a public
// service of their own.
const components: Record<string, Record<Locale, string>> = {
  server: { fr: "Serveur", en: "Server" },
  ssh: { fr: "Accès SSH", en: "SSH access" },
  web: { fr: "Applications web", en: "Web apps" },
  postgresql: { fr: "PostgreSQL", en: "PostgreSQL" },
};

/** Display name for a key found in incidents.services. */
export function componentLabel(key: string, locale: Locale) {
  return services.find((s) => s.key === key)?.name ?? components[key]?.[locale] ?? key;
}
