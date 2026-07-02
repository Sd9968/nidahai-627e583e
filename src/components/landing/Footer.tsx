import { Logo } from "./Logo";
import { useLocale } from "@/lib/i18n";

export function Footer() {
  const { t, locale, setLocale } = useLocale();
  const cols = [
    {
      title: t("footer.col.product"),
      links: [t("footer.l.features"), t("footer.l.how"), t("footer.l.languages")],
    },
    {
      title: t("footer.col.company"),
      links: [t("footer.l.about")],
    },
  ];


  return (
    <footer className="bg-paper border-t border-hairline px-6 pt-20 pb-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2">
            <Logo className="text-ink" />
            <p className="mt-4 max-w-xs text-sm text-ink/60 leading-relaxed">
              {t("footer.tagline")}
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <p className="text-[11px] uppercase tracking-[0.2em] text-ink/55 font-mono">{c.title}</p>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-ink/80 hover:text-pop transition-colors">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-8 border-t border-hairline">
          <p className="text-xs text-ink/55 font-mono">
            © {new Date().getFullYear()} NidahAI — {t("footer.rights")}
          </p>
          <div className="flex items-center rounded-full border border-hairline p-1 text-xs">
            <button
              onClick={() => setLocale("en")}
              className={`px-2.5 py-1 rounded-full transition-colors ${
                locale === "en" ? "bg-ink text-paper" : "text-ink/60"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLocale("ar")}
              className={`px-2.5 py-1 rounded-full transition-colors font-arabic ${
                locale === "ar" ? "bg-ink text-paper" : "text-ink/60"
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
