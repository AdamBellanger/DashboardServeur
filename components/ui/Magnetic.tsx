"use client";

import type { PointerEvent, ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

const SPRING = { stiffness: 150, damping: 15, mass: 0.1 };

/** Pulls an element toward the mouse while hovered (mouse only, off for reduced motion). */
export function useMagnetic(strength = 0.35) {
  const reducedMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, SPRING);
  const springY = useSpring(y, SPRING);

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (reducedMotion || e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((e.clientY - (rect.top + rect.height / 2)) * strength);
  };
  const onPointerLeave = () => {
    x.set(0);
    y.set(0);
  };

  return { style: { x: springX, y: springY }, onPointerMove, onPointerLeave };
}

export function Magnetic({
  children,
  strength,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const magnetic = useMagnetic(strength);
  return (
    <motion.div className={className} {...magnetic}>
      {children}
    </motion.div>
  );
}
