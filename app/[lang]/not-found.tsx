import type { Metadata } from "next";
import { lang } from "next/root-params";
import { ErrorScreen } from "@/components/ui/ErrorScreen";
import { getDictionary } from "@/content/i18n/ui";
import { isLocale, type Locale } from "@/lib/i18n";

async function currentLocale(): Promise<Locale> {
  const value = await lang();
  return isLocale(value) ? value : "fr";
}

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await currentLocale()).meta;
  return { title: `${t.notFound} — Status` };
}

export default async function NotFound() {
  const locale = await currentLocale();
  const t = getDictionary(locale).errors;
  return (
    <ErrorScreen
      locale={locale}
      code="404"
      title={t.notFoundTitle}
      message={t.notFoundMessage}
      terminal={t.notFoundTerminal}
    />
  );
}
