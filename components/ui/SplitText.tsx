"use client";

import { Fragment } from "react";
import { motion, useReducedMotion } from "framer-motion";

type Tag = "h1" | "h2" | "p";

/** Word-by-word slide-up reveal. Plays on mount, or on first view with `inView`. */
export function SplitText({
  text,
  as: Tag = "h1",
  className,
  delay = 0.3,
  inView = false,
}: {
  text: string;
  as?: Tag;
  className?: string;
  delay?: number;
  inView?: boolean;
}) {
  const reducedMotion = useReducedMotion();

  // Reduced motion: shown at once, without waiting for the word to scroll in.
  const trigger =
    inView && !reducedMotion
      ? { whileInView: { y: "0%" }, viewport: { once: true, margin: "-60px" } }
      : { animate: { y: "0%" } };

  // Same markup whatever the motion setting (the server can't know it, so a
  // different tree would break hydration); reduced motion just skips the move.
  return (
    <Tag className={className} aria-label={text}>
      {text.split(" ").map((word, i) => (
        <Fragment key={i}>
          {/* Between the clipping boxes: a trailing space inside an
              inline-block is collapsed, which glued the words together. */}
          {i > 0 && " "}
          <span aria-hidden="true" className="inline-block overflow-hidden pb-[0.12em] align-bottom">
            <motion.span
              className="inline-block"
              initial={{ y: "110%" }}
              {...trigger}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: delay + i * 0.06 }
              }
            >
              {word}
            </motion.span>
          </span>
        </Fragment>
      ))}
    </Tag>
  );
}
