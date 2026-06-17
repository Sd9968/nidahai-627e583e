import { Logo } from "./Logo";
import { useLocale } from "@/lib/i18n";

export function Footer() {
  const { t, locale, setLocale } = useLocale();
  const cols = [
    {
      title: t("footer.col.product"),
      links: [t("footer.l.features"), t("footer.l.how"), t("footer.l.pricing"), t("footer.l.languages")],
    },
    {
      title: t("footer.col.company"),
      links: [t("footer.l.about"), t("footer.l.careers"), t("footer.l.press"), t("footer.l.partners")],
    },
    {
      title: t("footer.col.support"),
      links: [t("footer.l.contact"), t("footer.l.help"), t("footer.l.status"), t("footer.l.privacy")],
    },
  ];

  return (
    <footer className="bg-fir-deep border-t border-lime-soft px-6 pt-20 pb-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2">
            <Logo className="text-foreground" />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground leading-relaxed">
              {t("footer.tagline")}
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">{c.title}</p>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-foreground/80 hover:text-lime transition-colors">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-8 border-t border-lime-soft">
          <p className="text-xs text-muted-foreground font-mono">
            © {new Date().getFullYear()} KABSA CALL.ai — {t("footer.rights")}
          </p>
          <div className="flex items-center rounded-full border border-lime-soft p-1 text-xs">
            <button
              onClick={() => setLocale("en")}
              className={`px-2.5 py-1 rounded-full transition-colors ${
                locale === "en" ? "bg-lime text-fir" : "text-muted-foreground"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLocale("ar")}
              className={`px-2.5 py-1 rounded-full transition-colors font-arabic ${
                locale === "ar" ? "bg-lime text-fir" : "text-muted-foreground"
              }`}
            >
              العربية
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
