import { Clock, CalendarCheck, Bell } from "lucide-react";
import { useLocale } from "@/lib/i18n";

export function FeatureStrip() {
  const { t } = useLocale();
  const items = [
    { icon: Clock, title: t("fs.1.t"), desc: t("fs.1.d") },
    { icon: CalendarCheck, title: t("fs.3.t"), desc: t("fs.3.d") },
    { icon: Bell, title: t("fs.4.t"), desc: t("fs.4.d") },
  ];

  return (
    <section id="features" className="relative bg-paper px-6 py-10 border-y border-hairline">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-8 sm:divide-x divide-hairline">
          {items.map((it) => (
            <div key={it.title} className="px-6 flex items-start gap-4">
              <span className="grid place-items-center size-10 shrink-0 rounded-full bg-ink text-paper">
                <it.icon size={16} />
              </span>
              <div>
                <h3 className="font-display uppercase text-base text-ink tracking-tight">{it.title}</h3>
                <p className="mt-1 text-xs text-ink/60 leading-snug">{it.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
