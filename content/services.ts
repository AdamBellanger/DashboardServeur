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
// This site itself (status.adambellanger.pro) isn't listed: if it's down,
// nobody can read the page that would say so.
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
    key: "qrdrop",
    name: "QRDrop",
    host: "qrdrop.online",
    monitor: "QRDrop",
    description: {
      fr: "Générateur de QR codes.",
      en: "QR code generator.",
    },
  },
  {
    key: "ai",
    name: "AI",
    host: "ai.adambellanger.pro",
    monitor: "AI",
    description: {
      fr: "Assistant IA auto-hébergé.",
      en: "Self-hosted AI assistant.",
    },
  },
  {
    key: "anvil",
    name: "Anvil",
    host: "enclume.adambellanger.pro",
    monitor: "Anvil",
    description: {
      fr: "Application web.",
      en: "Web app.",
    },
  },
  {
    key: "excalidraw",
    name: "Excalidraw",
    host: "excalidraw.adambellanger.pro",
    monitor: "Excalidraw",
    description: {
      fr: "Tableau blanc collaboratif.",
      en: "Collaborative whiteboard.",
    },
  },
  {
    key: "whisper",
    name: "Whisper",
    host: "whisper.adambellanger.pro",
    monitor: "Whisper",
    description: {
      fr: "Transcription audio.",
      en: "Audio transcription.",
    },
  },
  {
    key: "outils",
    name: "Outils",
    host: "outils.adambellanger.pro",
    monitor: "Outils",
    description: {
      fr: "Boîte à outils web (IT-Tools).",
      en: "Web toolbox (IT-Tools).",
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
