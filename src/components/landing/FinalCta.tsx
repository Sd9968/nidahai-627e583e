import { ArrowRight } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { useBookDemo } from "@/lib/book-demo-context";

export function FinalCta() {
  const { t } = useLocale();
  const { openDialog } = useBookDemo();
  return (
    <section id="contact" className="relative overflow-hidden bg-ink py-28 md:py-40 px-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(45% 55% at 50% 50%, rgba(255,106,26,0.22) 0%, transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-4xl text-center">
        <h2 className="font-display uppercase text-paper text-[clamp(2.5rem,7vw,5.5rem)] leading-[0.95]">
          {t("cta.title.a")} <span className="text-pop">{t("cta.title.b")}</span>
        </h2>
        <p className="mt-8 text-base md:text-lg text-paper/65 max-w-xl mx-auto leading-relaxed">
          {t("cta.subtitle")}
        </p>
        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <button
            type="button"
            onClick={openDialog}
            className="group inline-flex items-center gap-3 rounded-full bg-paper py-2 ps-6 pe-2 text-sm font-medium text-ink hover:bg-pop hover:text-paper transition-colors"
          >
            {t("cta.book")}
            <span className="grid place-items-center size-10 rounded-full bg-ink text-paper group-hover:rotate-[-12deg] transition-transform">
              <ArrowRight size={16} className="rtl:-scale-x-100" />
            </span>
          </button>
          <a
            href="mailto:hello@yaran.ai"
            className="inline-flex items-center gap-2 rounded-full border border-paper/25 px-6 py-3 text-sm font-medium text-paper hover:bg-paper/10 transition-colors"
          >
            {t("cta.contact")}
          </a>
        </div>
      </div>
    </section>
  );
}
