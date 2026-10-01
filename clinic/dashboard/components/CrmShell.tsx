"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/analytics", label: "Analytics" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/bookings", label: "Bookings" },
  { href: "/calls", label: "Calls" },
  { href: "/patients", label: "Patients" },
  { href: "/integrations", label: "Integrations" },
  { href: "/settings", label: "Settings" },
];

export function CrmShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const pathname = usePathname();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen">
      <div className="border-b border-sand-200/80 bg-white/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-display text-2xl text-oasis-700">
              NidahAI
            </Link>
            <nav className="flex flex-wrap gap-1 text-sm">
              {NAV.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3 py-1.5 transition ${
                      active
                        ? "bg-oasis-600 text-white"
                        : "text-sand-800/70 hover:bg-sand-100 hover:text-sand-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <button
            onClick={signOut}
            className="text-sm text-sand-800/60 hover:text-sand-900"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-medium text-sand-900">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-sand-800/65">{subtitle}</p>
          )}
        </header>
        {children}
      </div>
    </main>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending_confirmation: "bg-amber-50 text-amber-800 border-amber-200",
    confirmed: "bg-emerald-50 text-emerald-800 border-emerald-200",
    cancelled: "bg-sand-100 text-sand-800 border-sand-200",
    completed: "bg-sky-50 text-sky-800 border-sky-200",
    no_show: "bg-red-50 text-red-800 border-red-200",
    rescheduled: "bg-violet-50 text-violet-800 border-violet-200",
    booked: "bg-emerald-50 text-emerald-800 border-emerald-200",
    escalated: "bg-orange-50 text-orange-800 border-orange-200",
    in_progress: "bg-sky-50 text-sky-800 border-sky-200",
  };
  const label = status.replace(/_/g, " ");
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs capitalize ${
        styles[status] || "bg-sand-50 text-sand-800 border-sand-200"
      }`}
    >
      {label}
    </span>
  );
}
