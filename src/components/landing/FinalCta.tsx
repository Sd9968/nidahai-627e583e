import { ArrowRight } from "lucide-react";
import { useLocale } from "@/lib/i18n";

export function FinalCta() {
  const { t } = useLocale();
  return (
    <section id="contact" className="relative overflow-hidden bg-fir-deep py-28 md:py-40 px-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(50% 60% at 50% 50%, oklch(0.92 0.18 122 / 0.18) 0%, transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-4xl text-center">
        <h2 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.05] text-foreground">
          {t("cta.title.a")} <em className="not-italic text-lime">{t("cta.title.b")}</em>
        </h2>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {t("cta.subtitle")}
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3.5 text-sm font-medium text-fir hover:shadow-lime transition-shadow"
          >
            {t("cta.book")}
            <ArrowRight size={16} className="rtl:-scale-x-100" />
          </a>
          <a
            href="mailto:hello@kabsacall.ai"
            className="inline-flex items-center gap-2 rounded-full border border-lime-soft px-6 py-3.5 text-sm font-medium text-foreground hover:bg-fir-2 transition-colors"
          >
            {t("cta.contact")}
          </a>
        </div>
      </div>
    </section>
  );
}
