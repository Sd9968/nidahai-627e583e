import { ArrowRight, PlayCircle } from "lucide-react";
import { PhoneMockup } from "./PhoneMockup";
import { useLocale } from "@/lib/i18n";
import { useBookDemo } from "@/lib/book-demo-context";

export function Hero() {
  const { t } = useLocale();
  const { openDialog } = useBookDemo();

  return (
    <section
      id="home"
      className="relative overflow-hidden bg-paper pt-32 pb-20 md:pt-40 md:pb-28"
    >
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-16 lg:gap-12 px-6 items-center">
        <div className="fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-hairline px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-ink/60 font-mono">
            <span className="size-1.5 rounded-full bg-pop animate-pulse" />
            {t("hero.badge")}
          </span>

          <h1 className="mt-6 font-display uppercase text-ink leading-[0.92] text-[clamp(3rem,8vw,6.5rem)]">
            {t("hero.title.a")}{" "}
            <span className="text-pop">{t("hero.title.b")}</span>
            <br />
            {t("hero.title.c")}
          </h1>

          <p className="mt-8 max-w-md text-base text-ink/70 leading-relaxed">
            {t("hero.subtitle")}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={openDialog}
              className="group inline-flex items-center gap-3 rounded-full bg-ink py-2 ps-6 pe-2 text-sm font-medium text-paper hover:bg-pop transition-colors"
            >
              {t("hero.cta.book")}
              <span className="grid place-items-center size-10 rounded-full bg-paper text-ink group-hover:rotate-[-12deg] transition-transform">
                <ArrowRight size={16} className="rtl:-scale-x-100" />
              </span>
            </button>
            <a
              href="#how"
              className="inline-flex items-center gap-2 text-sm font-medium text-ink hover:text-pop transition-colors"
            >
              <PlayCircle size={18} />
              {t("hero.cta.demo")}
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
