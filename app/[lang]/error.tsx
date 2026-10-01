"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ErrorScreen, primaryButton, secondaryButton } from "@/components/ui/ErrorScreen";
import { Magnetic } from "@/components/ui/Magnetic";
import { href } from "@/lib/i18n";
import { useLocale } from "@/lib/use-locale";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale, t } = useLocale();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorScreen
      locale={locale}
      code="500"
      title={t.errors.serverTitle}
      message={t.errors.serverMessage}
      terminal={[
        "$ curl -I status.adambellanger.pro",
        "HTTP/2 500 Internal Server Error",
        `x-error-digest: ${error.digest ?? "n/a"}`,
        "",
        "$ docker compose logs status --tail 1",
        "status  | Unhandled exception, request aborted",
        "",
        t.errors.serverTerminalLast,
      ]}
      actions={
        <>
          <Magnetic strength={0.25}>
            <button type="button" onClick={reset} className={primaryButton}>
              {t.errors.retry}
            </button>
          </Magnetic>
          <Magnetic strength={0.25}>
            <Link href={href(locale, "home")} className={secondaryButton}>
              {t.errors.home}
            </Link>
          </Magnetic>
        </>
      }
    />
  );
}
