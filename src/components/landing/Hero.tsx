import { ArrowRight, PlayCircle, Clock, Zap, Globe, Bell } from "lucide-react";
import { PhoneMockup } from "./PhoneMockup";
import { useLocale } from "@/lib/i18n";

export function Hero() {
  const { t } = useLocale();
  const pills = [
    { icon: Clock, label: t("hero.pill.available") },
    { icon: Zap, label: t("hero.pill.latency") },
    { icon: Globe, label: t("hero.pill.languages") },
    { icon: Bell, label: t("hero.pill.notify") },
  ];

  return (
    <section
      id="home"
      className="relative overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32"
      style={{ background: "var(--gradient-fir)" }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[900px] rounded-full bg-lime/10 blur-[120px]" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-10 px-6 items-center">
        <div className="fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-lime-soft bg-fir-2/40 px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-lime animate-pulse" />
            {t("hero.badge")}
          </span>

          <h1 className="mt-6 font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.02] text-foreground">
            {t("hero.title.a")} <em className="not-italic text-lime">{t("hero.title.b")}</em>
            <br />
            {t("hero.title.c")}
          </h1>

          <p className="mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed">
            {t("hero.subtitle")}
          </p>

          <div className="mt-8 flex flex-wrap gap-2.5">
            {pills.map((p) => (
              <span
                key={p.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-lime-soft bg-fir-2/30 px-3 py-1.5 text-xs text-foreground/90"
              >
                <p.icon size={13} className="text-lime" />
                {p.label}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-full border border-lime-soft px-5 py-3 text-sm font-medium text-foreground hover:bg-fir-2 transition-colors"
            >
              <PlayCircle size={18} />
              {t("hero.cta.demo")}
            </a>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-3 text-sm font-medium text-fir hover:shadow-lime transition-shadow"
            >
              {t("hero.cta.book")}
              <ArrowRight size={16} className="rtl:-scale-x-100" />
            </a>
          </div>
        </div>

        <div className="relative fade-up">
          <PhoneMockup />
        </div>
      </div>
    </section>
  );
}
