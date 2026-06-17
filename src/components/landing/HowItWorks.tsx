import { PhoneIncoming, Bot, CalendarCheck, BellRing } from "lucide-react";

const steps = [
  { icon: PhoneIncoming, title: "Customer Calls", desc: "A customer dials your number — anytime, any day." },
  { icon: Bot, title: "AI Voice Agent Answers", desc: "KABSA CALL.ai greets and understands them naturally." },
  { icon: CalendarCheck, title: "Appointment Handled", desc: "Booked, modified, rescheduled, or cancelled in the call." },
  { icon: BellRing, title: "Notification Sent", desc: "Your team and the customer get an instant confirmation." },
];

export function HowItWorks() {
  return (
    <section id="how" className="bg-cream text-cream-foreground py-28 md:py-36 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <span className="text-xs uppercase tracking-[0.2em] text-cream-foreground/60">How it works</span>
          <h2 className="mt-3 font-display text-4xl md:text-5xl leading-tight">
            One phone line. <em className="not-italic text-fir/70">Four simple steps.</em>
          </h2>
        </div>

        <div className="relative mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* connecting line on lg */}
          <div className="hidden lg:block absolute top-7 left-[12.5%] right-[12.5%] border-t border-dashed border-fir/20" />
          {steps.map((s, i) => (
            <div key={s.title} className="relative">
              <div className="flex items-center gap-3">
                <span className="grid place-items-center size-14 rounded-2xl bg-fir text-lime shadow-soft">
                  <s.icon size={22} />
                </span>
                <span className="font-display text-2xl text-fir/30">0{i + 1}</span>
              </div>
              <h3 className="mt-5 font-display text-xl">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-cream-foreground/70">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
