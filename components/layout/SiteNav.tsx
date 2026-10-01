"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { useMagnetic } from "@/components/ui/Magnetic";
import { site } from "@/content/site";
import { href, type Route } from "@/lib/i18n";
import { useLocale, usePublicPathname } from "@/lib/use-locale";

const ROUTES: Route[] = ["home", "incidents", "about"];

// Header links slide up and fade out one after the other when the page scrolls.
const HIDE_EASE = "ease-[cubic-bezier(0.16,1,0.3,1)]";

export function SiteNav() {
  const pathname = usePublicPathname();
  const { locale, t: dict } = useLocale();
  const t = dict.nav;
  const links = ROUTES.map((route) => ({ href: href(locale, route), label: t[route] }));
  const topLinks = links.slice(1);
  const socials = [
    { label: t.portfolio, href: locale === "fr" ? site.portfolioUrl : `${site.portfolioUrl}/en` },
    ...site.socials,
    { label: "Email", href: `mailto:${site.email}` },
  ];
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const magnetic = useMagnetic(0.4);
  const reducedMotion = useReducedMotion();
  // null until mounted: the server can't know the breakpoint.
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const toggleScale = useMotionValue(1);
  const toggleReady = useRef(false);
  const headerHidden = compact || open;
  // On phones the round button is the only nav, so it is always shown; on
  // desktop it pops in once the header links have scrolled away.
  const toggleVisible = isDesktop === false || headerHidden;

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useLayoutEffect(() => {
    if (isDesktop === null) return;
    const target = toggleVisible ? 1 : 0;
    // First placement (and reduced motion) jumps straight to the end state.
    if (!toggleReady.current || reducedMotion) {
      toggleReady.current = true;
      toggleScale.set(target);
      return;
    }
    const controls = animate(
      toggleScale,
      target,
      target
        ? { type: "spring", stiffness: 300, damping: 20, mass: 0.8 }
        : { duration: 0.25, ease: [0.4, 0, 1, 1] },
    );
    return () => controls.stop();
  }, [isDesktop, toggleVisible, reducedMotion, toggleScale]);

  useEffect(() => {
    const handleScroll = () => setCompact(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    firstLinkRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !overlayRef.current) return;
      const focusable = overlayRef.current.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) toggleRef.current?.focus();
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-5 text-foreground mix-blend-difference sm:px-10 ${
          headerHidden ? "pointer-events-none" : ""
        }`}
      >
        <Link
          href={href(locale, "home")}
          onClick={() => setOpen(false)}
          className={`font-display text-sm tracking-wide transition-[opacity,transform] duration-500 motion-reduce:transition-none ${HIDE_EASE} ${
            headerHidden ? "pointer-events-none -translate-y-4 opacity-0" : ""
          }`}
        >
          {t.brand}
        </Link>
        <nav
          aria-label={t.main}
          className={`hidden items-center gap-8 sm:flex ${
            headerHidden ? "pointer-events-none" : ""
          }`}
        >
          {topLinks.map((link, i) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                tabIndex={headerHidden ? -1 : undefined}
                style={{
                  transitionDelay: `${(headerHidden ? i : topLinks.length - 1 - i) * 50}ms`,
                }}
                className={`group relative text-sm transition-[opacity,transform] duration-500 motion-reduce:transition-none ${HIDE_EASE} ${
                  headerHidden ? "-translate-y-4 opacity-0" : "hover:opacity-60"
                }`}
              >
                {link.label}
                <span
                  aria-hidden
                  className={`absolute -bottom-3 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-current transition-transform duration-300 ${
                    active ? "scale-100" : "scale-0 group-hover:scale-100"
                  }`}
                />
              </Link>
            );
          })}
        </nav>
      </header>
      <motion.div
        style={{ scale: toggleScale }}
        className={`fixed right-4 top-4 z-50 sm:right-8 ${
          isDesktop === null ? "sm:invisible" : ""
        } ${toggleVisible ? "" : "pointer-events-none"}`}
      >
        <motion.button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="site-nav-overlay"
          aria-hidden={toggleVisible ? undefined : true}
          tabIndex={toggleVisible ? undefined : -1}
          {...magnetic}
          className={`flex h-14 w-14 cursor-pointer items-center justify-center rounded-full transition-colors duration-300 sm:h-16 sm:w-16 ${
            open
              ? "bg-accent text-background"
              : "border border-foreground/20 bg-anthracite/90 text-foreground backdrop-blur"
          }`}
        >
          <span aria-hidden className="relative block h-3 w-6">
            <span
              className={`absolute left-0 h-px w-full bg-current transition-transform duration-300 ${
                open ? "top-1/2 rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute left-0 h-px w-full bg-current transition-transform duration-300 ${
                open ? "top-1/2 -rotate-45" : "bottom-0"
              }`}
            />
          </span>
          <span className="sr-only">
            {open ? t.close : t.open}
          </span>
        </motion.button>
      </motion.div>
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 cursor-default"
            />
            <motion.div
              id="site-nav-overlay"
              ref={overlayRef}
              role="dialog"
              aria-modal="true"
              aria-label={t.main}
              initial={{ x: "100%" }}
              animate={{ x: "0%" }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
              className="fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col justify-between border-l border-foreground/10 bg-anthracite px-8 py-10 sm:px-10"
            >
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-muted">
                  {t.heading}
                </p>
                <div className="mt-3 border-t border-foreground/10" />
                <ul className="mt-8 flex flex-col gap-3">
                  {links.map((link, i) => {
                    const active =
                      pathname === link.href ||
                      (i > 0 && pathname.startsWith(`${link.href}/`));
                    return (
                      <li key={link.href} className="flex items-center gap-3">
                        {active && (
                          <span
                            aria-hidden
                            className="h-1.5 w-1.5 rounded-full bg-accent"
                          />
                        )}
                        <Link
                          href={link.href}
                          ref={i === 0 ? firstLinkRef : undefined}
                          onClick={() => setOpen(false)}
                          className="font-display text-4xl text-foreground transition-colors hover:text-accent"
                        >
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-muted">
                  {t.socials}
                </p>
                <div className="mt-3 border-t border-foreground/10" />
                <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                  {socials.map((social) => (
                    <li key={social.label}>
                      <a
                        href={social.href}
                        target={
                          social.href.startsWith("http") ? "_blank" : undefined
                        }
                        rel={
                          social.href.startsWith("http")
                            ? "noopener noreferrer"
                            : undefined
                        }
                        className="text-sm text-foreground transition-colors hover:text-accent"
                      >
                        {social.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
