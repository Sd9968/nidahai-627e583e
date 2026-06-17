import { Check } from "lucide-react";
import { useLocale } from "@/lib/i18n";

export function Benefits() {
  const { t } = useLocale();
  const bullets = [t("ben.b1"), t("ben.b2"), t("ben.b3"), t("ben.b4"), t("ben.b5"), t("ben.b6")];
  const metrics = [
    { value: t("ben.m1.v"), label: t("ben.m1.l") },
    { value: t("ben.m2.v"), label: t("ben.m2.l") },
    { value: t("ben.m3.v"), label: t("ben.m3.l") },
    { value: t("ben.m4.v"), label: t("ben.m4.l") },
  ];

  return (
    <section id="benefits" className="bg-fir py-28 md:py-36 px-6">
      <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        <div>
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-mono">
            {t("ben.eyebrow")}
          </span>
          <h2 className="mt-3 font-display text-4xl md:text-5xl leading-tight text-foreground">
            {t("ben.title.a")} <em className="not-italic text-lime">{t("ben.title.b")}</em>
          </h2>
          <ul className="mt-10 space-y-4">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3 text-foreground/90">
                <span className="mt-0.5 grid place-items-center size-6 shrink-0 rounded-full bg-lime/15 text-lime">
                  <Check size={14} strokeWidth={3} />
                </span>
                <span className="text-base">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-3xl bg-fir-deep border border-lime-soft p-6 md:p-8 hover:border-lime/60 transition-colors"
            >
              <p className="font-display text-4xl md:text-5xl text-lime">{m.value}</p>
              <p className="mt-3 text-sm text-muted-foreground leading-snug">{m.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
