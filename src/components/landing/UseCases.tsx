import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Stethoscope, Scissors, Smile, Briefcase, Wrench, Store, ArrowUpRight } from "lucide-react";
import { useLocale } from "@/lib/i18n";

export function UseCases() {
  const { t } = useLocale();
  const cases = [
    { icon: Stethoscope, title: t("uc.1.t"), desc: t("uc.1.d") },
    { icon: Scissors, title: t("uc.2.t"), desc: t("uc.2.d") },
    { icon: Smile, title: t("uc.3.t"), desc: t("uc.3.d") },
    { icon: Briefcase, title: t("uc.4.t"), desc: t("uc.4.d") },
    { icon: Wrench, title: t("uc.5.t"), desc: t("uc.5.d") },
    { icon: Store, title: t("uc.6.t"), desc: t("uc.6.d") },
  ];

  const prefersReducedMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });
  // Translate horizontally — push enough to reveal the last card.
  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-66%"]);

  return (
    <section className="bg-paper border-t border-hairline">
      {/* Header */}
      <div className="mx-auto max-w-7xl px-6 pt-28 md:pt-36">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <span className="text-[11px] uppercase tracking-[0.22em] text-ink/55 font-mono">
              {t("uc.eyebrow")}
            </span>
            <h2 className="mt-4 font-display uppercase text-ink text-[clamp(2.25rem,5vw,4.25rem)] leading-[0.95]">
              {t("uc.title.a")} <span className="text-pop">{t("uc.title.b")}</span>
            </h2>
          </div>
          <a href="#contact" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-pop">
            {t("uc.cta")}
            <ArrowUpRight size={16} className="rtl:-scale-x-100" />
          </a>
        </div>
      </div>

      {prefersReducedMotion ? (
        // Reduced motion: plain grid fallback
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px border border-hairline rounded-2xl overflow-hidden"
            style={{ backgroundColor: "rgba(10,10,10,0.10)" }}
          >
            {cases.map((c) => (
              <div key={c.title} className="bg-paper p-8">
                <span className="grid place-items-center size-12 rounded-full bg-ink text-paper">
                  <c.icon size={20} />
                </span>
                <h3 className="mt-6 font-display uppercase text-2xl text-ink">{c.title}</h3>
                <p className="mt-2 text-sm text-ink/60 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Hidden on mobile — horizontal scroll only makes sense with width */}
          <div ref={trackRef} className="hidden md:block relative h-[260vh] mt-16">
            <div className="sticky top-0 h-screen flex items-center overflow-hidden">
              <motion.div style={{ x }} className="flex gap-6 ps-6 pe-[20vw] will-change-transform">
                {cases.map((c, i) => (
                  <div
                    key={c.title}
                    className="group relative shrink-0 w-[72vw] md:w-[44vw] lg:w-[32vw] h-[60vh] rounded-3xl border border-hairline bg-paper p-10 flex flex-col justify-between hover:bg-sand transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <span className="grid place-items-center size-14 rounded-full bg-ink text-paper">
                        <c.icon size={22} />
                      </span>
                      <span className="font-mono text-xs text-ink/40">
                        0{i + 1} / 0{cases.length}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-display uppercase text-[clamp(1.75rem,3vw,2.75rem)] text-ink leading-[0.95]">
                        {c.title}
                      </h3>
                      <p className="mt-4 text-base text-ink/65 leading-relaxed max-w-md">
                        {c.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>
              {/* Scroll hint */}
              <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.3em] text-ink/40">
                {t("uc.eyebrow")} — scroll →
              </div>
            </div>
          </div>

          {/* Mobile fallback — vertical grid */}
          <div className="md:hidden mx-auto max-w-7xl px-6 py-16">
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-px border border-hairline rounded-2xl overflow-hidden"
              style={{ backgroundColor: "rgba(10,10,10,0.10)" }}
            >
              {cases.map((c) => (
                <div key={c.title} className="bg-paper p-8">
                  <span className="grid place-items-center size-12 rounded-full bg-ink text-paper">
                    <c.icon size={20} />
                  </span>
                  <h3 className="mt-6 font-display uppercase text-2xl text-ink">{c.title}</h3>
                  <p className="mt-2 text-sm text-ink/60 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
