"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** Render as a list item so it can sit directly inside <ul>/<ol>. */
  as?: "div" | "li";
}) {
  const reducedMotion = useReducedMotion();

  // Same markup whatever the motion setting (the server can't know it, so a
  // different tree would break hydration); reduced motion just skips the move.
  // Reduced motion: shown at once, without waiting for it to scroll in.
  const MotionTag = as === "li" ? motion.li : motion.div;
  const shown = { opacity: 1, y: 0 };
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: 24 }}
      {...(reducedMotion
        ? { animate: shown, transition: { duration: 0 } }
        : {
            whileInView: shown,
            viewport: { once: true, margin: "-80px" },
            transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1], delay },
          })}
    >
      {children}
    </MotionTag>
  );
}
