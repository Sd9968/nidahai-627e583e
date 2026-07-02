import { ArrowRight } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { useBookDemo } from "@/lib/book-demo-context";

export function ComingSoon() {
  const { t } = useLocale();
  const { openDialog } = useBookDemo();

  return (
    <section className="bg-ink text-paper py-24 md:py-32 px-6 overflow-hidden">
      <div className="mx-auto max-w-6xl">
        <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-paper/50 font-mono">
          <span className="size-1.5 rounded-full bg-pop animate-pulse" />
          {t("coming.ar.eyebrow")}
        </span>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
          <div dir="rtl">
            <h2 className="font-arabic font-extrabold text-[clamp(3rem,9vw,7rem)] leading-[0.95] text-pop">
              {t("coming.ar.title")}
            </h2>
            <p className="mt-5 text-lg md:text-xl text-paper/70 leading-relaxed font-arabic">
              {t("coming.ar.subtitle")}
            </p>
          </div>

          <div className="md:pt-2">
            <span className="block text-[11px] uppercase tracking-[0.22em] text-paper/50 font-mono">
              {t("coming.en.eyebrow")}
            </span>
            <h2 className="mt-4 font-display uppercase text-[clamp(3rem,9vw,7rem)] leading-[0.95]">
              <span className="text-paper">{t("coming.en.title.a")}</span>{" "}
              <span className="text-pop">{t("coming.en.title.b")}</span>
            </h2>
            <p className="mt-5 text-lg md:text-xl text-paper/70 leading-relaxed">
              {t("coming.en.subtitle")}
            </p>
          </div>
        </div>

        <div className="mt-16 flex justify-center">
          <button
            type="button"
            onClick={openDialog}
            className="group inline-flex items-center gap-3 rounded-full bg-paper py-2 ps-6 pe-2 text-sm font-medium text-ink hover:bg-pop hover:text-paper transition-colors"
          >
            {t("coming.cta")}
            <span className="grid place-items-center size-10 rounded-full bg-ink text-paper group-hover:rotate-[-12deg] transition-transform">
              <ArrowRight size={16} className="rtl:-scale-x-100" />
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
