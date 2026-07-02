import { Check } from "lucide-react";
import { useLocale } from "@/lib/i18n";

export function Benefits() {
  const { t } = useLocale();
  const bullets = [t("ben.b1"), t("ben.b2"), t("ben.b3"), t("ben.b4"), t("ben.b5"), t("ben.b6")];
  const metrics = [
    { value: t("ben.m1.v"), label: t("ben.m1.l") },
    { value: t("ben.m3.v"), label: t("ben.m3.l") },
    { value: t("ben.m4.v"), label: t("ben.m4.l") },
  ];

  return (
    <section id="benefits" className="bg-sand py-28 md:py-36 px-6">
      <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        <div>
          <span className="text-[11px] uppercase tracking-[0.22em] text-ink/55 font-mono">
            {t("ben.eyebrow")}
          </span>
          <h2 className="mt-4 font-display uppercase text-ink text-[clamp(2.25rem,5vw,4.25rem)] leading-[0.95]">
            {t("ben.title.a")} <span className="text-pop">{t("ben.title.b")}</span>
          </h2>
          <ul className="mt-10 space-y-4">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3 text-ink">
                <span className="mt-0.5 grid place-items-center size-6 shrink-0 rounded-full bg-ink text-paper">
                  <Check size={13} strokeWidth={3} />
                </span>
                <span className="text-base">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-2xl bg-paper border border-hairline p-7 md:p-8 hover:border-ink/40 transition-colors"
            >
              <p className="font-display uppercase text-5xl md:text-6xl text-ink leading-none">{m.value}</p>
              <p className="mt-4 text-sm text-ink/60 leading-snug uppercase tracking-wide">{m.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
