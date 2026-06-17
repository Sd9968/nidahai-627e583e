import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Intensity of the "fall apart" effect: how far it shifts/rotates/scales out */
  intensity?: "soft" | "medium" | "strong";
}

/**
 * Wraps a section so it gracefully "falls apart" as it scrolls out of the viewport
 * (downward scroll) and reassembles when it scrolls back in (upward scroll).
 *
 * Effect is purely scroll-bound (not one-shot), so it reverses naturally.
 */
export function ScrollReveal({ children, className, intensity = "medium" }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Track progress of this element across the viewport.
  // 0 = element just entering from bottom, 1 = element just leaving at top.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const cfg = {
    soft:   { y: 60,  rot: 2,  scale: 0.04, blur: 4 },
    medium: { y: 120, rot: 4,  scale: 0.08, blur: 8 },
    strong: { y: 200, rot: 8,  scale: 0.14, blur: 14 },
  }[intensity];

  // Opacity: fade in 0->0.25, hold full 0.25->0.7, fade out 0.7->1
  const opacity = useTransform(scrollYProgress, [0, 0.22, 0.7, 1], [0, 1, 1, 0]);
  // Y translate: comes up from below, settles, then drifts down as it leaves
  const y = useTransform(
    scrollYProgress,
    [0, 0.22, 0.7, 1],
    [cfg.y, 0, 0, cfg.y * 0.6]
  );
  // Scale: starts small, full, then shrinks as it leaves
  const scale = useTransform(
    scrollYProgress,
    [0, 0.22, 0.7, 1],
    [1 - cfg.scale, 1, 1, 1 - cfg.scale * 0.7]
  );
  // Slight rotation for "falling" feel
  const rotate = useTransform(
    scrollYProgress,
    [0, 0.22, 0.7, 1],
    [-cfg.rot, 0, 0, cfg.rot]
  );
  // Blur on the way out / in
  const filter = useTransform(
    scrollYProgress,
    [0, 0.22, 0.7, 1],
    [`blur(${cfg.blur}px)`, "blur(0px)", "blur(0px)", `blur(${cfg.blur * 0.7}px)`]
  );

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      style={{ opacity, y, scale, rotate, filter, willChange: "transform, opacity, filter" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
