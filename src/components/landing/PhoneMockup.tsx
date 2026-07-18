import { Mic, MicOff, Phone, PhoneOff, Volume2, Loader2 } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { formatDuration, useTwilioCall } from "@/lib/twilio-call";

export function PhoneMockup() {
  const { t } = useLocale();
  const { status, error, isMuted, duration, start, hangup, toggleMute } = useTwilioCall();

  const isConnecting = status === "connecting" || status === "ringing";
  const isLive = status === "in-call";
  const isIdle = status === "idle" || status === "ended" || status === "error";

  const timerLabel = isLive
    ? formatDuration(duration)
    : isConnecting
      ? t("phone.connecting")
      : status === "ended"
        ? t("phone.ended")
        : "00:00";

  const pillLabel = isLive
    ? t("phone.listening")
    : isConnecting
      ? t("phone.connecting")
      : t("phone.tap");

  return (
    <div className="relative mx-auto w-[280px] sm:w-[320px]">
      <div className="absolute -inset-10 -z-10 rounded-full bg-pop/15 blur-3xl" />

      <div className="relative rounded-[2.75rem] bg-ink p-3 shadow-soft">
        <div className="relative overflow-hidden rounded-[2.25rem] bg-sand aspect-[9/19]">
          <div className="absolute left-1/2 top-2 -translate-x-1/2 h-6 w-24 rounded-full bg-ink" />

          <div className="flex items-center justify-between px-6 pt-3 text-[10px] text-ink/60 font-mono">
            <span>9:41</span>
            <span>•••</span>
          </div>

          <div className="flex h-full flex-col items-center justify-between px-6 pt-14 pb-8">
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-[0.22em] text-ink/55 font-mono">
                {isLive ? t("phone.oncall") : t("phone.incoming")}
              </p>
              <p className="mt-2 font-display uppercase text-lg text-ink">
                Nidah<span className="text-pop">AI</span>
              </p>
              <p className="mt-1 text-xs text-ink/55 font-mono">{timerLabel}</p>
            </div>

            <div className="flex flex-col items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium ${
                  isLive ? "bg-ink text-paper" : "bg-ink/10 text-ink"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    isLive ? "bg-pop animate-pulse" : isConnecting ? "bg-pop animate-pulse" : "bg-ink/40"
                  }`}
                />
                {pillLabel}
              </span>
              <div className="flex items-end gap-1 h-10">
                {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8, 0.4, 0.7].map((d, i) => (
                  <span
                    key={i}
                    className="waveform-bar w-1 rounded-full bg-ink origin-bottom"
                    style={{
                      height: `${d * 100}%`,
                      animationDelay: `${i * 0.08}s`,
                      animationPlayState: isLive ? "running" : "paused",
                      opacity: isLive ? 1 : 0.35,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-5">
              <button
                type="button"
                onClick={toggleMute}
                disabled={!isLive}
                className="grid place-items-center size-12 rounded-full bg-ink/10 text-ink disabled:opacity-40 transition"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {isIdle ? (
                <button
                  type="button"
                  onClick={start}
                  className="grid place-items-center size-14 rounded-full bg-pop text-paper shadow-pop hover:scale-105 transition-transform"
                  aria-label={t("phone.callcta")}
                >
                  <Phone size={20} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={hangup}
                  className="grid place-items-center size-14 rounded-full bg-red-600 text-paper shadow-pop hover:scale-105 transition-transform"
                  aria-label={t("phone.hangup")}
                >
                  {isConnecting ? <Loader2 size={20} className="animate-spin" /> : <PhoneOff size={20} />}
                </button>
              )}

              <button
                type="button"
                disabled
                className="grid place-items-center size-12 rounded-full bg-ink/10 text-ink opacity-60"
                aria-label="Speaker"
              >
                <Volume2 size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CTA + fallback below the phone */}
      <div className="mt-6 flex flex-col items-center gap-2">
        {isIdle && (
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-pop transition-colors"
          >
            <Phone size={16} />
            {t("phone.callcta")}
          </button>
        )}
        <a
          href="tel:+16206708352"
          className="text-[11px] uppercase tracking-[0.18em] font-mono text-ink/55 hover:text-pop transition-colors"
        >
          {t("phone.dial")} +1 620 670 8352
        </a>
        {error && (
          <p className="text-[11px] text-red-600 font-mono" role="alert">
            {error === "mic_blocked" ? t("phone.err.mic") : t("phone.err.generic")}
          </p>
        )}
      </div>

      <Bubble className="absolute -left-16 sm:-left-28 top-16 float-slow" delay="0s">
        {t("phone.bubble1")}
      </Bubble>
      <Bubble className="absolute -right-10 sm:-right-24 top-40 float-slow bg-pop !text-paper" delay="1s">
        {t("phone.bubble2")}
      </Bubble>
    </div>
  );
}

function Bubble({
  children,
  className = "",
  delay = "0s",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: string;
}) {
  return (
    <div
      style={{ animationDelay: delay }}
      className={`hidden sm:block max-w-[180px] rounded-2xl bg-paper text-ink px-3.5 py-2 text-xs leading-snug shadow-soft border border-hairline ${className}`}
    >
      {children}
    </div>
  );
}
