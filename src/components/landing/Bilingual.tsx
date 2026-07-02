import { Quote } from "lucide-react";
import { useLocale } from "@/lib/i18n";

export function Bilingual() {
  const { t } = useLocale();
  return (
    <section className="bg-ink text-paper py-28 md:py-36 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <span className="text-[11px] uppercase tracking-[0.22em] text-paper/50 font-mono">
            {t("bi.eyebrow")}
          </span>
          <h2 className="mt-4 font-display uppercase text-paper text-[clamp(2.25rem,5vw,4.25rem)] leading-[0.95]">
            {t("bi.title.a")} <span className="text-pop">{t("bi.title.b")}</span> {t("bi.title.c")}
          </h2>
          <p className="mt-6 text-base text-paper/65 leading-relaxed max-w-xl">
            {t("bi.subtitle")}
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card lang="AR" rtl highlight>
            <p className="font-arabic font-extrabold text-2xl md:text-3xl leading-tight text-ink" dir="rtl">
              {t("bi.ar.quote")}
            </p>
          </Card>
          <Card lang="EN">
            <p className="font-display uppercase text-2xl md:text-3xl leading-tight text-ink">
              {t("bi.en.quote")}
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}

function Card({ children, lang, rtl, highlight }: { children: React.ReactNode; lang: string; rtl?: boolean; highlight?: boolean }) {
  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className={`relative rounded-2xl p-8 md:p-10 overflow-hidden ${highlight ? "bg-pop/10 ring-2 ring-pop" : "bg-paper"}`}
    >
      <Quote className={`absolute top-6 right-6 ${highlight ? "text-pop" : "text-pop/40"}`} size={32} />
      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] uppercase tracking-widest font-mono ${highlight ? "bg-pop text-paper" : "border border-hairline text-ink/60"}`}>
        {lang}
      </span>
      <div className="mt-6">{children}</div>
    </div>
  );
}
