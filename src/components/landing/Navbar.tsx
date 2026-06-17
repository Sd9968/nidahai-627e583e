import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { useLocale } from "@/lib/i18n";

export function Navbar() {
  const { t, locale, setLocale } = useLocale();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const links = [
    { href: "#home", label: t("nav.home") },
    { href: "#features", label: t("nav.features") },
    { href: "#how", label: t("nav.how") },
    { href: "#benefits", label: t("nav.benefits") },
    { href: "#pricing", label: t("nav.pricing") },
    { href: "#contact", label: t("nav.contact") },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "backdrop-blur-xl bg-fir-deep/75 border-b border-lime-soft" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:py-5">
        <Logo className="text-foreground" />

        <nav className="hidden lg:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center rounded-full border border-lime-soft p-1 text-xs">
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

          <a
            href="#contact"
            className="hidden sm:inline-flex items-center rounded-full bg-lime px-4 py-2 text-sm font-medium text-fir hover:shadow-lime transition-shadow"
          >
            {t("nav.cta")}
          </a>

          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 text-foreground"
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-lime-soft bg-fir-deep/95 backdrop-blur-xl">
          <nav className="flex flex-col p-6 gap-4">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-base text-muted-foreground hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
