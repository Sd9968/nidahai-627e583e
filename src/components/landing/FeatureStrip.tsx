import { Clock, Zap, CalendarCheck, Bell } from "lucide-react";
import { useLocale } from "@/lib/i18n";

export function FeatureStrip() {
  const { t } = useLocale();
  const items = [
    { icon: Clock, title: t("fs.1.t"), desc: t("fs.1.d") },
    { icon: Zap, title: t("fs.2.t"), desc: t("fs.2.d") },
    { icon: CalendarCheck, title: t("fs.3.t"), desc: t("fs.3.d") },
    { icon: Bell, title: t("fs.4.t"), desc: t("fs.4.d") },
  ];

  return (
    <section id="features" className="relative -mt-12 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl bg-cream text-cream-foreground shadow-soft grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-black/5">
          {items.map((it) => (
            <div key={it.title} className="p-6 md:p-8 flex items-start gap-4">
              <span className="grid place-items-center size-11 shrink-0 rounded-2xl bg-fir text-lime">
                <it.icon size={20} />
              </span>
              <div>
                <h3 className="font-display text-lg">{it.title}</h3>
                <p className="mt-1 text-sm text-cream-foreground/70 leading-snug">{it.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
