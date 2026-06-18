import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Intensity of the "fall apart" effect: how far it shifts/blurs out */
  intensity?: "soft" | "medium" | "strong";
}

/**
 * Sections reveal as they scroll into view and gracefully fall apart as they
 * leave — scroll-bound so it reverses naturally when scrolling back up.
 *
 * Editorial register: subtle blur-in, gentle lift, a touch of scale.
 * No rotation (kept the motion premium, not chaotic).
 */
export function ScrollReveal({ children, className, intensity = "medium" }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const cfg = {
    soft:   { y: 40,  scale: 0.02, blur: 6,  parallax: -20 },
    medium: { y: 80,  scale: 0.05, blur: 10, parallax: -40 },
    strong: { y: 130, scale: 0.08, blur: 16, parallax: -70 },
  }[intensity];

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.72, 1], [0, 1, 1, 0]);
  const y = useTransform(
    scrollYProgress,
    [0, 0.2, 0.72, 1],
    [cfg.y, 0, cfg.parallax, cfg.parallax + cfg.y * 0.4]
  );
  const scale = useTransform(
    scrollYProgress,
    [0, 0.2, 0.72, 1],
    [1 - cfg.scale, 1, 1, 1 - cfg.scale * 0.6]
  );
  const filter = useTransform(
    scrollYProgress,
    [0, 0.18, 0.74, 1],
    [`blur(${cfg.blur}px)`, "blur(0px)", "blur(0px)", `blur(${cfg.blur * 0.6}px)`]
  );

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      style={{ opacity, y, scale, filter, willChange: "transform, opacity, filter" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
