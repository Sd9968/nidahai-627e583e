import { motion, useReducedMotion } from "framer-motion";
import { useLocale } from "@/lib/i18n";

/**
 * Infinite horizontal marquee with brand keywords.
 * Pure CSS-driven by framer-motion's animate prop — no scroll listener.
 */
export function Marquee() {
  const { t } = useLocale();
  const prefersReducedMotion = useReducedMotion();

  const words = [
    "Yaran Arabia.ai",
    t("fs.1.t"),
    "•",
    t("fs.2.t"),
    "•",
    t("fs.3.t"),
    "•",
    t("fs.4.t"),
    "•",
    "Voice AI",
    "•",
    "24 / 7",
    "•",
    "العربية",
    "•",
    "English",
    "•",
  ];
  // Duplicate so the loop is seamless
  const loop = [...words, ...words];

  return (
    <section
      aria-hidden="true"
      className="relative bg-ink text-paper border-y border-hairline overflow-hidden py-6"
    >
      <motion.div
        className="flex gap-10 whitespace-nowrap font-display uppercase text-3xl md:text-5xl tracking-tight"
        animate={prefersReducedMotion ? undefined : { x: ["0%", "-50%"] }}
        transition={{
          duration: 40,
          ease: "linear",
          repeat: Infinity,
        }}
      >
        {loop.map((w, i) => (
          <span
            key={i}
            className={i % 4 === 0 ? "text-pop" : "text-paper/90"}
          >
            {w}
          </span>
        ))}
      </motion.div>
    </section>
  );
}
