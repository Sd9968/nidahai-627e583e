import { useState } from "react";
import { Logo } from "./Logo";

const cols = [
  {
    title: "Product",
    links: ["Features", "How It Works", "Pricing", "Languages"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Press", "Partners"],
  },
  {
    title: "Support",
    links: ["Contact", "Help Center", "Status", "Privacy"],
  },
];

export function Footer() {
  const [lang, setLang] = useState<"EN" | "AR">("EN");
  return (
    <footer className="bg-fir-deep border-t border-lime-soft px-6 pt-20 pb-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2">
            <Logo className="text-foreground" />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground leading-relaxed">
              Your 24/7 AI voice agent for smarter appointments.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{c.title}</p>
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
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} KABSA CALL.ai. All rights reserved.
          </p>
          <div className="flex items-center rounded-full border border-lime-soft p-1 text-xs">
            <button
              onClick={() => setLang("EN")}
              className={`px-2.5 py-1 rounded-full transition-colors ${
                lang === "EN" ? "bg-lime text-fir" : "text-muted-foreground"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("AR")}
              className={`px-2.5 py-1 rounded-full transition-colors font-arabic ${
                lang === "AR" ? "bg-lime text-fir" : "text-muted-foreground"
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
