import { Clock, Zap, CalendarCheck, Bell } from "lucide-react";

const items = [
  { icon: Clock, title: "24/7 Availability", desc: "Always on, never misses a call." },
  { icon: Zap, title: "Under 500ms Latency", desc: "Conversations that feel human." },
  { icon: CalendarCheck, title: "Smart Scheduling", desc: "Book, modify, reschedule, cancel." },
  { icon: Bell, title: "Instant Notifications", desc: "Confirm by phone after every call." },
];

export function FeatureStrip() {
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
