import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n";

const FRAME_COUNT = 61;
const frameSrc = (i: number) =>
  `/phone-sequence/f${String(i).padStart(3, "0")}.jpg`;

export function ScrollSequence() {
  const { t } = useLocale();
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const currentRef = useRef(0);
  const targetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Preload all frames
  useEffect(() => {
    let cancelled = false;
    let done = 0;
    const imgs: HTMLImageElement[] = [];
    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = new Image();
      img.src = frameSrc(i);
      img.onload = img.onerror = () => {
        done += 1;
        if (done === FRAME_COUNT && !cancelled) setLoaded(true);
      };
      imgs.push(img);
    }
    imagesRef.current = imgs;
    return () => {
      cancelled = true;
    };
  }, []);

  // Draw a given frame index
  const drawFrame = (index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = imagesRef.current[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // contain
    const ir = img.naturalWidth / img.naturalHeight;
    const cr = canvas.width / canvas.height;
    let dw, dh;
    if (cr > ir) {
      dh = canvas.height;
      dw = dh * ir;
    } else {
      dw = canvas.width;
      dh = dw / ir;
    }
    const dx = (canvas.width - dw) / 2;
    const dy = (canvas.height - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  };

  // Scroll listener -> targetRef
  useEffect(() => {
    const onScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // progress: 0 when section top hits top of viewport, 1 when bottom of section minus 1vh hits top
      const total = el.offsetHeight - vh;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      const progress = total > 0 ? scrolled / total : 0;
      targetRef.current = progress * (FRAME_COUNT - 1);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Smooth animation loop
  useEffect(() => {
    const tick = () => {
      const current = currentRef.current;
      const target = targetRef.current;
      const next = current + (target - current) * 0.18;
      currentRef.current = next;
      const idx = Math.round(next);
      drawFrame(Math.max(0, Math.min(FRAME_COUNT - 1, idx)));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [loaded]);

  return (
    <section
      ref={sectionRef}
      id="sequence"
      className="relative bg-paper"
      style={{ height: "300vh" }}
      aria-label="Product showcase"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div className="absolute inset-0 mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-2 items-center px-6 gap-8">
          {/* Text rail (advances with scroll via CSS opacity stages) */}
          <div className="hidden lg:flex flex-col gap-10 pointer-events-none">
            <SequenceCopy
              eyebrow={t("hero.badge")}
              title={t("seq.step1.title", "Calls answered instantly")}
              body={t("seq.step1.body", "Your AI concierge picks up in under 500ms, day or night.")}
              progressStart={0}
              progressEnd={0.33}
            />
            <SequenceCopy
              eyebrow="02"
              title={t("seq.step2.title", "Books the right slot")}
              body={t("seq.step2.body", "It checks your calendar, suggests times, confirms the booking.")}
              progressStart={0.33}
              progressEnd={0.66}
            />
            <SequenceCopy
              eyebrow="03"
              title={t("seq.step3.title", "Speaks your customer's language")}
              body={t("seq.step3.body", "Fluent English and Arabic, switching on the fly.")}
              progressStart={0.66}
              progressEnd={1}
            />
          </div>

          <div className="relative h-[80vh] w-full">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function SequenceCopy({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
  progressStart: number;
  progressEnd: number;
}) {
  return (
    <div className="max-w-md">
      <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink/50">
        {eyebrow}
      </span>
      <h3 className="mt-3 font-display uppercase text-ink leading-[0.95] text-[clamp(1.75rem,3.2vw,2.75rem)]">
        {title}
      </h3>
      <p className="mt-4 text-ink/70 leading-relaxed">{body}</p>
    </div>
  );
}
