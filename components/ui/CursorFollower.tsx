"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

type Mode = "default" | "link" | "label" | "text";

const SIZE: Record<Mode, string> = {
  default: "h-3 w-3 rounded-full",
  link: "h-12 w-12 rounded-full",
  label: "h-24 w-24 rounded-full",
  text: "h-7 w-[3px] rounded-sm",
};

/**
 * Single contextual cursor, same as the portfolio's. Inverts colours
 * (mix-blend-difference) so it reads on both dark and light sections; grows
 * over links, shows a label over elements carrying data-cursor="…", "↗" over
 * external links, and becomes a caret in text fields. Fine pointers only, off
 * for reduced motion.
 */
export function CursorFollower() {
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<Mode>("default");
  const [label, setLabel] = useState("");
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);
  const current = useRef({ mode: "default" as Mode, label: "" });

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const springX = useSpring(x, { stiffness: 500, damping: 40, mass: 0.3 });
  const springY = useSpring(y, { stiffness: 500, damping: 40, mass: 0.3 });

  useEffect(() => {
    if (reducedMotion) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    document.documentElement.classList.add("cursor-none");

    const update = (nextMode: Mode, nextLabel = "") => {
      if (current.current.mode === nextMode && current.current.label === nextLabel) return;
      current.current = { mode: nextMode, label: nextLabel };
      setMode(nextMode);
      setLabel(nextLabel);
    };

    const handleMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);

      const target = e.target as Element;
      const labelled = target.closest<HTMLElement>("[data-cursor]");
      if (labelled) return update("label", labelled.dataset.cursor ?? "");
      if (target.closest("input:not([type=hidden]), textarea")) return update("text");
      const anchor = target.closest("a");
      if (anchor?.target === "_blank") return update("label", "↗");
      if (target.closest("a, button, [role=button]")) return update("link");
      update("default");
    };
    const handleDown = () => setPressed(true);
    const handleUp = () => setPressed(false);
    const handleLeave = () => setVisible(false);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerdown", handleDown);
    window.addEventListener("pointerup", handleUp);
    document.documentElement.addEventListener("pointerleave", handleLeave);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerdown", handleDown);
      window.removeEventListener("pointerup", handleUp);
      document.documentElement.removeEventListener("pointerleave", handleLeave);
      document.documentElement.classList.remove("cursor-none");
    };
  }, [reducedMotion, x, y]);

  // Always rendered (hydration needs the server's markup); with reduced motion
  // the effect above never runs, so it just stays invisible.
  const isLabel = mode === "label";
  const isArrow = isLabel && label === "↗";

  return (
    <motion.div
      aria-hidden="true"
      style={{ x: springX, y: springY }}
      className={`pointer-events-none fixed left-0 top-0 z-[100] ${isLabel ? "" : "mix-blend-difference"}`}
    >
      <div
        className={`flex -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden transition-[width,height,border-radius,background-color,opacity,scale] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isArrow ? "h-16 w-16 rounded-full" : SIZE[mode]
        } ${isLabel ? "bg-accent text-background" : "bg-foreground"} ${visible ? "opacity-100" : "opacity-0"} ${
          pressed ? "scale-75" : "scale-100"
        }`}
      >
        <span
          className={`whitespace-nowrap font-medium transition-opacity duration-200 ${isArrow ? "text-2xl" : "text-sm"} ${
            isLabel ? "opacity-100 delay-100" : "opacity-0"
          }`}
        >
          {label}
        </span>
      </div>
    </motion.div>
  );
}
