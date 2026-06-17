import { Stethoscope, Scissors, Smile, Briefcase, Wrench, Store, ArrowUpRight } from "lucide-react";

const cases = [
  { icon: Stethoscope, title: "Clinics", desc: "Book patient visits, send reminders, and free your front desk for in-person care." },
  { icon: Scissors, title: "Salons", desc: "Let clients book or change appointments any time without interrupting service." },
  { icon: Smile, title: "Dental Offices", desc: "Handle check-ups, cleanings, and rescheduling without phone-tag." },
  { icon: Briefcase, title: "Consulting", desc: "Qualify callers and put discovery calls straight on your calendar." },
  { icon: Wrench, title: "Home Services", desc: "Take service requests and dispatch slots while your team is on the job." },
  { icon: Store, title: "Small Businesses", desc: "A 24/7 receptionist that scales with your bookings, not your headcount." },
];

export function UseCases() {
  return (
    <section className="bg-fir py-28 md:py-36 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Use cases</span>
            <h2 className="mt-3 font-display text-4xl md:text-5xl leading-tight text-foreground">
              Made for any business <em className="not-italic text-lime">that books by phone.</em>
            </h2>
          </div>
          <a href="#contact" className="inline-flex items-center gap-1.5 text-sm text-lime hover:underline">
            Don't see yours? Talk to us
            <ArrowUpRight size={14} />
          </a>
        </div>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cases.map((c) => (
            <div
              key={c.title}
              className="group rounded-3xl border border-lime-soft bg-fir-deep p-7 hover:border-lime/60 hover:-translate-y-1 transition-all duration-300"
            >
              <span className="grid place-items-center size-12 rounded-2xl bg-lime/10 text-lime">
                <c.icon size={22} />
              </span>
              <h3 className="mt-6 font-display text-2xl text-foreground">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
