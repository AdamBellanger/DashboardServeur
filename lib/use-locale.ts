"use client";

import { usePathname } from "next/navigation";
import { getDictionary } from "@/content/i18n/ui";
import { localeFromPath, publicPath } from "@/lib/i18n";

/** Public URL path, identical on the server and in the browser. */
export function usePublicPathname() {
  return publicPath(usePathname());
}

/** Current language (from the public URL) and its interface strings. */
export function useLocale() {
  const locale = localeFromPath(usePublicPathname());
  return { locale, t: getDictionary(locale) };
}
