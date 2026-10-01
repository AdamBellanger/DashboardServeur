import Link from "next/link";
import type { ReactNode } from "react";
import { Magnetic } from "@/components/ui/Magnetic";
import { Reveal } from "@/components/ui/Reveal";
import { SplitText } from "@/components/ui/SplitText";
import { getDictionary } from "@/content/i18n/ui";
import { href, type Locale } from "@/lib/i18n";

const buttonBase =
  "inline-flex cursor-pointer rounded-full px-8 py-4 transition-all duration-300";
export const primaryButton = `${buttonBase} bg-accent text-background hover:scale-105`;
export const secondaryButton = `${buttonBase} border border-foreground/20 hover:border-foreground hover:bg-foreground hover:text-background`;

/** Shared layout for 404 / 500 pages: big code, terminal-style trace, actions. */
export function ErrorScreen({
  locale,
  code,
  title,
  message,
  terminal,
  actions,
}: {
  locale: Locale;
  code: string;
  title: string;
  message: string;
  terminal: string[];
  actions?: ReactNode;
}) {
  const t = getDictionary(locale).errors;
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pb-24 pt-40 sm:px-10">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">{t.label} {code}</p>
      <SplitText
        text={code}
        className="mt-4 font-display text-[32vw] leading-[0.85] tracking-tight sm:text-[18rem]"
      />
      <div className="mt-10 grid grid-cols-1 gap-10 border-t border-foreground/15 pt-10 lg:grid-cols-2">
        <Reveal delay={0.4}>
          <h2 className="font-display text-3xl sm:text-4xl">{title}</h2>
          <p className="mt-4 max-w-md text-muted">{message}</p>
          <div className="mt-8 flex flex-wrap gap-4">
            {actions ?? (
              <>
                <Magnetic strength={0.25}>
                  <Link href={href(locale, "home")} className={primaryButton}>
                    {t.home}
                  </Link>
                </Magnetic>
                <Magnetic strength={0.25}>
                  <Link href={href(locale, "incidents")} className={secondaryButton}>
                    {t.incidents}
                  </Link>
                </Magnetic>
              </>
            )}
          </div>
        </Reveal>
        <Reveal delay={0.55}>
          <pre
            aria-hidden="true"
            className="overflow-x-auto rounded-2xl bg-anthracite p-6 font-mono text-xs leading-relaxed text-muted sm:text-sm"
          >
            {terminal.join("\n")}
          </pre>
        </Reveal>
      </div>
    </section>
  );
}
