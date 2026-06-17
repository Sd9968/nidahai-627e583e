import { Mic, PhoneOff, Volume2 } from "lucide-react";

export function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[280px] sm:w-[320px]">
      {/* Glow */}
      <div className="absolute -inset-10 -z-10 rounded-full bg-lime/20 blur-3xl" />

      {/* Phone */}
      <div className="relative rounded-[2.75rem] bg-[#0a0a0a] p-3 shadow-soft ring-1 ring-white/10">
        <div className="relative overflow-hidden rounded-[2.25rem] bg-gradient-to-b from-[#062F24] to-[#001E17] aspect-[9/19]">
          {/* Notch */}
          <div className="absolute left-1/2 top-2 -translate-x-1/2 h-6 w-24 rounded-full bg-black/80" />

          {/* Status bar */}
          <div className="flex items-center justify-between px-6 pt-3 text-[10px] text-white/70">
            <span>9:41</span>
            <span>•••</span>
          </div>

          {/* Content */}
          <div className="flex h-full flex-col items-center justify-between px-6 pt-14 pb-8">
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Incoming call
              </p>
              <p className="mt-2 font-display text-lg text-foreground">KABSA CALL<span className="text-lime">.ai</span></p>
              <p className="mt-1 text-xs text-muted-foreground">00 : 42</p>
            </div>

            {/* Listening + waveform */}
            <div className="flex flex-col items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-lime/15 px-3 py-1 text-[11px] font-medium text-lime">
                <span className="size-1.5 rounded-full bg-lime animate-pulse" />
                Listening...
              </span>
              <div className="flex items-end gap-1 h-10">
                {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8, 0.4, 0.7].map((d, i) => (
                  <span
                    key={i}
                    className="waveform-bar w-1 rounded-full bg-lime origin-bottom"
                    style={{ height: `${d * 100}%`, animationDelay: `${i * 0.08}s` }}
                  />
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-5">
              <button className="grid place-items-center size-12 rounded-full bg-white/10 text-white" aria-label="Mute">
                <Mic size={18} />
              </button>
              <button className="grid place-items-center size-14 rounded-full bg-[#ff453a] text-white shadow-soft" aria-label="End">
                <PhoneOff size={20} />
              </button>
              <button className="grid place-items-center size-12 rounded-full bg-white/10 text-white" aria-label="Speaker">
                <Volume2 size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating bubbles */}
      <Bubble className="absolute -left-16 sm:-left-28 top-16 float-slow" delay="0s">
        Hello! How can I help you today?
      </Bubble>
      <Bubble className="absolute -right-10 sm:-right-24 top-40 float-slow bg-lime !text-fir" delay="1s">
        I'd like to book an appointment.
      </Bubble>
      <Bubble
        className="absolute -left-12 sm:-left-24 bottom-32 float-slow font-arabic"
        dir="rtl"
        delay="2s"
      >
        مرحبا، كيف يمكنني مساعدتك؟
      </Bubble>
      <Bubble
        className="absolute -right-8 sm:-right-20 bottom-10 float-slow font-arabic bg-lime !text-fir"
        dir="rtl"
        delay="3s"
      >
        أود حجز موعد.
      </Bubble>
    </div>
  );
}

function Bubble({
  children,
  className = "",
  delay = "0s",
  dir,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: string;
  dir?: "rtl" | "ltr";
}) {
  return (
    <div
      dir={dir}
      style={{ animationDelay: delay }}
      className={`hidden sm:block max-w-[180px] rounded-2xl bg-cream text-cream-foreground px-3.5 py-2 text-xs leading-snug shadow-soft ring-1 ring-black/5 ${className}`}
    >
      {children}
    </div>
  );
}
