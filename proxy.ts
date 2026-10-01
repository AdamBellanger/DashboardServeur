import { NextResponse, type NextRequest } from "next/server";
import {
  internalPath,
  isLocale,
  LOCALE_COOKIE,
  localeFromPath,
  negotiateLocale,
  switchLocalePath,
} from "@/lib/i18n";

// Language routing, in front of every page request (same as the portfolio):
// 1. First visit on a French URL from a browser set to another language →
//    redirect to the English page (an explicit footer choice, stored in the
//    "lang" cookie, always wins over the browser setting).
// 2. Public URLs are rewritten onto the internal app/[lang] tree
//    (/incidents → /fr/incidents, /en/about → /en/a-propos).
// 3. Internal-looking URLs (/fr/…, /en/a-propos) redirect to their public form.
// 4. Every page response gets a nonce-based Content-Security-Policy.

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|lighthouse/i;

// Strict Content-Security-Policy: only scripts carrying this request's nonce
// run (Next.js adds it to its own tags), plus what they load ('strict-dynamic').
// Styles keep 'unsafe-inline' because animations write inline style attributes,
// which nonces can't cover.
function contentSecurityPolicy(nonce: string) {
  const dev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Generated metadata images are requested by their internal path.
  if (pathname.includes("/opengraph-image")) return NextResponse.next();

  // /fr/… is never a public URL.
  if (pathname === "/fr" || pathname.startsWith("/fr/")) {
    return redirect(request, pathname.slice(3) || "/", 308);
  }

  // English URLs use translated segments; send the French one to it.
  const legacyEn = pathname.match(/^\/en\/a-propos(\/.*)?$/);
  if (legacyEn) return redirect(request, `/en/about${legacyEn[1] ?? ""}`, 308);

  const urlLocale = localeFromPath(pathname);
  if (urlLocale === "fr") {
    const saved = request.cookies.get(LOCALE_COOKIE)?.value;
    const isBot = BOT.test(request.headers.get("user-agent") ?? "");
    const preferred = isLocale(saved)
      ? saved
      : isBot
        ? "fr"
        : negotiateLocale(request.headers.get("accept-language"));
    if (preferred === "en") {
      const response = redirect(request, switchLocalePath(pathname, "en"), 307);
      response.cookies.set(LOCALE_COOKIE, "en", { path: "/", maxAge: 31536000, sameSite: "lax" });
      return response;
    }
  }

  // Next.js reads the nonce from the request's CSP header while rendering.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", csp);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.rewrite(new URL(internalPath(pathname) + search, request.url), {
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Vary", "Accept-Language, Cookie");
  return response;
}

function redirect(request: NextRequest, pathname: string, status: 307 | 308) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  const response = NextResponse.redirect(url, status);
  response.headers.set("Vary", "Accept-Language, Cookie");
  return response;
}

export const config = {
  // Pages only: skip the API, Next internals and any file with an extension
  // (icon.svg, sitemap.xml, robots.txt, fonts…).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
