import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Inter, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { SiteNav } from "@/components/layout/SiteNav";
import { PageTransition } from "@/components/layout/PageTransition";
import { Footer } from "@/components/layout/Footer";
import { CursorFollower } from "@/components/ui/CursorFollower";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { ScrollBar } from "@/components/ui/ScrollBar";
import { getDictionary } from "@/content/i18n/ui";
import { site } from "@/content/site";
import { alternates, href, isLocale, locales, type Locale } from "@/lib/i18n";
import "../globals.css";

const clashDisplay = localFont({
  src: [
    { path: "../../public/fonts/clash-display/ClashDisplay-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/clash-display/ClashDisplay-Medium.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-clash-display",
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

// Only /fr and /en exist internally (proxy.ts maps public URLs onto them).
export const dynamicParams = false;

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "fr";
  const t = getDictionary(locale).meta;
  return {
    metadataBase: new URL(site.url),
    title: t.siteTitle,
    description: t.description,
    alternates: alternates(locale, "home"),
    openGraph: {
      type: "website",
      locale: t.ogLocale,
      siteName: site.host,
      title: t.siteTitle,
      description: t.description,
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  // Rendered per request: the CSP nonce (proxy.ts) must be fresh every time,
  // and the status data is live anyway.
  await connection();
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  // Page names for the transition curtain, keyed by public path. Incident
  // pages fall back to their parent's name (see PageTransition).
  const t = getDictionary(lang);
  const labels: Record<string, string> = {
    [href(lang, "home")]: t.nav.home,
    [href(lang, "incidents")]: t.nav.incidents,
    [href(lang, "about")]: t.nav.about,
  };

  return (
    <html
      lang={lang}
      className={`${clashDisplay.variable} ${inter.variable} ${geistMono.variable} antialiased`}
    >
      <body className="flex min-h-screen flex-col">
        <SmoothScroll />
        <ScrollBar />
        <CursorFollower />
        <SiteNav />
        <PageTransition labels={labels}>
          {children}
          <Footer />
        </PageTransition>
      </body>
    </html>
  );
}
