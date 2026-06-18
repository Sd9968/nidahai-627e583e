import { useEffect, useState } from "react";
import { Menu, X, Sun, Moon } from "lucide-react";
import { Logo } from "./Logo";
import { useLocale } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export function Navbar() {
  const { t, locale, setLocale } = useLocale();
  const { theme, toggle } = useTheme();
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
        scrolled ? "bg-paper/90 backdrop-blur-md border-b border-hairline" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:py-5">
        <Logo className="text-ink" />

        <nav className="hidden lg:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-ink/70 hover:text-ink transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="grid place-items-center size-9 rounded-full border border-hairline text-ink hover:bg-sand transition-colors"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <div className="hidden md:flex items-center rounded-full border border-hairline p-1 text-xs">
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

          <a
            href="#contact"
            className="hidden sm:inline-flex items-center rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-pop transition-colors"
          >
            {t("nav.cta")}
          </a>

          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 text-ink"
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-hairline bg-paper">
          <nav className="flex flex-col p-6 gap-4">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-base text-ink/80 hover:text-ink"
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
