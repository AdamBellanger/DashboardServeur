"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { getLenis } from "@/components/providers/SmoothScroll";

const MIN_THUMB = 48;
const IDLE_MS = 1200;

/**
 * Thin custom scrollbar for mouse users: it inverts against whatever is
 * behind it (dark hero, light content, dark footer), shows while scrolling or
 * hovered, and can be dragged or clicked like a native one. The native bar is
 * only hidden once this mounts (html.custom-scrollbar), and touch devices keep
 * their own.
 */
export function ScrollBar() {
  const [metrics, setMetrics] = useState({ top: 0, height: 0, scrollable: false });
  const [active, setActive] = useState(false);
  const [dragging, setDragging] = useState(false);
  const idle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const drag = useRef({ startY: 0, startScroll: 0 });

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const html = document.documentElement;
    html.classList.add("custom-scrollbar");

    const measure = () => {
      const view = window.innerHeight;
      const total = html.scrollHeight;
      const scrollable = total > view + 1;
      const height = Math.max(MIN_THUMB, (view / total) * view);
      const progress = scrollable ? window.scrollY / (total - view) : 0;
      setMetrics({ top: progress * (view - height), height, scrollable });
    };

    const onScroll = () => {
      measure();
      setActive(true);
      clearTimeout(idle.current);
      idle.current = setTimeout(() => setActive(false), IDLE_MS);
    };

    // Stays unmounted (scrollable: false) on touch devices, where this effect
    // returns early and the native scrollbar is kept.
    const first = requestAnimationFrame(measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      observer.disconnect();
      cancelAnimationFrame(first);
      clearTimeout(idle.current);
      html.classList.remove("custom-scrollbar");
    };
  }, []);

  const scrollTo = (y: number, immediate: boolean) => {
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(y, { immediate, force: true });
    else window.scrollTo({ top: y, behavior: immediate ? "instant" : "smooth" });
  };

  // Page pixels per thumb pixel.
  const ratio = () => {
    const view = window.innerHeight;
    return (document.documentElement.scrollHeight - view) / (view - metrics.height);
  };

  const onThumbDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, startScroll: window.scrollY };
    setDragging(true);
  };
  const onThumbMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    scrollTo(drag.current.startScroll + (e.clientY - drag.current.startY) * ratio(), true);
  };
  const onThumbUp = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
  };

  // Clicking the track jumps so the thumb centres on the click.
  const onTrackDown = (e: PointerEvent<HTMLDivElement>) => {
    scrollTo((e.clientY - metrics.height / 2) * ratio(), false);
  };

  if (!metrics.scrollable) return null;
  const visible = active || dragging;

  return (
    <div
      aria-hidden="true"
      onPointerDown={onTrackDown}
      className="group fixed inset-y-0 right-0 z-[55] w-3 mix-blend-difference"
    >
      <div
        onPointerDown={onThumbDown}
        onPointerMove={onThumbMove}
        onPointerUp={onThumbUp}
        style={{ height: metrics.height, transform: `translateY(${metrics.top}px)` }}
        className={`absolute right-[3px] top-0 rounded-full bg-white transition-[opacity,width] duration-300 group-hover:w-1.5 group-hover:opacity-70 ${
          dragging ? "w-1.5 opacity-80" : visible ? "w-1 opacity-50" : "w-1 opacity-0"
        }`}
      />
    </div>
  );
}
