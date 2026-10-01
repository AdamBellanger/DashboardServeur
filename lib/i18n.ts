// Locales, public URLs and path helpers shared by the proxy, server pages and
// client components. Same mechanics as the portfolio.
//
// French lives at the root (/a-propos), English under /en with translated
// segments (/en/about). Internally every page sits under app/[lang] with the
// French folder names; proxy.ts rewrites public URLs onto that tree.

export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";

export const isLocale = (value: string | undefined): value is Locale =>
  locales.includes(value as Locale);

/** Cookie remembering an explicit language choice (footer switch). */
export const LOCALE_COOKIE = "lang";

export type Route = "home" | "incidents" | "about";

const ROUTES: Record<Route, Record<Locale, string>> = {
  home: { fr: "/", en: "/en" },
  incidents: { fr: "/incidents", en: "/en/incidents" },
  about: { fr: "/a-propos", en: "/en/about" },
};

/** Public URL of a page in a given language. */
export function href(locale: Locale, route: Route, slug?: string) {
  const base = ROUTES[route][locale];
  return slug ? `${base}/${slug}` : base;
}

/**
 * Public form of a pathname. During server rendering Next.js reports the
 * internal rewritten path (/fr/incidents, /en/a-propos); in the browser it
 * reports the real URL. Normalising both keeps server and client HTML equal.
 */
export function publicPath(pathname: string): string {
  if (pathname === "/fr") return "/";
  if (pathname.startsWith("/fr/")) return pathname.slice(3);
  return pathname.replace(/^\/en\/a-propos(?=\/|$)/, "/en/about");
}

/** Language of a public pathname (/en…, everything else is French). */
export function localeFromPath(pathname: string): Locale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "fr";
}

/** Which page a public pathname points to, e.g. /en/incidents/x → incidents + x. */
export function routeFromPath(pathname: string): { route: Route; slug?: string } | null {
  const locale = localeFromPath(pathname);
  const clean = pathname.replace(/\/+$/, "") || "/";
  for (const route of Object.keys(ROUTES) as Route[]) {
    const base = ROUTES[route][locale];
    if (clean === base) return { route };
    if (route === "incidents" && clean.startsWith(`${base}/`)) {
      return { route, slug: clean.slice(base.length + 1) };
    }
  }
  return null;
}

/** Same page in the other language (falls back to that language's home). */
export function switchLocalePath(pathname: string, target: Locale) {
  const match = routeFromPath(pathname);
  return match ? href(target, match.route, match.slug) : href(target, "home");
}

/**
 * Maps a public URL to the internal app/[lang] path, e.g.
 * /en/about → /en/a-propos, /incidents/x → /fr/incidents/x.
 * Unknown URLs keep their path under the lang prefix, so the localized 404
 * renders.
 */
export function internalPath(pathname: string): string {
  const locale = localeFromPath(pathname);
  const match = routeFromPath(pathname);
  if (!match) {
    const rest = locale === "en" ? pathname.slice(3) : pathname;
    return `/${locale}${rest === "/" ? "" : rest}`;
  }
  const internal = { home: "", incidents: "/incidents", about: "/a-propos" }[match.route];
  return `/${locale}${internal}${match.slug ? `/${match.slug}` : ""}`;
}

/** hreflang alternates + canonical for a page, for generateMetadata. */
export function alternates(locale: Locale, route: Route, slug?: string) {
  return {
    canonical: href(locale, route, slug),
    languages: {
      fr: href("fr", route, slug),
      en: href("en", route, slug),
      "x-default": href("fr", route, slug),
    },
  };
}

/** Picks fr or en from an Accept-Language header; other languages → en. */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { lang: tag.split("-")[0], q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .filter((entry) => entry.lang && entry.q > 0)
    .sort((a, b) => b.q - a.q);
  const known = ranked.find((entry) => entry.lang === "fr" || entry.lang === "en");
  if (known) return known.lang as Locale;
  return ranked.length > 0 ? "en" : defaultLocale;
}
