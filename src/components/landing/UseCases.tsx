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

  return (
    <section className="bg-fir py-28 md:py-36 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-mono">
              {t("uc.eyebrow")}
            </span>
            <h2 className="mt-3 font-display text-4xl md:text-5xl leading-tight text-foreground">
              {t("uc.title.a")} <em className="not-italic text-lime">{t("uc.title.b")}</em>
            </h2>
          </div>
          <a href="#contact" className="inline-flex items-center gap-1.5 text-sm text-lime hover:underline">
            {t("uc.cta")}
            <ArrowUpRight size={14} className="rtl:-scale-x-100" />
          </a>
        </div>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cases.map((c) => (
            <div
              key={c.title}
              className="group rounded-3xl border border-lime-soft bg-fir-deep p-7 hover:border-lime/60 hover:-translate-y-1 transition-all duration-300"
            >
              <span className="grid place-items-center size-12 rounded-2xl bg-lime/10 text-lime">
                <c.icon size={22} />
              </span>
              <h3 className="mt-6 font-display text-2xl text-foreground">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
