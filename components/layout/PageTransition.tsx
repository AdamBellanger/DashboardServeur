"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { usePublicPathname } from "@/lib/use-locale";
import { useEffect, useRef, useState, type ReactNode } from "react";

const EASE = [0.76, 0, 0.24, 1] as const;

const variants = {
  // ±120% so the curved edges (which overhang the panel) are fully off-screen.
  // Hidden also sets visibility so it can never peek in (mobile toolbar resizes).
  hidden: { y: "120%", visibility: "hidden" as const, transition: { duration: 0 } },
  cover: { y: "0%", visibility: "visible" as const, transition: { duration: 0.6, ease: EASE } },
  reveal: { y: "-120%", visibility: "visible" as const, transition: { duration: 0.8, ease: EASE, delay: 0.25 } },
};

/** Label for a path: exact match first, else the closest parent (/incidents/x → Incidents). */
function labelFor(path: string, labels: Record<string, string>) {
  for (let p = path; p; p = p.slice(0, p.lastIndexOf("/"))) {
    if (labels[p]) return labels[p];
  }
  return "";
}

/**
 * Snellenberg-style curtain, same as the portfolio: internal link clicks are
 * intercepted, a panel slides up over the page with the destination's name,
 * the route changes underneath, then the panel slides away.
 */
export function PageTransition({
  children,
  labels,
}: {
  children: ReactNode;
  /** Destination names keyed by public path, from the layout. */
  labels: Record<string, string>;
}) {
  const pathname = usePublicPathname();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [target, setTarget] = useState<{ href: string; path: string; label: string } | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (reducedMotion) return;

    const handleClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element).closest("a");
      // Language switches (hreflang) do a full page load instead.
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download") || anchor.hasAttribute("hreflang")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;

      e.preventDefault();
      if (busy.current) return;
      busy.current = true;
      setTarget({ href: url.pathname + url.search + url.hash, path: url.pathname, label: labelFor(url.pathname, labels) });
    };

    // Capture phase so this runs before next/link's own click handler.
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [reducedMotion, labels]);

  const state = !target ? "hidden" : pathname === target.path ? "reveal" : "cover";

  return (
    <>
      <div className="flex flex-1 flex-col">{children}</div>
      <motion.div
        aria-hidden="true"
        initial="hidden"
        animate={state}
        variants={variants}
        onAnimationComplete={(definition) => {
          if (definition === "cover" && target) router.push(target.href);
          if (definition === "reveal") {
            busy.current = false;
            setTarget(null);
          }
        }}
        className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-anthracite"
      >
        {/* Curved leading/trailing edges */}
        <span className="absolute -top-[9vh] left-[-10%] h-[18vh] w-[120%] rounded-[50%] bg-anthracite" />
        <span className="absolute -bottom-[9vh] left-[-10%] h-[18vh] w-[120%] rounded-[50%] bg-anthracite" />
        <motion.p
          animate={{ opacity: state === "hidden" ? 0 : 1 }}
          transition={{ duration: 0.3, delay: state === "cover" ? 0.2 : 0 }}
          className="relative flex items-center gap-4 font-display text-4xl sm:text-6xl"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          {target?.label}
        </motion.p>
      </motion.div>
    </>
  );
}
