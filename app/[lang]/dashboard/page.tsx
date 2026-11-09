import type { Metadata } from "next";
import { connection } from "next/server";
import { Bento } from "@/components/dashboard/Bento";
import { getDictionary } from "@/content/i18n/ui";
import { getDashboard } from "@/lib/dashboard";
import { listIncidents } from "@/lib/db/queries";
import { alternates, type Locale } from "@/lib/i18n";
import { incidentStats } from "@/lib/incident-stats";
import { getStatus } from "@/lib/status";

export async function generateMetadata({ params }: PageProps<"/[lang]/dashboard">): Promise<Metadata> {
  const locale = (await params).lang as Locale;
  const t = getDictionary(locale);
  return {
    title: `${t.meta.dashboard} — Status`,
    description: t.dashboard.description,
    alternates: alternates(locale, "dashboard"),
  };
}

export default async function DashboardPage({ params }: PageProps<"/[lang]/dashboard">) {
  // Live data: never prerendered at build time (no database or monitoring there).
  await connection();
  const locale = (await params).lang as Locale;
  const [status, dashboard, incidents] = await Promise.all([getStatus(), getDashboard(), listIncidents(locale)]);

  return (
    <Bento
      locale={locale}
      initialStatus={status}
      initialDashboard={dashboard}
      stats={incidents ? incidentStats(incidents) : null}
    />
  );
}
