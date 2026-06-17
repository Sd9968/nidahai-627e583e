import { Quote } from "lucide-react";
import { useLocale } from "@/lib/i18n";

export function Bilingual() {
  const { t } = useLocale();
  return (
    <section className="bg-cream text-cream-foreground py-28 md:py-36 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <span className="text-xs uppercase tracking-[0.2em] text-cream-foreground/60 font-mono">
            {t("bi.eyebrow")}
          </span>
          <h2 className="mt-3 font-display text-4xl md:text-5xl leading-tight">
            {t("bi.title.a")} <em className="not-italic">{t("bi.title.b")}</em> {t("bi.title.c")}
          </h2>
          <p className="mt-5 text-base text-cream-foreground/70 leading-relaxed">
            {t("bi.subtitle")}
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card lang="EN">
            <p className="font-display text-2xl md:text-3xl leading-snug">
              {t("bi.en.quote")}
            </p>
          </Card>
          <Card lang="AR" rtl>
            <p className="font-arabic text-2xl md:text-3xl leading-snug" dir="rtl">
              {t("bi.ar.quote")}
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}

function Card({ children, lang, rtl }: { children: React.ReactNode; lang: string; rtl?: boolean }) {
  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="relative rounded-3xl bg-fir text-foreground p-8 md:p-10 shadow-soft overflow-hidden"
    >
      <Quote className="absolute top-6 right-6 text-lime/30" size={36} />
      <span className="inline-flex items-center rounded-full border border-lime-soft px-2.5 py-1 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
        {lang}
      </span>
      <div className="mt-6">{children}</div>
    </div>
  );
}
