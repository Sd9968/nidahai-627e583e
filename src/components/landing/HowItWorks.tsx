import { PhoneIncoming, Bot, CalendarCheck, BellRing } from "lucide-react";
import { useLocale } from "@/lib/i18n";

export function HowItWorks() {
  const { t } = useLocale();
  const steps = [
    { icon: PhoneIncoming, title: t("how.1.t"), desc: t("how.1.d") },
    { icon: Bot, title: t("how.2.t"), desc: t("how.2.d") },
    { icon: CalendarCheck, title: t("how.3.t"), desc: t("how.3.d") },
    { icon: BellRing, title: t("how.4.t"), desc: t("how.4.d") },
  ];

  return (
    <section id="how" className="bg-paper py-28 md:py-36 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <span className="text-[11px] uppercase tracking-[0.22em] text-ink/55 font-mono">
            {t("how.eyebrow")}
          </span>
          <h2 className="mt-4 font-display uppercase text-ink text-[clamp(2.25rem,5vw,4.25rem)] leading-[0.95]">
            {t("how.title.a")} <span className="text-pop">{t("how.title.b")}</span>
          </h2>
        </div>

        <div className="relative mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
          {steps.map((s, i) => (
            <div key={s.title} className="relative border-t border-ink pt-6">
              <div className="flex items-center justify-between">
                <span className="grid place-items-center size-12 rounded-full bg-ink text-paper">
                  <s.icon size={18} />
                </span>
                <span className="font-display text-3xl text-ink/15">0{i + 1}</span>
              </div>
              <h3 className="mt-6 font-display uppercase text-xl text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
