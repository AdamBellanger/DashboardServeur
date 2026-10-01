import type { Metadata } from "next";
import { Reveal } from "@/components/ui/Reveal";
import { SplitText } from "@/components/ui/SplitText";
import { getDictionary } from "@/content/i18n/ui";
import { alternates, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/a-propos">): Promise<Metadata> {
  const locale = (await params).lang as Locale;
  const t = getDictionary(locale);
  return {
    title: `${t.meta.about} — Status`,
    description: t.about.intro,
    alternates: alternates(locale, "about"),
  };
}

const sectionTitle = "font-display text-4xl sm:text-5xl";

export default async function AboutPage({ params }: PageProps<"/[lang]/a-propos">) {
  const locale = (await params).lang as Locale;
  const t = getDictionary(locale).about;

  return (
    <div className="theme-light flex flex-1 flex-col">
      <article className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-24 px-6 pb-32 pt-40 sm:px-10 sm:pt-48">
        <header className="flex flex-col gap-6">
          <SplitText text={t.title} className="font-display text-6xl sm:text-8xl" />
          <Reveal delay={0.3}>
            <p className="max-w-2xl text-xl leading-relaxed text-muted sm:text-2xl">{t.intro}</p>
          </Reveal>
        </header>

        <section>
          <Reveal>
            <h2 className={sectionTitle}>{t.flowTitle}</h2>
          </Reveal>
          <ol className="mt-10 flex flex-col gap-3 lg:flex-row lg:items-stretch">
            {t.flow.map((step, i) => (
              <Reveal as="li" key={step.name} delay={i * 0.08} className="flex flex-col gap-3 lg:flex-1 lg:flex-row lg:items-center">
                {i > 0 && (
                  <span aria-hidden className="self-center font-display text-2xl text-accent lg:px-1">
                    <span className="lg:hidden">↓</span>
                    <span className="hidden lg:inline">→</span>
                  </span>
                )}
                <div className="flex flex-1 flex-col gap-2 rounded-2xl border border-foreground/15 p-6">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-display text-2xl">{step.name}</span>
                  <span className="text-sm text-muted">{step.role}</span>
                </div>
              </Reveal>
            ))}
          </ol>
        </section>

        <section>
          <Reveal>
            <h2 className={sectionTitle}>{t.principlesTitle}</h2>
          </Reveal>
          <ol className="mt-10 flex flex-col border-b border-foreground/10">
            {t.principles.map((principle, i) => (
              <Reveal
                as="li"
                key={principle}
                delay={i * 0.05}
                className="grid grid-cols-[3rem_1fr] gap-4 border-t border-foreground/10 py-6"
              >
                <span className="pt-1 font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
                <p className="max-w-2xl text-lg text-foreground/90">{principle}</p>
              </Reveal>
            ))}
          </ol>
        </section>

        <section>
          <Reveal>
            <h2 className={sectionTitle}>{t.stackTitle}</h2>
          </Reveal>
          <div className="mt-10 flex flex-col border-b border-foreground/10">
            {t.stack.map((group, i) => (
              <Reveal
                key={group.group}
                delay={Math.min(i, 4) * 0.05}
                className="grid grid-cols-1 gap-4 border-t border-foreground/10 py-8 sm:grid-cols-[14rem_1fr]"
              >
                <h3 className="pt-1.5 font-mono text-xs uppercase tracking-widest text-muted">{group.group}</h3>
                <ul className="grid grid-cols-1 gap-x-10 gap-y-5 md:grid-cols-2">
                  {group.items.map((item) => (
                    <li key={item.name}>
                      <p className="font-display text-2xl">{item.name}</p>
                      <p className="mt-1 text-sm text-muted">{item.role}</p>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
}
