import type { Locale } from "@/lib/i18n";

const intlLocale = (locale: Locale) => (locale === "fr" ? "fr-FR" : "en-GB");
const TIME_ZONE = "Europe/Paris";

export function formatDate(date: Date | string, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(new Date(date));
}

/** Compact form for list columns: 03.09.2026 */
export function formatShortDate(date: Date | string, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TIME_ZONE,
  })
    .format(new Date(date))
    .replaceAll("/", ".");
}

export function formatTime(date: Date | string, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(new Date(date));
}

/** 3 j 4 h · 2 h 15 min · 12 min — the two largest units only. */
export function formatDuration(ms: number, locale: Locale) {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const u = locale === "fr" ? { d: "j", h: "h", m: "min" } : { d: "d", h: "h", m: "min" };
  if (days > 0) return hours > 0 ? `${days} ${u.d} ${hours} ${u.h}` : `${days} ${u.d}`;
  if (hours > 0) return mins > 0 ? `${hours} ${u.h} ${mins} ${u.m}` : `${hours} ${u.h}`;
  return `${mins} ${u.m}`;
}

/** Time elapsed since a date, for open incidents (pages render per request). */
export function formatAge(since: Date, locale: Locale) {
  return formatDuration(Date.now() - since.getTime(), locale);
}

/** 0.99931 → "99,93 %" (fr) / "99.93%" (en). */
export function formatPercent(ratio: number, locale: Locale, digits = 2) {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(ratio);
}

export function formatNumber(value: number, locale: Locale, digits = 0) {
  return new Intl.NumberFormat(intlLocale(locale), {
    maximumFractionDigits: digits,
  }).format(value);
}
