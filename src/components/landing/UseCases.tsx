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
    <section className="bg-paper py-28 md:py-36 px-6 border-t border-hairline">
      <div className="mx-auto max-w-7xl">
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

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-hairline border border-hairline rounded-2xl overflow-hidden" style={{ backgroundColor: "rgba(10,10,10,0.10)" }}>
          {cases.map((c) => (
            <div
              key={c.title}
              className="group bg-paper p-8 hover:bg-sand transition-colors"
            >
              <span className="grid place-items-center size-12 rounded-full bg-ink text-paper">
                <c.icon size={20} />
              </span>
              <h3 className="mt-6 font-display uppercase text-2xl text-ink">{c.title}</h3>
              <p className="mt-2 text-sm text-ink/60 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
